import { useState, useRef, useEffect } from "react";

import {
  api,
  apiFlagToDetail,
  type ApiFlag,
  AuthError,
} from "../services/apiService";

import type { AnalysisRun, FlagDetail } from "../App";

interface FlaggedItemsProps {
  analyses: AnalysisRun[];
}

interface ExtendedFlag extends FlagDetail {
  id: string;
  procedure: string;
  field: string;
  flaggedValue: string;
  detection: string;
  auditorAction: string;
}

const AUDITOR_OPTIONS = [
  "Unreviewed",
  "No action",
  "Mark Reviewed",
  "Escalate",
  "Dismiss",
];

const DETECTION_STYLES: Record<string, string> = {
  Statistical:
    "bg-[#EEF4FC] text-[#1A6FB3] border border-[#B3CDE8]",
  "Time-based":
    "bg-[#FEF6E8] text-[#C07A14] border border-[#F5D88A]",
  "Rule-based":
    "bg-[#EBF5EE] text-[#2D7A45] border border-[#B8DFC4]",
  "AI-assisted":
    "bg-[#F3EEFF] text-[#6B21A8] border border-[#D8B4FE]",
  "Cross-data":
    "bg-[#E8F4FD] text-[#0369A1] border border-[#7DD3FC]",
};

const CHEVRON_SVG = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%239B9589'/%3E%3C/svg%3E")`;

function riskBadge(level: string) {
  if (level === "High") return "text-[#C94040] bg-[#FDF0F0] border border-[#F0C0C0]";
  if (level === "Medium") return "text-[#C07A14] bg-[#FEF6E8] border border-[#F5D88A]";
  return "text-[#2D7A45] bg-[#EBF5EE] border border-[#B8DFC4]";
}

function flaggedValueColor(level: string) {
  if (level === "High") return "text-[#C94040]";
  if (level === "Medium") return "text-[#C07A14]";
  return "text-[#1A6FB3]";
}

export default function FlaggedItems({ analyses }: FlaggedItemsProps) {
  const [flags, setFlags] = useState<ExtendedFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterRisk, setFilterRisk] = useState("All");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterAnalysis, setFilterAnalysis] = useState("All");
  const [sortField, setSortField] = useState<"amount" | "date" | "riskLevel">("riskLevel");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // ── Load flags from backend ────────────────────────────────────────────────
