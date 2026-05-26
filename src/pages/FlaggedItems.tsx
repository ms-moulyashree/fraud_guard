import { useState, useRef, useEffect } from "react";
import type { AnalysisRun, FlagDetail } from "../App";

interface FlaggedItemsProps {
  analyses: AnalysisRun[];
}

interface ExtendedFlag extends FlagDetail {
  procedure: string;
  field: string;
  flaggedValue: string;
  detection: string;
  auditorAction: string;
}

const STATIC_FLAGS: ExtendedFlag[] = [
  {
    rowId: "ROW-4521", invoiceNo: "INV-2024-8821", vendorId: "VND-0091",
    amount: "₹4,25,000", date: "2025-01-14",
    reason: "Identical invoice from VEN-445 within 5-day window (ref: INV-2024-08821)",
    riskLevel: "High", documentType: "AP Invoice", status: "Open",
    procedure: "Duplicate Invoice Detection",
    field: "Invoice Amount", flaggedValue: "₹4,25,000",
    detection: "Statistical", auditorAction: "No action",
  },
  {
    rowId: "ROW-4522", invoiceNo: "INV-2024-09131", vendorId: "VND-0091",
    amount: "₹4,25,000", date: "2025-01-10",
    reason: "Same vendor, amount, and GSTIN as INV-2024-09130 posted 3 days earlier",
    riskLevel: "High", documentType: "AP Invoice", status: "Open",
    procedure: "Duplicate Invoice Detection",
    field: "Invoice Number", flaggedValue: "INV-2024-09131",
    detection: "Statistical", auditorAction: "No action",
  },
  {
    rowId: "ROW-1102", invoiceNo: "INV-2024-9203", vendorId: "VND-0057",
    amount: "₹2,80,000", date: "2024-08-15",
    reason: "Journal entry posted on Independence Day (public holiday)",
    riskLevel: "Medium", documentType: "AP Invoice", status: "Open",
    procedure: "Weekend / Holiday Booking",
    field: "Posting Date", flaggedValue: "15 Aug 2024",
    detection: "Time-based", auditorAction: "No action",
  },
  {
    rowId: "ROW-0903", invoiceNo: "INV-2024-9388", vendorId: "VND-0082",
    amount: "₹95,000", date: "2025-01-26",
    reason: "Republic Day — public holiday posting",
    riskLevel: "Medium", documentType: "AP Invoice", status: "Open",
    procedure: "Weekend / Holiday Booking",
    field: "Posting Date", flaggedValue: "26 Jan 2025",
    detection: "Time-based", auditorAction: "No action",
  },
  {
    rowId: "ROW-0512", invoiceNo: "INV-2024-9102", vendorId: "VND-0033",
    amount: "₹1,20,000", date: "2025-01-04",
    reason: "Transaction posted on Saturday",
    riskLevel: "Medium", documentType: "AP Invoice", status: "Open",
    procedure: "Weekend / Holiday Booking",
    field: "Posting Date", flaggedValue: "04 Jan 2025",
    detection: "Time-based", auditorAction: "No action",
  },
  {
    rowId: "ROW-0099", invoiceNo: "INV-2025-0200", vendorId: "VND-0200",
    amount: "₹1,00,00,000", date: "2025-01-31",
    reason: "Clean round number ₹1 Cr transfer — possible estimate or fabricated amount",
    riskLevel: "Medium", documentType: "Bank Transfer", status: "Open",
    procedure: "Round Number Transaction Test",
    field: "Transaction Amount", flaggedValue: "₹1,00,00,000",
    detection: "Statistical", auditorAction: "No action",
  },
  {
    rowId: "ROW-0730", invoiceNo: "INV-2024-8900", vendorId: "VND-0061",
    amount: "₹1,20,000", date: "2024-12-22",
    reason: "GST number format invalid (18 chars expected, got 15)",
    riskLevel: "High", documentType: "AP Invoice", status: "Open",
    procedure: "GST / PAN Validation",
    field: "GSTIN", flaggedValue: "29ABCDE123F1Z",
    detection: "Rule-based", auditorAction: "No action",
  },
  {
    rowId: "ROW-1093", invoiceNo: "INV-2025-0012", vendorId: "VND-0147",
    amount: "₹87,500", date: "2025-02-03",
    reason: "Leading digit '9' appears more than expected per Benford's Law",
    riskLevel: "Low", documentType: "AP Invoice", status: "Open",
    procedure: "Benford's Law First-Digit Test",
    field: "Transaction Amount", flaggedValue: "₹87,500",
    detection: "Statistical", auditorAction: "No action",
  },
];

