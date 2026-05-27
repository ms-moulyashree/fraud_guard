"""
app/routers/flags.py
─────────────────────────────────────────────────────────────────────────────
Flagged items endpoints:
  GET   /api/v1/flags           → list flags (filter by run/risk/status/engagement)
  GET   /api/v1/flags/{id}      → get single flag
  PATCH /api/v1/flags/{id}      → update status or auditor_action
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations
import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException

from app.database import get_db
from app.models.schemas import FlagOut, UpdateFlagRequest, UserOut
from app.routers.auth import get_current_user

router = APIRouter(prefix="/flags", tags=["flags"])


# ── Helper: record → schema ───────────────────────────────────────────────────

def _to_flag_out(r: asyncpg.Record) -> FlagOut:
    return FlagOut(
        id=str(r["id"]),
        run_id=str(r["run_id"]),
        procedure_id=r["procedure_id"],
        procedure_name=r["procedure_name"],
        row_id=r["row_id"],
        invoice_no=r["invoice_no"],
        vendor_id=r["vendor_id"],
        amount=r["amount"],
        date=r["date"],
        reason=r["reason"],
        risk_level=r["risk_level"],
        document_type=r["document_type"],
        field=r["field"],
        flagged_value=r["flagged_value"],
        detection=r["detection"],
        status=r["status"],
        auditor_action=r["auditor_action"],
    )


# ── List ──────────────────────────────────────────────────────────────────────

@router.get("", response_model=list[FlagOut])
async def list_flags(
    run_id: Optional[str] = None,
    risk_level: Optional[str] = None,
    status: Optional[str] = None,
    engagement_id: Optional[str] = None,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    # Build WHERE clause dynamically
    conditions: list[str] = []
    params: list = []
    p = 1

    if run_id:
        conditions.append(f"f.run_id = ${p}::uuid")
        params.append(run_id)
        p += 1

    if risk_level:
        conditions.append(f"f.risk_level = ${p}")
        params.append(risk_level)
        p += 1

    if status:
        conditions.append(f"f.status = ${p}")
        params.append(status)
        p += 1

    if engagement_id:
        conditions.append(f"r.engagement_id = ${p}::uuid")
        params.append(engagement_id)
        p += 1

    where = ("WHERE " + " AND ".join(conditions)) if conditions else ""

    rows = await db.fetch(
        f"""SELECT f.id, f.run_id, f.procedure_id, f.procedure_name,
                   f.row_id, f.invoice_no, f.vendor_id, f.amount, f.date,
                   f.reason, f.risk_level, f.document_type, f.field,
                   f.flagged_value, f.detection, f.status, f.auditor_action
            FROM flagged_items f
            JOIN analysis_runs r ON r.id = f.run_id
            {where}
            ORDER BY
                CASE f.risk_level
                    WHEN 'High'   THEN 1
                    WHEN 'Medium' THEN 2
                    WHEN 'Low'    THEN 3
                    ELSE 4
                END,
                f.created_at DESC""",
        *params,
    )

    return [_to_flag_out(r) for r in rows]


# ── Get single ────────────────────────────────────────────────────────────────

@router.get("/{flag_id}", response_model=FlagOut)
async def get_flag(
    flag_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        """SELECT id, run_id, procedure_id, procedure_name,
                  row_id, invoice_no, vendor_id, amount, date,
                  reason, risk_level, document_type, field,
                  flagged_value, detection, status, auditor_action
           FROM flagged_items
           WHERE id = $1""",
        uuid.UUID(flag_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Flag not found")

    return _to_flag_out(row)


# ── Update ────────────────────────────────────────────────────────────────────

@router.patch("/{flag_id}", response_model=FlagOut)
async def update_flag(
    flag_id: str,
    body: UpdateFlagRequest,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    # Validate status value if provided
    valid_statuses = {"Open", "Reviewed", "In Workpaper"}
    if body.status and body.status not in valid_statuses:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'. Must be one of: {', '.join(valid_statuses)}",
        )

    # Build SET clause dynamically
    updates: list[str] = []
    params: list = []
    p = 1

    if body.status is not None:
        updates.append(f"status = ${p}")
        params.append(body.status)
        p += 1

    if body.auditor_action is not None:
        updates.append(f"auditor_action = ${p}")
        params.append(body.auditor_action)
        p += 1

    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")

    params.append(uuid.UUID(flag_id))

    row = await db.fetchrow(
        f"""UPDATE flagged_items
            SET {', '.join(updates)}
            WHERE id = ${p}
            RETURNING id, run_id, procedure_id, procedure_name,
                      row_id, invoice_no, vendor_id, amount, date,
                      reason, risk_level, document_type, field,
                      flagged_value, detection, status, auditor_action""",
        *params,
    )

    if not row:
        raise HTTPException(status_code=404, detail="Flag not found")

    return _to_flag_out(row)


# ── Bulk update ───────────────────────────────────────────────────────────────

@router.patch("", response_model=list[FlagOut])
async def bulk_update_flags(
    flag_ids: list[str],
    body: UpdateFlagRequest,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """Update status / auditor_action on multiple flags at once."""
    if not flag_ids:
        raise HTTPException(status_code=422, detail="No flag IDs provided")

    valid_statuses = {"Open", "Reviewed", "In Workpaper"}
    if body.status and body.status not in valid_statuses:
        raise HTTPException(
            status_code=422,
            detail=f"Invalid status '{body.status}'",
        )

    updates: list[str] = []
    params: list = []
    p = 1

    if body.status is not None:
        updates.append(f"status = ${p}")
        params.append(body.status)
        p += 1

    if body.auditor_action is not None:
        updates.append(f"auditor_action = ${p}")
        params.append(body.auditor_action)
        p += 1

    if not updates:
        raise HTTPException(status_code=422, detail="Nothing to update")

    # Convert string IDs to UUIDs
    uid_list = [uuid.UUID(fid) for fid in flag_ids]
    params.append(uid_list)

    rows = await db.fetch(
        f"""UPDATE flagged_items
            SET {', '.join(updates)}
            WHERE id = ANY(${p})
            RETURNING id, run_id, procedure_id, procedure_name,
                      row_id, invoice_no, vendor_id, amount, date,
                      reason, risk_level, document_type, field,
                      flagged_value, detection, status, auditor_action""",
        *params,
    )

    return [_to_flag_out(r) for r in rows]