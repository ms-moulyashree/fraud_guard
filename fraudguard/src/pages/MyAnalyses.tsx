import { useState, useEffect, useCallback } from "react";
import type { AnalysisRun, ProcedureResult } from "../App";

interface MyAnalysesProps {
  analyses: AnalysisRun[];
  activeAnalysis: AnalysisRun | null;
  setActiveAnalysis: (a: AnalysisRun | null) => void;
}

const detectionTypeMap: Record<string, { label: string; color: string }> = {
  dup_invoice: {
    label: "Statistical",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  weekend_booking: {
    label: "Time-based",
    color: "bg-amber-50 text-amber-700 border border-amber-200",
  },
  three_way_match: {
    label: "Cross-data",
    color: "bg-blue-50 text-blue-700 border border-blue-200",
  },
  benford: {
    label: "Statistical",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  split_payment: {
    label: "Statistical",
    color: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },
  inactive_vendor: {
    label: "Flag",
    color: "bg-red-50 text-red-600 border border-red-200",
  },
  new_vendor: {
    label: "AI-assisted",
    color: "bg-violet-50 text-violet-700 border border-violet-200",
  },
  gst_pan: {
    label: "Cross-data",
    color: "bg-blue-50 text-blue-700 border border-blue-200",
  },
};

type AnimStatus = "pending" | "running" | "passed" | "flagged";

interface AnimProc extends ProcedureResult {
  animStatus: AnimStatus;
}

type RunState = "idle" | "running" | "complete";

export default function MyAnalyses({
  analyses,
  activeAnalysis,
  setActiveAnalysis,
}: MyAnalysesProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [runState, setRunState] = useState<RunState>("idle");
  const [animProcs, setAnimProcs] = useState<AnimProc[]>([]);
  const [completedCount, setCompleted] = useState(0);
  const [aiText, setAiText] = useState("");
  const [aiDone, setAiDone] = useState(false);
  const [followUp, setFollowUp] = useState("");

  const current = activeAnalysis
    ? analyses.find((a) => a.id === activeAnalysis.id) ?? activeAnalysis
    : analyses[0] ?? null;

  useEffect(() => {
    if (!current) return;

    setRunState("idle");
    setCompleted(0);
    setAiText("");
    setAiDone(false);
    setExpandedRow(null);

    setAnimProcs(
      current.procedures.map((p) => ({
        ...p,
        animStatus: "pending" as AnimStatus,
      }))
    );
  }, [current?.id]);

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
        prev.map((p, idx) =>
          idx === i ? { ...p, animStatus: "running" } : p
        )
      );

      await new Promise((r) => setTimeout(r, 700));

      const result: AnimStatus =
        procs[i].flagCount > 0 ? "flagged" : "passed";

      setAnimProcs((prev) =>
        prev.map((p, idx) =>
          idx === i ? { ...p, animStatus: result } : p
        )
      );

      setCompleted(i + 1);
    }

    setRunState("complete");

    const summary = current.aiSummary ?? "";

    if (summary) {
      let idx = 0;

      setAiText("");

      const iv = setInterval(() => {
        idx++;

        setAiText(summary.slice(0, idx));

        if (idx >= summary.length) {
          clearInterval(iv);
          setAiDone(true);
        }
      }, 10);
    }
  }, [current, runState]);

  if (!current) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
        No analyses available
      </div>
    );
  }

  const isRunning = runState === "running";
  const isComplete = runState === "complete";

  return (
    <div className="flex flex-col h-full bg-[#f7f8fa] overflow-hidden">
      
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">

        <div className="flex items-start gap-4">

          <button
            onClick={() => setActiveAnalysis(null)}
            className="mt-1 text-gray-400 hover:text-gray-700"
          >
            ←
          </button>

          <div>

            <div className="flex items-center gap-3 flex-wrap">

              <h1 className="text-[24px] font-semibold text-gray-800">
                {current.fileName}
              </h1>

              <span className="text-sm text-gray-400">
                · Procure to Pay
              </span>

              {isRunning && (
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
                  Running {completedCount}/{animProcs.length}
                </span>
              )}

              {isComplete && (
                <span className="px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-medium border border-green-200">
                  Analysis complete
                </span>
              )}
            </div>

            <p className="text-sm text-gray-400 mt-1">
              Completed 23 May 2025, 15:14 IST
            </p>
          </div>
        </div>

        <button
          onClick={handleStartAnalysis}
          disabled={isRunning}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
            isRunning
              ? "bg-gray-200 text-gray-500"
              : "bg-black text-white hover:opacity-90"
          }`}
        >
          {isComplete ? "Re-run" : isRunning ? "Running..." : "Start analysis"}
        </button>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT */}
        <div className="flex-1 overflow-y-auto p-6">

          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">

            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-[20px] font-semibold text-gray-800">
                Procedure results
              </h2>
            </div>

            <table className="w-full">

              <thead className="bg-gray-50">

                <tr className="text-left">

                  <th className="px-6 py-4 text-xs font-medium text-gray-400 uppercase">
                    Procedure
                  </th>

                  <th className="px-4 py-4 text-xs font-medium text-gray-400 uppercase">
                    Detection Type
                  </th>

                  <th className="px-4 py-4 text-xs font-medium text-gray-400 uppercase">
                    Status
                  </th>

                  <th className="px-4 py-4 text-xs font-medium text-gray-400 uppercase">
                    Flagged Rows
                  </th>

                  <th className="px-4 py-4 text-xs font-medium text-gray-400 uppercase">
                    Risk
                  </th>

                  <th className="px-4 py-4 text-xs font-medium text-gray-400 uppercase">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>

                {animProcs.map((proc) => {

                  const det =
                    detectionTypeMap[proc.id] ??
                    detectionTypeMap["dup_invoice"];

                  const isExpanded = expandedRow === proc.id;

                  return (
                    <>
                      <tr
                        key={proc.id}
                        className="border-t border-gray-100 hover:bg-gray-50 transition"
                      >
                        <td className="px-6 py-5 font-semibold text-gray-800">
                          {proc.name}
                        </td>

                        <td className="px-4 py-5">
                          <span
                            className={`px-3 py-1 rounded-lg text-xs font-medium ${det.color}`}
                          >
                            {det.label}
                          </span>
                        </td>

                        <td className="px-4 py-5">

                          {proc.animStatus === "flagged" && (
                            <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                              <span className="w-2 h-2 rounded-full bg-red-500" />
                              Flag
                            </div>
                          )}

                          {proc.animStatus === "passed" && (
                            <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                              <span className="w-2 h-2 rounded-full bg-green-500" />
                              Passed
                            </div>
                          )}

                          {proc.animStatus === "running" && (
                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                          )}
                        </td>

                        <td className="px-4 py-5 text-red-500 font-semibold">
                          {proc.flagCount > 0
                            ? `${proc.flagCount} rows`
                            : "-"}
                        </td>

                        <td className="px-4 py-5">

                          {proc.flagCount > 0 ? (
                            <span className="px-3 py-1 rounded-full bg-red-50 text-red-600 border border-red-200 text-xs font-medium">
                              High
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-200 text-xs font-medium">
                              Low
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-5">

                          {proc.details && proc.flagCount > 0 && (
                            <button
                              onClick={() =>
                                setExpandedRow(
                                  isExpanded ? null : proc.id
                                )
                              }
                              className="text-blue-600 text-sm font-medium hover:underline"
                            >
                              {isExpanded
                                ? "Hide details"
                                : "View details"}
                            </button>
                          )}
                        </td>
                      </tr>

                      {isExpanded && proc.details && (
                        <tr>
                          <td
                            colSpan={6}
                            className="bg-red-50/40 px-8 py-6"
                          >

                            <div className="overflow-x-auto">

                              <table className="w-full">

                                <thead>
                                  <tr className="text-left border-b border-red-100">

                                    <th className="pb-3 text-xs text-gray-400 uppercase">
                                      Row ID
                                    </th>

                                    <th className="pb-3 text-xs text-gray-400 uppercase">
                                      Invoice No
                                    </th>

                                    <th className="pb-3 text-xs text-gray-400 uppercase">
                                      Vendor
                                    </th>

                                    <th className="pb-3 text-xs text-gray-400 uppercase">
                                      Amount
                                    </th>

                                    <th className="pb-3 text-xs text-gray-400 uppercase">
                                      Date
                                    </th>

                                    <th className="pb-3 text-xs text-gray-400 uppercase">
                                      Reason
                                    </th>
                                  </tr>
                                </thead>

                                <tbody>

                                  {proc.details.map((d) => (
                                    <tr
                                      key={d.rowId}
                                      className="border-b border-red-100"
                                    >
                                      <td className="py-4 text-sm text-gray-500">
                                        {d.rowId}
                                      </td>

                                      <td className="py-4 font-semibold text-gray-700">
                                        {d.invoiceNo}
                                      </td>

                                      <td className="py-4 text-gray-600">
                                        {d.vendorId}
                                      </td>

                                      <td className="py-4 text-red-500 font-semibold">
                                        {d.amount}
                                      </td>

                                      <td className="py-4 text-gray-500">
                                        {d.date}
                                      </td>

                                      <td className="py-4 text-gray-600">
                                        {d.reason}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
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

        {/* RIGHT PANEL */}
        <div className="w-[360px] border-l border-gray-200 bg-white flex flex-col">

          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-[26px] font-semibold text-gray-800">
              AI summary
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-5">

            {aiText ? (
              <p className="text-[15px] leading-8 text-gray-700 whitespace-pre-line">
                {aiText}
              </p>
            ) : (
              <div className="h-full flex items-center justify-center text-center text-gray-400 text-sm px-8">
                {isRunning
                  ? "Generating AI insights..."
                  : "Run analysis to generate AI summary"}
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
                className="flex-1 outline-none text-sm"
              />

              <button className="text-gray-400 hover:text-blue-600">
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}