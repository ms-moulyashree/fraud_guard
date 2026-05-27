import { useState, useEffect, useCallback } from "react";
import type { AnalysisRun, ProcedureResult } from "../App";

interface MyAnalysesProps {
  analyses: AnalysisRun[];
  activeAnalysis: AnalysisRun | null;
  setActiveAnalysis: (a: AnalysisRun | null) => void;
}

const detectionTypeMap: Record<string, { label: string; color: string }> = {
  dup_invoice:     { label: "Statistical",  color: "bg-blue-50 text-blue-700 border border-blue-200" },
  weekend_booking: { label: "Time-based",   color: "bg-amber-50 text-amber-700 border border-amber-200" },
  three_way_match: { label: "Cross-data",   color: "bg-purple-50 text-purple-700 border border-purple-200" },
  benford:         { label: "Statistical",  color: "bg-blue-50 text-blue-700 border border-blue-200" },
  round_number:    { label: "Statistical",  color: "bg-blue-50 text-blue-700 border border-blue-200" },
  gst_pan:         { label: "Validation",   color: "bg-teal-50 text-teal-700 border border-teal-200" },
  split_payment:   { label: "Statistical",  color: "bg-blue-50 text-blue-700 border border-blue-200" },
  inactive_vendor: { label: "Flag",         color: "bg-red-50 text-red-600 border border-red-200" },
  new_vendor:      { label: "AI-assisted",  color: "bg-violet-50 text-violet-700 border border-violet-200" },
  journal_timing:  { label: "Time-based",   color: "bg-amber-50 text-amber-700 border border-amber-200" },
};

type AnimStatus = "pending" | "running" | "passed" | "flagged";

interface AnimProc extends ProcedureResult {
  animStatus: AnimStatus;
}

type RunState = "idle" | "running" | "complete";

