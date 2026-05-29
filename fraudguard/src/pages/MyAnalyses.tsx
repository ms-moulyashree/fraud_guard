import { useState, useEffect, useRef } from "react";
import type { AnalysisRun, ProcedureResult } from "../App";
import {
  api,
  apiAnalysisToRun,
  apiFlagToDetail,
  type ApiFlag,
} from "../services/apiService";

interface MyAnalysesProps {
  analyses: AnalysisRun[];
  activeAnalysis: AnalysisRun | null;
  setActiveAnalysis: (a: AnalysisRun | null) => void;
  setAnalyses: React.Dispatch<React.SetStateAction<AnalysisRun[]>>;
}

// ─── Detection type badge map ─────────────────────────────────────────────────

const detectionTypeMap: Record<string, { label: string; color: string }> = {
  dup_invoice:     { label: "Statistical",  color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  weekend_booking: { label: "Time-based",   color: "bg-amber-50 text-amber-700 border border-amber-200" },
  three_way_match: { label: "Cross-data",   color: "bg-blue-50 text-blue-700 border border-blue-200" },
  benford:         { label: "Statistical",  color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  split_payment:   { label: "Statistical",  color: "bg-emerald-50 text-emerald-700 border border-emerald-200" },
  inactive_vendor: { label: "Flag",         color: "bg-red-50 text-red-600 border border-red-200" },
  new_vendor:      { label: "AI-assisted",  color: "bg-violet-50 text-violet-700 border border-violet-200" },
  gst_pan:         { label: "Cross-data",   color: "bg-blue-50 text-blue-700 border border-blue-200" },
};

// ─── Risk badge ───────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string | null }) {
  if (!level) return <span className="text-gray-400 text-sm">—</span>;
  const styles: Record<string, string> = {
    High:   "bg-red-50 text-red-600 border border-red-200",
    Medium: "bg-amber-50 text-amber-700 border border-amber-200",
    Low:    "bg-green-50 text-green-600 border border-green-200",
  };
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[level] ?? styles.Low}`}>
      {level}
    </span>
  );
}

// ─── Status icon ─────────────────────────────────────────────────────────────

function StatusCell({ status }: { status: ProcedureResult["status"] }) {
  if (status === "flagged") {
    return (
      <div className="flex items-center gap-1.5 text-red-600 font-medium text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#ef4444" strokeWidth="2"/>
          <line x1="15" y1="9" x2="9" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
          <line x1="9" y1="9" x2="15" y2="15" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        Flag
      </div>
    );
  }
  if (status === "passed") {
    return (
      <div className="flex items-center gap-1.5 text-green-600 font-medium text-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2"/>
          <polyline points="8 12 11 15 16 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        Pass
      </div>
    );
  }
  if (status === "running") {
    return <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
  }
  return (
    <div className="flex items-center gap-1.5 text-gray-400 text-sm">
      <div className="w-3 h-3 rounded-full border-2 border-gray-300" />
      Pending
    </div>
  );
}

// ─── Flagged rows sub-table ───────────────────────────────────────────────────

function FlaggedRowsTable({ runId, procId }: { runId: string; procId: string }) {
  const [flags, setFlags]     = useState<ReturnType<typeof apiFlagToDetail>[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.flags
      .list({ run_id: runId })
      .then((data: ApiFlag[]) => {
        setFlags(data.filter((f) => f.procedure_id === procId).map(apiFlagToDetail));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [runId, procId]);

  if (loading) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-4">
          <div className="flex items-center gap-2 text-gray-400 text-sm">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Loading flagged rows…
          </div>
        </td>
      </tr>
    );
  }

  if (flags.length === 0) {
    return (
      <tr>
        <td colSpan={6} className="px-6 py-3 text-sm text-gray-400 italic">
          No flagged rows found.
        </td>
      </tr>
    );
  }

  return (
    <tr>
      <td colSpan={6} className="px-0 py-0 bg-red-50/40">
        <div className="px-6 py-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
            Flagged rows
          </p>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b border-gray-200">
                <th className="pb-2 pr-4 font-medium">Row ID</th>
                <th className="pb-2 pr-4 font-medium">Invoice No</th>
                <th className="pb-2 pr-4 font-medium">Vendor</th>
                <th className="pb-2 pr-4 font-medium">Amount</th>
                <th className="pb-2 pr-4 font-medium">Date</th>
                <th className="pb-2 font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {flags.map((f) => (
                <tr key={f.rowId} className="border-b border-gray-100 last:border-0">
                  <td className="py-2 pr-4 text-gray-600">{f.rowId}</td>
                  <td className="py-2 pr-4 text-gray-700 font-medium">{f.invoiceNo || "—"}</td>
                  <td className="py-2 pr-4 text-gray-600">{f.vendorId || "—"}</td>
                  <td className="py-2 pr-4 text-red-600 font-semibold">{f.amount || "—"}</td>
                  <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{f.date || "—"}</td>
                  <td className="py-2 text-gray-500 text-xs">{f.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function MyAnalyses({
  analyses,
  activeAnalysis,
  setActiveAnalysis,
  setAnalyses,
}: MyAnalysesProps) {

  const [current, setCurrent]       = useState<AnalysisRun | null>(activeAnalysis ?? analyses[0] ?? null);
  const [followUp, setFollowUp]     = useState("");
  const [expandedProc, setExpandedProc] = useState<string | null>(null);
  const [rerunning, setRerunning]   = useState(false);

  const pollingRef = useRef(false);

  // Sync when parent changes activeAnalysis
  useEffect(() => {
    setCurrent(activeAnalysis ?? analyses[0] ?? null);
  }, [activeAnalysis, analyses]);

  // ── Poll while running ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!current || current.status !== "running" || pollingRef.current) return;

    pollingRef.current = true;

    api.analyses
      .poll(
        current.id,
        (updated) => {
          const converted = apiAnalysisToRun(updated);
          setCurrent(converted);
          setActiveAnalysis(converted);
          setAnalyses((prev) =>
            prev.map((a) => (a.id === converted.id ? converted : a))
          );
        },
        2000
      )
      .then((final) => {
        const converted = apiAnalysisToRun(final);
        setCurrent(converted);
        setActiveAnalysis(converted);
        setAnalyses((prev) =>
          prev.map((a) => (a.id === converted.id ? converted : a))
        );
      })
      .catch(console.error)
      .finally(() => {
        pollingRef.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  // ── Re-run: re-submit same file + same procedures via API ──────────────────
  const handleRerun = async () => {
    if (!current || rerunning) return;

    try {
      setRerunning(true);

      const procedureIds = current.procedures.map((p) => p.id);

      const response = await api.analyses.start({
        file_name:     current.fileName,
        file_path:     "",           // path not stored on AnalysisRun; backend re-uses file_name
        columns:       [],
        procedure_ids: procedureIds,
      });

      // Fetch the freshly created run and start polling it
      const newAnalysis = apiAnalysisToRun(
        await api.analyses.get(response.run_id)
      );

      setAnalyses((prev) => [newAnalysis, ...prev]);
      setActiveAnalysis(newAnalysis);
      setCurrent(newAnalysis);
      setExpandedProc(null);
      pollingRef.current = false; // allow poll useEffect to fire for new id

    } catch (err) {
      console.error("Re-run failed:", err);
      alert(err instanceof Error ? err.message : "Re-run failed");
    } finally {
      setRerunning(false);
    }
  };

  // ── No data ─────────────────────────────────────────────────────────────────
  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No analyses available
      </div>
    );
  }

  const procs      = current.procedures ?? [];
  const isRunning  = current.status === "running";
  const isComplete = current.status === "complete";
  const doneCount  = procs.filter((p) => p.status === "flagged" || p.status === "passed").length;
  const totalCount = procs.length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full bg-[#f7f8fa] overflow-hidden">

      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between shrink-0">

        <div className="flex items-start gap-3">
          <button
            onClick={() => setActiveAnalysis(null)}
            className="mt-1 text-gray-400 hover:text-gray-700 text-lg leading-none"
          >
            ←
          </button>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <svg width="16" height="16" fill="none" stroke="#6b7280" strokeWidth="1.5" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
              </svg>

              <h1 className="text-base font-semibold text-gray-800">{current.fileName}</h1>
              <span className="text-sm text-gray-400">· Procure to Pay</span>

              {isRunning && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                  <div className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  Running · {doneCount}/{totalCount}
                </span>
              )}

              {isComplete && (
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="#22c55e" strokeWidth="2"/>
                    <polyline points="8 12 11 15 16 9" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Analysis complete
                </span>
              )}
            </div>

            {isComplete && (
              <p className="text-xs text-gray-400 mt-1">
                Completed {new Date(current.startedAt).toLocaleString("en-IN", {
                  day: "numeric", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })} IST
              </p>
            )}
          </div>
        </div>

        {/* Re-run button */}
        {isComplete && (
          <button
            onClick={handleRerun}
            disabled={rerunning}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              rerunning
                ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {rerunning ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                Starting…
              </>
            ) : (
              <>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="1 4 1 10 7 10"/>
                  <path d="M3.51 15a9 9 0 1 0 .49-3.6"/>
                </svg>
                Re-run
              </>
            )}
          </button>
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT — results table */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-semibold text-gray-800">Procedure results</h2>
            </div>

            <table className="w-full">
              <thead className="bg-gray-50">
                <tr className="text-left">
                  <th className="px-6 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Procedure</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Detection Type</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Flagged Rows</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Risk</th>
                  <th className="px-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider">Action</th>
                </tr>
              </thead>

              <tbody>
                {procs.map((proc) => {
                  const det = detectionTypeMap[proc.id] ?? detectionTypeMap["dup_invoice"];
                  const isExpanded = expandedProc === proc.id;
                  const hasFlaggedRows = proc.flagCount > 0 && isComplete;

                  return (
                    <>
                      <tr
                        key={proc.id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-4 font-medium text-gray-800 text-sm">{proc.name}</td>

                        <td className="px-4 py-4">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${det.color}`}>
                            {det.label}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          <StatusCell status={proc.status} />
                        </td>

                        <td className="px-4 py-4 text-red-500 font-semibold text-sm">
                          {proc.flagCount > 0 ? `${proc.flagCount} rows` : "—"}
                        </td>

                        <td className="px-4 py-4">
                          <RiskBadge level={proc.riskLevel} />
                        </td>

                        {/* Action column */}
                        <td className="px-4 py-4">
                          {hasFlaggedRows ? (
                            <button
                              onClick={() => setExpandedProc(isExpanded ? null : proc.id)}
                              className="flex items-center gap-1 text-blue-600 text-sm font-medium hover:underline"
                            >
                              <svg
                                width="14" height="14" fill="none" stroke="currentColor"
                                strokeWidth="2" viewBox="0 0 24 24"
                                className={`transition-transform ${isExpanded ? "rotate-180" : ""}`}
                              >
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                              {isExpanded ? "Hide details" : "View details"}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-400 border border-gray-200 cursor-default select-none">
                              No flags
                            </span>
                          )}
                        </td>
                      </tr>

                      {/* Expanded flagged rows */}
                      {isExpanded && (
                        <FlaggedRowsTable runId={current.id} procId={proc.id} />
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — AI summary panel */}
        <div className="w-[340px] shrink-0 border-l border-gray-200 bg-white flex flex-col">

          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
            </svg>
            <h2 className="text-sm font-semibold text-gray-800">AI summary</h2>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">
            {current.aiSummary ? (
              <p className="text-sm leading-7 text-gray-700 whitespace-pre-line">
                {current.aiSummary}
              </p>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm px-8">
                {isRunning ? "Generating AI insights…" : "No AI summary available"}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Ask a follow-up question..."
                className="flex-1 outline-none text-sm text-gray-700"
              />
              <button className="text-gray-400 hover:text-blue-600 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}