const AUDITOR_OPTIONS = ["No action", "Mark Reviewed", "Escalate", "Dismiss", "Add Note"];

const DETECTION_STYLES: Record<string, string> = {
  "Statistical": "bg-[#EEF4FC] text-[#1A6FB3] border border-[#B3CDE8]",
  "Time-based":  "bg-[#FEF6E8] text-[#C07A14] border border-[#F5D88A]",
  "Rule-based":  "bg-[#EBF5EE] text-[#2D7A45] border border-[#B8DFC4]",
};

const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239B9589'/%3E%3C/svg%3E")`;

function riskBadge(level: string) {
  if (level === "High")   return "text-[#C94040] bg-[#FDF0F0] border border-[#F0C0C0]";
  if (level === "Medium") return "text-[#C07A14] bg-[#FEF6E8] border border-[#F5D88A]";
  return "text-[#2D7A45] bg-[#EBF5EE] border border-[#B8DFC4]";
}

function flaggedValueColor(level: string) {
  if (level === "High")   return "text-[#C94040]";
  if (level === "Medium") return "text-[#C07A14]";
  return "text-[#1A6FB3]";
}

// ── Custom dropdown for Auditor Action ──────────────────────────────────────
function AuditorDropdown({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative" onClick={(e) => e.stopPropagation()}>
      {/* Trigger */}
      <button
        onClick={() => setOpen((p) => !p)}
        className="flex items-center justify-between gap-2 border border-[#DEDAD3] rounded-lg px-3 py-1.5 text-[12px] text-[#3A3830] bg-white hover:border-[#C4B9A8] focus:outline-none w-[140px] transition-colors"
      >
        <span className="truncate">{value}</span>
        <svg
          width="10" height="6" viewBox="0 0 10 6" fill="none"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M0 0l5 6 5-6z" fill="#9B9589" />
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-[calc(100%+4px)] w-[180px] bg-white border border-[#DEDAD3] rounded-xl shadow-[0_4px_16px_rgba(0,0,0,0.10)] z-50 py-1 overflow-hidden">
          {AUDITOR_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-[#1A1916] hover:bg-[#F7F5F0] transition-colors text-left"
            >
              <span>{opt}</span>
              {value === opt && (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1A6FB3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function FlaggedItems({ analyses }: FlaggedItemsProps) {
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [localFlags, setLocalFlags] = useState<ExtendedFlag[]>(STATIC_FLAGS);
  const [filters, setFilters] = useState({ f1: "All", f2: "All", f3: "All", f4: "All" });

  // Merge live-analysis flags
  const liveFlags: ExtendedFlag[] = [];
  analyses.forEach((run) => {
    run.procedures.forEach((proc) => {
      proc.details?.forEach((d) => {
        if (!STATIC_FLAGS.find((f) => f.rowId === d.rowId)) {
          liveFlags.push({
            ...d, procedure: proc.name, field: "—",
            flaggedValue: d.amount, detection: "Statistical", auditorAction: "No action",
          });
        }
      });
    });
  });

  const allFlags = [...liveFlags, ...localFlags];

  const toggleRow = (rowId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      next.has(rowId) ? next.delete(rowId) : next.add(rowId);
      return next;
    });
  };

  const toggleAll = () => {
    const allSel = allFlags.every((f) => selectedRows.has(f.rowId));
    setSelectedRows(allSel ? new Set() : new Set(allFlags.map((f) => f.rowId)));
  };

  const updateAuditorAction = (rowId: string, action: string) => {
    setLocalFlags((prev) => prev.map((f) => f.rowId === rowId ? { ...f, auditorAction: action } : f));
  };

  const markAllReviewed = () => {
    setLocalFlags((prev) =>
      prev.map((f) => selectedRows.has(f.rowId) ? { ...f, auditorAction: "Mark Reviewed", status: "Reviewed" } : f)
    );
    setSelectedRows(new Set());
  };

  const addToWorkpaper = () => {
    setLocalFlags((prev) =>
      prev.map((f) => selectedRows.has(f.rowId) ? { ...f, status: "In Workpaper" } : f)
    );
    setSelectedRows(new Set());
  };

  const clearSelection = () => setSelectedRows(new Set());

  const allSelected = allFlags.length > 0 && allFlags.every((f) => selectedRows.has(f.rowId));

  const procedures    = ["All", ...Array.from(new Set(allFlags.map((f) => f.procedure)))];
  const riskLevels    = ["All", "High", "Medium", "Low"];
  const detectionList = ["All", ...Array.from(new Set(allFlags.map((f) => f.detection)))];
  const statusList    = ["All", "Open", "Reviewed", "In Workpaper"];

  const selectStyle: React.CSSProperties = {
    backgroundImage: CHEVRON_SVG,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 8px center",
  };

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-white">

      {/* Page header */}
      <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-[#ECEAE5] shrink-0">
        <div>
          <h1 className="text-[17px] font-semibold text-[#1A1916]">Flagged items</h1>
          <p className="text-[12px] text-[#9B9589] mt-0.5">
            AP_Transactions_FY2025.xlsx · {allFlags.length} flags across all procedures
          </p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#DEDAD3] bg-white text-[13px] font-medium text-[#3A3830] hover:bg-[#F7F5F0] transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Export to Excel
        </button>
      </div>

      {/* Filter bar */}
      <div className="px-6 py-3 flex items-center gap-2 border-b border-[#ECEAE5] shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 text-[12px] text-[#9B9589]">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          Filter:
        </div>
        {[
          { key: "f1", opts: riskLevels },
          { key: "f2", opts: procedures },
          { key: "f3", opts: detectionList },
          { key: "f4", opts: statusList },
        ].map(({ key, opts }) => (
          <select
            key={key}
            value={filters[key as keyof typeof filters]}
            onChange={(e) => setFilters((p) => ({ ...p, [key]: e.target.value }))}
            className="appearance-none border border-[#DEDAD3] rounded-lg px-3 py-1.5 pr-7 text-[12px] text-[#3A3830] bg-white cursor-pointer hover:border-[#C4B9A8] focus:outline-none focus:border-[#3A3830]"
            style={selectStyle}
          >
            {opts.map((o) => <option key={o}>{o}</option>)}
          </select>
        ))}
        <span className="ml-auto text-[12px] text-[#9B9589]">{allFlags.length} items</span>
      </div>

      {/* Selection action bar — visible only when rows are selected */}
      {selectedRows.size > 0 && (
        <div className="px-6 py-2.5 flex items-center gap-4 bg-[#F7F5F0] border-b border-[#ECEAE5] shrink-0">
          <span className="text-[13px] font-semibold text-[#1A1916]">
            {selectedRows.size} selected
          </span>

          {/* Mark all reviewed */}
          <button
            onClick={markAllReviewed}
            className="flex items-center gap-1.5 text-[12px] text-[#3A3830] hover:text-[#1A1916] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
            </svg>
            Mark all reviewed
          </button>

          <span className="text-[#DEDAD3]">|</span>

          {/* Export selection */}
          <button className="flex items-center gap-1.5 text-[12px] text-[#3A3830] hover:text-[#1A1916] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export selection
          </button>

          <span className="text-[#DEDAD3]">|</span>

          {/* Add to workpaper */}
          <button
            onClick={addToWorkpaper}
            className="flex items-center gap-1.5 text-[12px] text-[#3A3830] hover:text-[#1A1916] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            Add to workpaper
          </button>

          <span className="text-[#DEDAD3]">|</span>

          {/* Clear selection */}
          <button
            onClick={clearSelection}
            className="flex items-center gap-1.5 text-[12px] text-[#9B9589] hover:text-[#3A3830] transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/>
            </svg>
            Clear selection
          </button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-white border-b border-[#ECEAE5] z-10">
            <tr>
              <th className="w-10 px-5 py-3">
                <div
                  onClick={toggleAll}
                  className={`w-[15px] h-[15px] rounded border cursor-pointer flex items-center justify-center transition-all ${
                    allSelected ? "bg-[#1A1916] border-[#1A1916]" : "border-[#CCCAC4]"
                  }`}
                >
                  {allSelected && <span className="text-white text-[9px] leading-none">✓</span>}
                </div>
              </th>
              {["Row ID", "Procedure", "Field", "Flagged Value", "Reason", "Risk", "Detection", "Auditor Action"].map((h) => (
                <th key={h} className="text-left px-3 py-3 text-[11px] font-semibold text-[#9B9589] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {allFlags.map((flag) => (
              <tr
                key={flag.rowId}
                onClick={() => toggleRow(flag.rowId)}
                className={`border-b border-[#F2EFE9] last:border-0 cursor-pointer transition-colors ${
                  selectedRows.has(flag.rowId) ? "bg-[#F0F4FF]" : "hover:bg-[#FAFAF8]"
                }`}
              >
                {/* Checkbox */}
                <td className="px-5 py-4">
                  <div
                    className={`w-[15px] h-[15px] rounded border flex items-center justify-center transition-all ${
                      selectedRows.has(flag.rowId)
                        ? "bg-[#1A6FB3] border-[#1A6FB3]"
                        : "border-[#CCCAC4]"
                    }`}
                  >
                    {selectedRows.has(flag.rowId) && (
                      <span className="text-white text-[9px] leading-none">✓</span>
                    )}
                  </div>
                </td>

                {/* Row ID */}
                <td className="px-3 py-4">
                  <span className="text-[12px] text-[#6B6560]">{flag.rowId}</span>
                </td>

                {/* Procedure */}
                <td className="px-3 py-4">
                  <span className="text-[13px] font-semibold text-[#1A1916]">{flag.procedure}</span>
                </td>

                {/* Field */}
                <td className="px-3 py-4">
                  <span className="text-[13px] text-[#6B6560]">{flag.field}</span>
                </td>

                {/* Flagged Value */}
                <td className="px-3 py-4">
                  <span className={`text-[13px] font-semibold ${flaggedValueColor(flag.riskLevel)}`}>
                    {flag.flaggedValue}
                  </span>
                </td>

                {/* Reason */}
                <td className="px-3 py-4 max-w-[220px]">
                  <span className="text-[12px] text-[#6B6560] leading-relaxed">{flag.reason}</span>
                </td>

                {/* Risk badge */}
                <td className="px-3 py-4">
                  <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full ${riskBadge(flag.riskLevel)}`}>
                    {flag.riskLevel}
                  </span>
                </td>

                {/* Detection badge */}
                <td className="px-3 py-4">
                  <span className={`text-[12px] font-medium px-2.5 py-1 rounded-md whitespace-nowrap ${
                    DETECTION_STYLES[flag.detection] ?? "bg-[#F2EFE9] text-[#6B6560] border border-[#E0DBD3]"
                  }`}>
                    {flag.detection}
                  </span>
                </td>

                {/* Auditor Action — custom dropdown */}
                <td className="px-3 py-4">
                  <AuditorDropdown
                    value={flag.auditorAction}
                    onChange={(v) => updateAuditorAction(flag.rowId, v)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}