useEffect(() => {
  let cancelled = false;

  async function loadFlags() {
    setLoading(true);
    setError(null);

    try {
      // Filter by the most recent completed analysis so we only show
      // flags from the uploaded dataset, not leftover demo data
      const latestRunId = analyses
        .filter((a) => a.status === "complete")
        .map((a) => a.id)[0];

      const raw: ApiFlag[] = await api.flags.list(
        latestRunId ? { run_id: latestRunId } : undefined
      );

      if (!cancelled) {
        setFlags(raw.map(apiFlagToDetail) as ExtendedFlag[]);
      }
    } catch (err: any) {
      // Ignore auth errors because app will redirect automatically
      if (err instanceof AuthError) {
        return;
      }

      if (!cancelled) {
        setError(err.message ?? "Failed to load flags");
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  loadFlags();

  return () => {
    cancelled = true;
  };
}, [analyses]);
  // ── Auditor action update ──────────────────────────────────────────────────
  async function handleAuditorAction(flagId: string, action: string) {
    setUpdatingId(flagId);
    try {
      const updated = await api.flags.update(flagId, { auditor_action: action });
      setFlags((prev) =>
  prev.map((f) =>
    f.id === flagId ? { ...f, auditorAction: updated.auditor_action ?? action } : f
  )
);
    } catch (err: any) {
      alert("Failed to update flag: " + (err.message ?? "unknown error"));
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Status update ──────────────────────────────────────────────────────────
  async function handleStatusChange(flagId: string, status: string) {
    setUpdatingId(flagId);
    try {
      const updated = await api.flags.update(flagId, { status });
      setFlags((prev) =>
        prev.map((f) =>
          f.id === flagId
            ? { ...f, status: updated.status as FlagDetail["status"] }
            : f
        )
      );
    } catch (err: any) {
      alert("Failed to update flag status: " + (err.message ?? "unknown error"));
    } finally {
      setUpdatingId(null);
    }
  }

  // ── Filter & sort ──────────────────────────────────────────────────────────
  const analysisIds = ["All", ...Array.from(new Set(analyses.map((a) => a.id)))];

  const filtered = flags
    .filter((f) => filterRisk === "All" || f.riskLevel === filterRisk)
    .filter((f) => filterStatus === "All" || f.status === filterStatus)
    .filter((f) => {
      if (filterAnalysis === "All") return true;
      // Match by analysis run fileName
      const ana = analyses.find((a) => a.id === filterAnalysis);
      return ana ? f.procedure !== "" : true;
    })
    .sort((a, b) => {
      let va: string | number = a[sortField] ?? "";
      let vb: string | number = b[sortField] ?? "";
      if (sortField === "amount") {
        va = parseFloat(String(va).replace(/[^0-9.-]/g, "")) || 0;
        vb = parseFloat(String(vb).replace(/[^0-9.-]/g, "")) || 0;
      }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

  const highCount = filtered.filter((f) => f.riskLevel === "High").length;
  const medCount = filtered.filter((f) => f.riskLevel === "Medium").length;
  const openCount = filtered.filter((f) => f.status === "Open").length;

  function toggleSort(field: typeof sortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  // ── Loading / Error states ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
        <div className="text-center">
          <svg className="animate-spin w-8 h-8 text-blue-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <p className="text-sm text-gray-500">Loading flagged items…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F7F5]">
        <div className="text-center max-w-sm">
          <p className="text-red-600 font-medium mb-2">Failed to load flags</p>
          <p className="text-sm text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-[#F7F7F5]"
      style={{ fontFamily: "'Inter', 'DM Sans', system-ui, sans-serif" }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-6">

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-[22px] font-semibold text-[#1A1A2E] tracking-tight">
              Flagged Items
            </h1>
            <p className="text-[13px] text-[#6B6B6B] mt-0.5">
              {filtered.length} items · {highCount} High · {medCount} Medium · {openCount} Open
            </p>
          </div>
        </div>

        {/* Summary pills */}
        <div className="flex gap-3 mb-5 flex-wrap">
          {[
            { label: "All Items", value: flags.length, active: filterRisk === "All" && filterStatus === "All", onClick: () => { setFilterRisk("All"); setFilterStatus("All"); } },
            { label: "High Risk", value: flags.filter((f) => f.riskLevel === "High").length, active: filterRisk === "High", onClick: () => setFilterRisk("High"), color: "text-[#C94040]" },
            { label: "Open", value: flags.filter((f) => f.status === "Open").length, active: filterStatus === "Open", onClick: () => setFilterStatus("Open"), color: "text-[#C07A14]" },
            { label: "Reviewed", value: flags.filter((f) => f.status === "Reviewed").length, active: filterStatus === "Reviewed", onClick: () => setFilterStatus("Reviewed"), color: "text-[#2D7A45]" },
          ].map((pill) => (
            <button
              key={pill.label}
              onClick={pill.onClick}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[12px] font-medium border transition-all ${
                pill.active
                  ? "bg-[#1A1A2E] text-white border-[#1A1A2E]"
                  : "bg-white text-[#4B4B4B] border-[#E0DDD8] hover:border-[#B8B4AC]"
              }`}
            >
              <span>{pill.label}</span>
              <span className={`font-semibold ${pill.active ? "text-white" : (pill.color ?? "text-[#1A1A2E]")}`}>
                {pill.value}
              </span>
            </button>
          ))}
        </div>

        {/* Filters row */}
        <div className="flex gap-3 mb-5 flex-wrap" ref={dropdownRef}>
          {[
            {
              label: "Risk",
              value: filterRisk,
              options: ["All", "High", "Medium", "Low"],
              onChange: setFilterRisk,
            },
            {
              label: "Status",
              value: filterStatus,
              options: ["All", "Open", "Reviewed", "In Workpaper"],
              onChange: setFilterStatus,
            },
          ].map((f) => (
            <div key={f.label} className="flex items-center gap-2">
              <span className="text-[12px] text-[#9B9589] font-medium">{f.label}</span>
              <div className="relative">
                <select
                  value={f.value}
                  onChange={(e) => f.onChange(e.target.value)}
                  className="appearance-none bg-white border border-[#E0DDD8] rounded-lg pl-3 pr-8 py-1.5 text-[12px] text-[#1A1A2E] font-medium cursor-pointer focus:outline-none focus:border-[#6d7dfc]"
                  style={{ backgroundImage: CHEVRON_SVG, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                >
                  {f.options.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>
            </div>
          ))}

          {/* Sort */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-[12px] text-[#9B9589] font-medium">Sort</span>
            {(["riskLevel", "amount", "date"] as const).map((f) => (
              <button
                key={f}
                onClick={() => toggleSort(f)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition-all ${
                  sortField === f
                    ? "bg-[#1A1A2E] text-white border-[#1A1A2E]"
                    : "bg-white text-[#4B4B4B] border-[#E0DDD8] hover:border-[#B8B4AC]"
                }`}
              >
                {f === "riskLevel" ? "Risk" : f === "amount" ? "Amount" : "Date"}
                {sortField === f && (sortDir === "asc" ? " ↑" : " ↓")}
              </button>
            ))}
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 && (
          <div className="text-center py-16 bg-white rounded-2xl border border-[#E8E4DE]">
            <p className="text-[#9B9589] text-sm">No flagged items match your filters.</p>
          </div>
        )}

        {/* Flag cards */}
        <div className="space-y-2">
          {filtered.map((flag) => {
            const expanded = expandedId === flag.id;
            return (
              <div
                key={flag.id}
                className="bg-white rounded-2xl border border-[#E8E4DE] overflow-hidden transition-shadow hover:shadow-sm"
              >
                {/* Card header */}
                <button
                  className="w-full px-5 py-4 flex items-center gap-4 text-left"
                  onClick={() => setExpandedId(expanded ? null : flag.id)}
                >
                  {/* Risk badge */}
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${riskBadge(flag.riskLevel)} shrink-0`}>
                    {flag.riskLevel}
                  </span>

                  {/* Invoice / row */}
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[#1A1A2E] truncate">
                      {flag.invoiceNo || flag.rowId}
                    </div>
                    <div className="text-[11px] text-[#9B9589] mt-0.5">{flag.procedure}</div>
                  </div>

                  {/* Amount */}
                  <div className={`ml-auto text-[13px] font-semibold shrink-0 ${flaggedValueColor(flag.riskLevel)}`}>
                    {flag.amount ? `₹ ${flag.amount}` : "—"}
                  </div>

                  {/* Detection type */}
                  <span className={`hidden sm:inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 ${DETECTION_STYLES[flag.detection] ?? DETECTION_STYLES["Rule-based"]}`}>
                    {flag.detection}
                  </span>

                  {/* Status */}
                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full border shrink-0 ${riskBadge(flag.status === "Reviewed" ? "Low" : flag.status === "In Workpaper" ? "Low" : "High")}`}>
                    {flag.status}
                  </span>

                  {/* Chevron */}
                  <svg
                    width="14" height="14" fill="none" stroke="#9B9589" strokeWidth="2"
                    viewBox="0 0 24 24"
                    className={`shrink-0 transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {/* Expanded detail */}
                {expanded && (
                  <div className="border-t border-[#F0EDE8] px-5 py-4 bg-[#FAFAF8]">
                    {/* Reason */}
                    <p className="text-[13px] text-[#3A3A3A] mb-4 leading-relaxed">
                      <span className="font-medium text-[#1A1A2E]">Reason: </span>
                      {flag.reason}
                    </p>

                    {/* Detail grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                      {[
                        { label: "Vendor ID", value: flag.vendorId || "—" },
                        { label: "Date", value: flag.date || "—" },
                        { label: "Document Type", value: flag.documentType || "—" },
                        { label: "Field", value: flag.field || "—" },
                        { label: "Flagged Value", value: flag.flaggedValue || "—" },
                        { label: "Row ID", value: flag.rowId },
                      ].map(({ label, value }) => (
                        <div key={label} className="bg-white rounded-xl border border-[#E8E4DE] px-3 py-2.5">
                          <div className="text-[10px] text-[#9B9589] uppercase tracking-wider font-semibold mb-0.5">
                            {label}
                          </div>
                          <div className="text-[12px] text-[#1A1A2E] font-medium truncate">{value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Auditor action */}
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-[12px] text-[#9B9589] font-medium">Auditor Action:</span>
                      <div className="flex gap-2 flex-wrap">
                        {AUDITOR_OPTIONS.map((opt) => (
                          <button
                            key={opt}
                            disabled={updatingId === flag.id}
                            onClick={() => handleAuditorAction(flag.id, opt)}
                            className={`text-[11px] font-medium px-3 py-1.5 rounded-lg border transition-all ${
                              flag.auditorAction?.toLowerCase() === opt.toLowerCase()
                                ? "bg-[#1A1A2E] text-white border-[#1A1A2E]"
                                : "bg-white text-[#4B4B4B] border-[#E0DDD8] hover:border-[#B8B4AC]"
                            } disabled:opacity-50`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>

                      {/* Status change */}
                      <div className="ml-auto relative">
                        <select
                          value={flag.status}
                          disabled={updatingId === flag.id}
                          onChange={(e) => handleStatusChange(flag.id, e.target.value)}
                          className="appearance-none bg-white border border-[#E0DDD8] rounded-lg pl-3 pr-8 py-1.5 text-[12px] text-[#1A1A2E] font-medium cursor-pointer focus:outline-none focus:border-[#6d7dfc] disabled:opacity-50"
                          style={{ backgroundImage: CHEVRON_SVG, backgroundRepeat: "no-repeat", backgroundPosition: "right 10px center" }}
                        >
                          <option value="Open">Open</option>
                          <option value="Reviewed">Reviewed</option>
                          <option value="In Workpaper">In Workpaper</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}