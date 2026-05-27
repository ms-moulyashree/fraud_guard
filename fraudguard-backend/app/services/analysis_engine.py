"""
app/services/analysis_engine.py
─────────────────────────────────────────────────────────────────────────────
Core fraud detection engine.

Runs each enabled procedure against the uploaded DataFrame and writes
results + flagged items back to the database.

Procedures:
  dup_invoice      Duplicate Invoice Detection
  weekend_booking  Weekend / Holiday Booking
  three_way_match  Three-way Match Exception
  benford          Benford's Law First-Digit Test
  round_number     Round Number Transaction Test
  gst_pan          GST / PAN Validation
  split_payment    Split Payment Detection
  inactive_vendor  Inactive / Blocked Vendor Check
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import asyncio
import json
import re
import uuid
from collections import Counter
from datetime import date, datetime, timezone
from typing import Optional

import pandas as pd

from app.database import get_pool
from app.services.ai_service import generate_ai_summary


# ══════════════════════════════════════════════════════════════════════════════
# Public entry-point
# ══════════════════════════════════════════════════════════════════════════════

async def run_analysis(
    run_id: str,
    procedure_ids: list[str],
    columns: list[str],
    file_name: str,
    dataframe: Optional[pd.DataFrame] = None,
):
    """
    Called as an asyncio background task from the analyses router.
    Uses the shared pool (not the per-request connection) so it can
    outlive the HTTP request.
    """
    pool = get_pool()

    try:
        df = dataframe if dataframe is not None else _synthetic_df(columns, file_name)
        df = _normalise_columns(df)

        # If no procedures specified → run all enabled ones
        if not procedure_ids:
            rows = await pool.fetch(
                "SELECT id FROM procedures WHERE enabled = TRUE"
            )
            procedure_ids = [r["id"] for r in rows]

        all_flags: list[dict] = []
        summary_parts: list[str] = []

        for proc_id in procedure_ids:
            proc = await pool.fetchrow(
                "SELECT id, name, risk FROM procedures WHERE id = $1", proc_id
            )
            if not proc:
                continue

            result_id = uuid.uuid4()
            await pool.execute(
                """INSERT INTO procedure_results
                       (id, run_id, procedure_id, procedure_name, status, risk_level)
                   VALUES ($1,$2,$3,$4,'running',$5)""",
                result_id,
                uuid.UUID(run_id),
                proc["id"],
                proc["name"],
                proc["risk"],
            )

            # Run detector in thread-pool (CPU-bound pandas work)
            try:
                flags: list[dict] = await asyncio.get_event_loop().run_in_executor(
                    None, _run_detector, proc_id, df, proc["name"]
                )
            except Exception:
                await pool.execute(
                    "UPDATE procedure_results SET status='failed' WHERE id=$1",
                    result_id,
                )
                continue

            flag_count = len(flags)
            status     = "flagged" if flag_count > 0 else "passed"

            await pool.execute(
                "UPDATE procedure_results SET status=$1, flag_count=$2 WHERE id=$3",
                status, flag_count, result_id,
            )

            # Insert flagged items
            for f in flags:
                await pool.execute(
                    """INSERT INTO flagged_items
                           (id, run_id, procedure_id, procedure_name, row_id,
                            invoice_no, vendor_id, amount, date, reason,
                            risk_level, document_type, field, flagged_value, detection)
                       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)""",
                    uuid.uuid4(),
                    uuid.UUID(run_id),
                    proc_id,
                    proc["name"],
                    f.get("row_id", ""),
                    f.get("invoice_no"),
                    f.get("vendor_id"),
                    f.get("amount"),
                    f.get("date"),
                    f["reason"],
                    f.get("risk_level", proc["risk"]),
                    f.get("document_type", "AP Invoice"),
                    f.get("field"),
                    f.get("flagged_value"),
                    f.get("detection", "Statistical"),
                )

            if flag_count:
                summary_parts.append(
                    f"{proc['name']}: {flag_count} flag(s) ({proc['risk']} risk)"
                )

            all_flags.extend(flags)
            await asyncio.sleep(0.2)   # let UI see incremental updates

        # Generate AI summary
        ai_summary = await generate_ai_summary(
            file_name, summary_parts, len(all_flags)
        )

        await pool.execute(
            """UPDATE analysis_runs
               SET status='complete', completed_at=$1, ai_summary=$2
               WHERE id=$3""",
            datetime.now(timezone.utc),
            ai_summary,
            uuid.UUID(run_id),
        )

    except Exception as exc:
        await pool.execute(
            "UPDATE analysis_runs SET status='failed' WHERE id=$1",
            uuid.UUID(run_id),
        )
        raise


# ══════════════════════════════════════════════════════════════════════════════
# Detector dispatcher
# ══════════════════════════════════════════════════════════════════════════════

def _run_detector(
    proc_id: str, df: pd.DataFrame, proc_name: str
) -> list[dict]:
    detectors = {
        "dup_invoice":     _detect_duplicates,
        "weekend_booking": _detect_weekend_booking,
        "three_way_match": _detect_three_way_match,
        "benford":         _detect_benford,
        "round_number":    _detect_round_numbers,
        "gst_pan":         _detect_gst_pan,
        "split_payment":   _detect_split_payments,
        "inactive_vendor": _detect_inactive_vendor,
    }
    fn = detectors.get(proc_id)
    return fn(df) if fn else []


# ══════════════════════════════════════════════════════════════════════════════
# Individual detectors
# ══════════════════════════════════════════════════════════════════════════════

def _detect_duplicates(df: pd.DataFrame) -> list[dict]:
    flags = []
    amount_col = _col(df, ["amount","amt","value","invoice_amount","net_amount"])
    vendor_col = _col(df, ["vendor_id","vendor","vendorid","supplier_id"])
    inv_col    = _col(df, ["invoice_no","invoiceno","invoice_number","inv_no"])
    date_col   = _col(df, ["date","posting_date","invoice_date","transaction_date"])

    if not amount_col:
        return []

    subset = [c for c in [vendor_col, amount_col, inv_col] if c]
    if not subset:
        return []

    dups = df[df.duplicated(subset=subset, keep=False)].copy()
    for idx, row in dups.iterrows():
        flags.append({
            "row_id":        f"ROW-{idx:04d}",
            "invoice_no":    str(row.get(inv_col, ""))    if inv_col    else None,
            "vendor_id":     str(row.get(vendor_col, "")) if vendor_col else None,
            "amount":        str(row.get(amount_col, "")),
            "date":          _fmt_date(row.get(date_col)) if date_col   else None,
            "reason":        f"Duplicate entry — same {', '.join(subset)} found multiple times",
            "risk_level":    "High",
            "field":         amount_col,
            "flagged_value": str(row.get(amount_col, "")),
            "detection":     "Statistical",
        })
    return flags[:50]


def _detect_weekend_booking(df: pd.DataFrame) -> list[dict]:
    flags = []
    date_col   = _col(df, ["date","posting_date","invoice_date","transaction_date"])
    amount_col = _col(df, ["amount","amt","value","net_amount"])
    inv_col    = _col(df, ["invoice_no","invoiceno","invoice_number"])
    vendor_col = _col(df, ["vendor_id","vendor","vendorid"])

    if not date_col:
        return []

    indian_holidays = {
        date(2024,1,26), date(2024,8,15), date(2024,10,2),
        date(2024,10,12), date(2024,11,1), date(2024,11,15),
        date(2025,1,26), date(2025,8,15), date(2025,10,2),
    }

    for idx, row in df.iterrows():
        try:
            d = pd.to_datetime(row[date_col])
            if pd.isna(d):
                continue
            dt = d.date()
            is_weekend = d.weekday() >= 5
            is_holiday = dt in indian_holidays
            if not (is_weekend or is_holiday):
                continue
            reason = (
                f"Transaction posted on {'weekend' if is_weekend else 'public holiday'} "
                f"({d.strftime('%d %b %Y')})"
            )
            flags.append({
                "row_id":        f"ROW-{idx:04d}",
                "invoice_no":    str(row.get(inv_col, ""))    if inv_col    else None,
                "vendor_id":     str(row.get(vendor_col, "")) if vendor_col else None,
                "amount":        str(row.get(amount_col, "")) if amount_col else None,
                "date":          d.strftime("%Y-%m-%d"),
                "reason":        reason,
                "risk_level":    "Medium",
                "field":         date_col,
                "flagged_value": d.strftime("%d %b %Y"),
                "detection":     "Time-based",
            })
        except Exception:
            continue
    return flags[:50]


def _detect_three_way_match(df: pd.DataFrame) -> list[dict]:
    flags = []
    po_col     = _col(df, ["po_number","po_no","purchase_order","po"])
    grn_col    = _col(df, ["grn_no","grn","goods_receipt","receipt_no"])
    inv_col    = _col(df, ["invoice_no","invoiceno","invoice_number"])
    amount_col = _col(df, ["amount","amt","value"])
    vendor_col = _col(df, ["vendor_id","vendor","vendorid"])
    date_col   = _col(df, ["date","posting_date","invoice_date"])

    if not po_col and not grn_col:
        if not amount_col:
            return []
        for idx, row in df.iterrows():
            try:
                amt = float(
                    str(row[amount_col]).replace(",","").replace("₹","").strip()
                )
                if amt > 100000:
                    flags.append({
                        "row_id":        f"ROW-{idx:04d}",
                        "invoice_no":    str(row.get(inv_col,""))    if inv_col    else None,
                        "vendor_id":     str(row.get(vendor_col,"")) if vendor_col else None,
                        "amount":        str(row[amount_col]),
                        "date":          _fmt_date(row.get(date_col)) if date_col else None,
                        "reason":        "PO/GRN columns absent — high-value invoice unverifiable",
                        "risk_level":    "High",
                        "field":         "PO Number",
                        "flagged_value": "MISSING",
                        "detection":     "Cross-data",
                    })
            except Exception:
                continue
        return flags[:30]

    for idx, row in df.iterrows():
        missing = []
        if po_col  and str(row.get(po_col,"")).strip()  in ("","nan","None"):
            missing.append("PO")
        if grn_col and str(row.get(grn_col,"")).strip() in ("","nan","None"):
            missing.append("GRN")
        if missing:
            flags.append({
                "row_id":        f"ROW-{idx:04d}",
                "invoice_no":    str(row.get(inv_col,""))    if inv_col    else None,
                "vendor_id":     str(row.get(vendor_col,"")) if vendor_col else None,
                "amount":        str(row.get(amount_col,"")) if amount_col else None,
                "date":          _fmt_date(row.get(date_col)) if date_col else None,
                "reason":        f"Missing {' and '.join(missing)} — three-way match failed",
                "risk_level":    "High",
                "field":         "/".join(missing),
                "flagged_value": "MISSING",
                "detection":     "Cross-data",
            })
    return flags[:50]


def _detect_benford(df: pd.DataFrame) -> list[dict]:
    amount_col = _col(df, ["amount","amt","value","net_amount","invoice_amount"])
    inv_col    = _col(df, ["invoice_no","invoiceno"])
    vendor_col = _col(df, ["vendor_id","vendor"])

    if not amount_col or len(df) < 20:
        return []

    expected = {1:0.301,2:0.176,3:0.125,4:0.097,
                5:0.079,6:0.067,7:0.058,8:0.051,9:0.046}

    first_digits: list[int] = []
    row_map: dict[int,int]  = {}

    for idx, row in df.iterrows():
        try:
            val = float(str(row[amount_col]).replace(",","").replace("₹","").strip())
            if val <= 0:
                continue
            d = int(str(abs(val)).lstrip("0.").replace(".","")[0])
            if 1 <= d <= 9:
                first_digits.append(d)
                row_map[d] = idx
        except Exception:
            continue

    if not first_digits:
        return []

    n      = len(first_digits)
    counts = Counter(first_digits)
    flags  = []

    for digit in range(1, 10):
        observed  = counts.get(digit, 0) / n
        exp       = expected[digit]
        deviation = abs(observed - exp) / exp
        if deviation > 0.15:
            idx = row_map.get(digit, 0)
            row = df.iloc[min(idx, len(df)-1)]
            flags.append({
                "row_id":        f"BEN-{digit:02d}",
                "invoice_no":    str(row.get(inv_col,""))    if inv_col    else None,
                "vendor_id":     str(row.get(vendor_col,"")) if vendor_col else None,
                "amount":        str(row.get(amount_col,"")),
                "date":          None,
                "reason":        (
                    f"First digit '{digit}' appears {observed:.1%} vs expected "
                    f"{exp:.1%} ({deviation:.0%} deviation) — possible fabrication"
                ),
                "risk_level":    "Medium",
                "field":         amount_col,
                "flagged_value": str(digit),
                "detection":     "Statistical",
            })
    return flags


def _detect_round_numbers(df: pd.DataFrame) -> list[dict]:
    flags = []
    amount_col = _col(df, ["amount","amt","value","net_amount"])
    inv_col    = _col(df, ["invoice_no","invoiceno"])
    vendor_col = _col(df, ["vendor_id","vendor"])
    date_col   = _col(df, ["date","posting_date","invoice_date"])

    if not amount_col:
        return []

    for idx, row in df.iterrows():
        try:
            val = float(
                str(row[amount_col]).replace(",","").replace("₹","").strip()
            )
            if val >= 50000 and val % 10000 == 0:
                flags.append({
                    "row_id":        f"ROW-{idx:04d}",
                    "invoice_no":    str(row.get(inv_col,""))    if inv_col    else None,
                    "vendor_id":     str(row.get(vendor_col,"")) if vendor_col else None,
                    "amount":        str(row[amount_col]),
                    "date":          _fmt_date(row.get(date_col)) if date_col else None,
                    "reason":        f"Suspiciously round amount (₹{val:,.0f}) — possible estimate or fabrication",
                    "risk_level":    "Medium",
                    "field":         amount_col,
                    "flagged_value": str(row[amount_col]),
                    "detection":     "Statistical",
                })
        except Exception:
            continue
    return flags[:40]


def _detect_gst_pan(df: pd.DataFrame) -> list[dict]:
    flags = []
    gst_col    = _col(df, ["gstin","gst_no","gst_number","gst","gstn"])
    pan_col    = _col(df, ["pan","pan_no","pan_number"])
    inv_col    = _col(df, ["invoice_no","invoiceno"])
    vendor_col = _col(df, ["vendor_id","vendor"])

    gst_re = re.compile(r"^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$")
    pan_re = re.compile(r"^[A-Z]{5}[0-9]{4}[A-Z]$")

    SKIP = {"", "NAN", "NONE", "N/A", "NA"}

    for idx, row in df.iterrows():
        if gst_col:
            gst = str(row.get(gst_col,"")).strip().upper()
            if gst and gst not in SKIP and not gst_re.match(gst):
                flags.append({
                    "row_id":        f"ROW-{idx:04d}",
                    "invoice_no":    str(row.get(inv_col,""))    if inv_col    else None,
                    "vendor_id":     str(row.get(vendor_col,"")) if vendor_col else None,
                    "amount":        None,
                    "date":          None,
                    "reason":        f"Invalid GST format: '{gst}' does not match 15-character GSTIN pattern",
                    "risk_level":    "High",
                    "field":         gst_col,
                    "flagged_value": gst,
                    "detection":     "Cross-data",
                })
        if pan_col:
            pan = str(row.get(pan_col,"")).strip().upper()
            if pan and pan not in SKIP and not pan_re.match(pan):
                flags.append({
                    "row_id":        f"ROW-{idx:04d}",
                    "invoice_no":    str(row.get(inv_col,""))    if inv_col    else None,
                    "vendor_id":     str(row.get(vendor_col,"")) if vendor_col else None,
                    "amount":        None,
                    "date":          None,
                    "reason":        f"Invalid PAN format: '{pan}' does not match AAAAA9999A pattern",
                    "risk_level":    "High",
                    "field":         pan_col,
                    "flagged_value": pan,
                    "detection":     "Cross-data",
                })
    return flags[:50]


def _detect_split_payments(df: pd.DataFrame) -> list[dict]:
    flags = []
    amount_col = _col(df, ["amount","amt","value","net_amount"])
    vendor_col = _col(df, ["vendor_id","vendor","vendorid"])
    date_col   = _col(df, ["date","posting_date","invoice_date"])
    inv_col    = _col(df, ["invoice_no","invoiceno"])

    if not (amount_col and vendor_col and date_col):
        return []

    df2 = df[[c for c in [amount_col, vendor_col, date_col, inv_col] if c]].copy()
    df2["_amt"] = pd.to_numeric(
        df2[amount_col].astype(str).str.replace(",","").str.replace("₹",""),
        errors="coerce",
    )
    df2["_dt"] = pd.to_datetime(df2[date_col], errors="coerce")
    df2 = df2.dropna(subset=["_amt","_dt"])

    THRESHOLD = 100_000

    for vendor, grp in df2.groupby(vendor_col):
        grp = grp.sort_values("_dt").reset_index()
        for i in range(len(grp)):
            window = grp[
                (grp["_dt"] >= grp.loc[i,"_dt"]) &
                (grp["_dt"] <= grp.loc[i,"_dt"] + pd.Timedelta(days=5))
            ]
            if len(window) > 1 and window["_amt"].sum() > THRESHOLD:
                for _, wrow in window.iterrows():
                    orig_idx = wrow.get("index", 0)
                    flags.append({
                        "row_id":        f"ROW-{orig_idx:04d}",
                        "invoice_no":    str(wrow.get(inv_col,"")) if inv_col else None,
                        "vendor_id":     str(vendor),
                        "amount":        str(wrow[amount_col]),
                        "date":          wrow["_dt"].strftime("%Y-%m-%d"),
                        "reason":        (
                            f"Possible split payment — {len(window)} transactions to "
                            f"vendor '{vendor}' within 5 days totalling "
                            f"₹{window['_amt'].sum():,.0f}"
                        ),
                        "risk_level":    "High",
                        "field":         amount_col,
                        "flagged_value": str(wrow[amount_col]),
                        "detection":     "Cross-data",
                    })
                break
    return flags[:40]


def _detect_inactive_vendor(df: pd.DataFrame) -> list[dict]:
    flags = []
    status_col = _col(df, ["status","vendor_status","active","is_active","blocked"])
    vendor_col = _col(df, ["vendor_id","vendor","vendorid"])
    inv_col    = _col(df, ["invoice_no","invoiceno"])
    amount_col = _col(df, ["amount","amt","value"])
    date_col   = _col(df, ["date","posting_date"])

    INACTIVE = {"inactive","blocked","disabled","closed","suspended","0","false","no"}

    if not status_col:
        return []

    for idx, row in df.iterrows():
        val = str(row.get(status_col,"")).strip().lower()
        if val in INACTIVE:
            flags.append({
                "row_id":        f"ROW-{idx:04d}",
                "invoice_no":    str(row.get(inv_col,""))    if inv_col    else None,
                "vendor_id":     str(row.get(vendor_col,"")) if vendor_col else None,
                "amount":        str(row.get(amount_col,"")) if amount_col else None,
                "date":          _fmt_date(row.get(date_col)) if date_col  else None,
                "reason":        f"Payment to vendor with status '{val}' — vendor is inactive or blocked",
                "risk_level":    "High",
                "field":         status_col,
                "flagged_value": val,
                "detection":     "Flag",
            })
    return flags[:40]


# ══════════════════════════════════════════════════════════════════════════════
# Utilities
# ══════════════════════════════════════════════════════════════════════════════

def _col(df: pd.DataFrame, candidates: list[str]) -> Optional[str]:
    """Case-insensitive column name lookup."""
    lower_map = {c.lower().replace(" ","_"): c for c in df.columns}
    for c in candidates:
        if c in lower_map:
            return lower_map[c]
    return None


def _normalise_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [c.strip().lower().replace(" ","_") for c in df.columns]
    return df


def _fmt_date(val) -> Optional[str]:
    try:
        return pd.to_datetime(val).strftime("%Y-%m-%d")
    except Exception:
        return str(val) if val else None


def _synthetic_df(columns: list[str], file_name: str) -> pd.DataFrame:
    """Generate demo data when no real file was uploaded."""
    import random
    n = 200
    data: dict = {}

    amt_col = next((c for c in columns if any(k in c.lower() for k in ["amount","amt","value"])), None) or "amount"
    vnd_col = next((c for c in columns if "vendor" in c.lower()), None) or "vendor_id"
    inv_col = next((c for c in columns if "invoice" in c.lower()), None) or "invoice_no"
    dt_col  = next((c for c in columns if "date" in c.lower()), None) or "date"

    amounts = [
        round(random.choice([50000,100000,250000,500000,1000000])
              if random.random() < 0.15
              else random.uniform(5000, 900000), 2)
        for _ in range(n)
    ]
    amounts[10] = amounts[5]   # inject duplicate

    vendors  = [f"VND-{random.randint(1,30):04d}" for _ in range(n)]
    vendors[10] = vendors[5]

    invoices = [f"INV-2024-{i+1000:05d}" for i in range(n)]
    invoices[10] = invoices[5]

    base  = pd.Timestamp("2024-01-01")
    dates = [base + pd.Timedelta(days=random.randint(0, 365)) for _ in range(n)]
    dates[20] = pd.Timestamp("2024-08-15")  # holiday
    dates[21] = pd.Timestamp("2024-01-06")  # Saturday

    data[amt_col] = amounts
    data[vnd_col] = vendors
    data[inv_col] = invoices
    data[dt_col]  = [d.strftime("%Y-%m-%d") for d in dates]

    for col in columns:
        if col not in data:
            data[col] = [f"val_{i}" for i in range(n)]

    return pd.DataFrame(data)