export default function MyAnalyses({ analyses, activeAnalysis, setActiveAnalysis }: MyAnalysesProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [runState, setRunState]       = useState<RunState>("idle");
  const [animProcs, setAnimProcs]     = useState<AnimProc[]>([]);
  const [completedCount, setCompleted] = useState(0);
  const [aiText, setAiText]           = useState("");
  const [aiDone, setAiDone]           = useState(false);
  const [followUp, setFollowUp]       = useState("");

  // Always read from live analyses list so parent updates are reflected
  const current = activeAnalysis
    ? analyses.find((a) => a.id === activeAnalysis.id) ?? activeAnalysis
    : analyses[0] ?? null;

  // Reset anim state when active analysis changes
  useEffect(() => {
    if (!current) return;
    setRunState("idle");
    setCompleted(0);
    setAiText("");
    setAiDone(false);
    setExpandedRow(null);
    setAnimProcs(
      current.procedures.map((p) => ({ ...p, animStatus: "pending" as AnimStatus }))
    );
  }, [current?.id]);

  // ── Start analysis ────────────────────────────────────────────────────────
  const handleStartAnalysis = useCallback(async () => {
    if (!current || runState !== "idle") return;

    const procs = current.procedures.map((p) => ({
      ...p,
      animStatus: "pending" as AnimStatus,
    }));

    setRunState("running");
    setCompleted(0);
    setAnimProcs(procs);

    for (let i = 0; i < procs.length; i++) {
      setAnimProcs((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, animStatus: "running" } : p))
      );

      await new Promise((r) => setTimeout(r, 300 + Math.random() * 250));

      // ✅ Result comes from parent data (flagCount already set by ProceduresLibrary)
      const result: AnimStatus = procs[i].flagCount > 0 ? "flagged" : "passed";
      setAnimProcs((prev) =>
        prev.map((p, idx) => (idx === i ? { ...p, animStatus: result } : p))
      );
      setCompleted(i + 1);
    }

    setRunState("complete");

    const summary = current.aiSummary ?? "";
    if (summary) {
      let idx = 0;
      setAiText("");
      setAiDone(false);
      const iv = setInterval(() => {
        idx++;
        setAiText(summary.slice(0, idx));
        if (idx >= summary.length) {
          clearInterval(iv);
          setAiDone(true);
        }
      }, 14);
    }
  }, [current, runState]);

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No analyses yet — select procedures and run from the Procedures Library.
      </div>
    );
  }

  const totalFlags   = animProcs.reduce((s, p) => s + p.flagCount, 0);
  const anyDone      = animProcs.some((p) => p.animStatus !== "pending");
  const isRunning    = runState === "running";
  const isComplete   = runState === "complete";
  const businessArea = "Procure to Pay";

  return (
    <div className="flex-1 overflow-hidden flex flex-col bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveAnalysis(null)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded"
            aria-label="Back"
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="text-sm font-semibold text-gray-800">{current.fileName}</span>
          <span className="text-gray-300 select-none">·</span>
          <span className="text-sm text-gray-400">{businessArea}</span>
        </div>

        {/* ✅ Wired button */}
        <button
          onClick={handleStartAnalysis}
          disabled={isRunning || isComplete}
          className={`text-sm font-medium px-4 py-2 rounded-lg transition-all duration-150 ${
            isComplete
              ? "bg-green-600 text-white cursor-default"
              : isRunning
              ? "bg-blue-400 text-white cursor-not-allowed opacity-80"
              : "bg-blue-600 hover:bg-blue-700 active:scale-95 text-white"
          }`}
        >
          {isComplete ? "✓ Complete" : isRunning ? "Running…" : "Start analysis"}
        </button>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="bg-white border-b border-gray-200 px-6 py-2.5">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 shrink-0">Running procedures…</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${(completedCount / animProcs.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-blue-600 font-semibold shrink-0">
              {completedCount}/{animProcs.length}
            </span>
          </div>
        </div>
      )}

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* Left — table */}
        <div className="flex-1 overflow-y-auto p-5">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">

            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-700">Procedure results</h2>
              {anyDone && totalFlags > 0 && (
                <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-2.5 py-1 rounded-full font-medium">
                  {totalFlags} flag{totalFlags !== 1 ? "s" : ""} raised
                </span>
              )}
            </div>

            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="text-left px-5 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Procedure</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Detection type</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-400 uppercase tracking-wide">Flags</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {animProcs.map((proc, i) => {
                  const det        = detectionTypeMap[proc.id] ?? { label: "Statistical", color: "bg-blue-50 text-blue-700 border border-blue-200" };
                  const isLast     = i === animProcs.length - 1;
                  const hasDetail  = proc.details && proc.details.length > 0;
                  const isExpanded = expandedRow === proc.id;

                  return (
                    <>
                      <tr
                        key={proc.id}
                        onClick={() => {
                          if (hasDetail && proc.animStatus === "flagged")
                            setExpandedRow(isExpanded ? null : proc.id);
                        }}
                        className={[
                          !isLast ? "border-b border-gray-50" : "",
                          "hover:bg-gray-50/70 transition-colors",
                          hasDetail && proc.animStatus === "flagged" ? "cursor-pointer" : "",
                        ].join(" ")}
                      >
                        <td className="px-5 py-3.5 font-medium text-gray-800">{proc.name}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${det.color}`}>
                            {det.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {proc.animStatus === "pending" && <div className="w-4 h-4 rounded-full border-2 border-gray-200" />}
                          {proc.animStatus === "running" && <div className="w-4 h-4 rounded-full border-2 border-blue-400 border-t-transparent animate-spin" />}
                          {proc.animStatus === "passed" && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                                <svg width="8" height="8" fill="none" stroke="#16a34a" strokeWidth="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12" /></svg>
                              </div>
                              <span className="text-xs text-green-600 font-medium">Passed</span>
                            </div>
                          )}
                          {proc.animStatus === "flagged" && (
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                                <svg width="8" height="8" fill="none" stroke="#dc2626" strokeWidth="2.5" viewBox="0 0 24 24">
                                  <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
                                  <line x1="4" y1="22" x2="4" y2="15" />
                                </svg>
                              </div>
                              <span className="text-xs text-red-600 font-medium">Flagged</span>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {proc.flagCount > 0
                            ? <span className="text-sm font-bold text-red-600">{proc.flagCount}</span>
                            : proc.animStatus !== "pending" && proc.animStatus !== "running"
                            ? <span className="text-gray-300 text-sm">—</span>
                            : null}
                        </td>
                        <td className="px-4 py-3.5">
                          {hasDetail && proc.animStatus === "flagged" && (
                            <button className="text-xs text-blue-600 hover:underline flex items-center gap-1 transition-colors">
                              {isExpanded ? "Hide" : "View details"}
                              <svg width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <polyline points={isExpanded ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>

                      {isExpanded && proc.details && (
                        <tr key={`${proc.id}-expanded`}>
                          <td colSpan={5} className="px-5 py-4 bg-gray-50 border-b border-gray-100">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">
                              Flagged transactions
                            </p>
                            <div className="space-y-2">
                              {proc.details.map((d) => (
                                <div key={d.rowId} className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                                  <div className="flex items-center gap-3 flex-wrap mb-1.5">
                                    <span className="text-xs text-gray-400">Row {d.rowId}</span>
                                    <span className="text-xs font-semibold text-gray-700">{d.invoiceNo}</span>
                                    <span className="text-xs text-blue-600 font-medium">{d.amount}</span>
                                    <span className="text-xs text-gray-400">{d.date}</span>
                                    <span className="text-xs text-gray-400">{d.vendorId}</span>
                                    <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-semibold border ${
                                      d.riskLevel === "High" ? "bg-red-50 text-red-600 border-red-200"
                                      : d.riskLevel === "Medium" ? "bg-amber-50 text-amber-600 border-amber-200"
                                      : "bg-green-50 text-green-600 border-green-200"
                                    }`}>
                                      {d.riskLevel}
                                    </span>
                                  </div>
                                  <p className="text-xs text-gray-500 leading-relaxed">{d.reason}</p>
                                </div>
                              ))}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right — AI summary */}
        <div className="w-[300px] bg-white border-l border-gray-200 flex flex-col overflow-hidden shrink-0">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
              <svg width="10" height="10" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-700">AI summary</h2>
          </div>
          <div className="p-4 flex-1 overflow-y-auto">
            {aiText ? (
              <p className="text-sm text-gray-600 leading-relaxed">
                {aiText}
                {!aiDone && <span className="inline-block w-0.5 h-3.5 bg-indigo-500 animate-pulse ml-0.5 align-middle" />}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center pt-10 pb-6">
                <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center mb-3">
                  <svg width="18" height="18" fill="none" stroke="#6366f1" strokeWidth="1.5" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 leading-relaxed max-w-[200px]">
                  {isRunning ? "Analysis running — summary will appear when complete." : "Press Start analysis to begin scanning."}
                </p>
              </div>
            )}
          </div>
          <div className="px-4 py-3 border-t border-gray-100">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus-within:border-blue-300 transition-all">
              <input
                type="text"
                value={followUp}
                onChange={(e) => setFollowUp(e.target.value)}
                placeholder="Ask a follow-up question…"
                className="flex-1 text-xs bg-transparent outline-none text-gray-600 placeholder-gray-400"
              />
              <button disabled={!followUp.trim()} className="text-gray-300 hover:text-blue-500 disabled:opacity-40 transition-colors" aria-label="Send">
                <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <line x1="22" y1="2" x2="11" y2="13" />
                  <polygon points="22 2 15 22 11 13 2 9 22 2" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}