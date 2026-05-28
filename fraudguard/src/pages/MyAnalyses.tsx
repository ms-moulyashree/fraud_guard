import { useState } from "react";
import type { AnalysisRun } from "../App";

interface MyAnalysesProps {
  analyses: AnalysisRun[];
  activeAnalysis: AnalysisRun | null;
  setActiveAnalysis: (a: AnalysisRun | null) => void;
}

const detectionTypeMap: Record<
  string,
  { label: string; color: string }
> = {
  dup_invoice: {
    label: "Statistical",
    color:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },

  weekend_booking: {
    label: "Time-based",
    color:
      "bg-amber-50 text-amber-700 border border-amber-200",
  },

  three_way_match: {
    label: "Cross-data",
    color:
      "bg-blue-50 text-blue-700 border border-blue-200",
  },

  benford: {
    label: "Statistical",
    color:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },

  split_payment: {
    label: "Statistical",
    color:
      "bg-emerald-50 text-emerald-700 border border-emerald-200",
  },

  inactive_vendor: {
    label: "Flag",
    color:
      "bg-red-50 text-red-600 border border-red-200",
  },

  new_vendor: {
    label: "AI-assisted",
    color:
      "bg-violet-50 text-violet-700 border border-violet-200",
  },

  gst_pan: {
    label: "Cross-data",
    color:
      "bg-blue-50 text-blue-700 border border-blue-200",
  },
};

export default function MyAnalyses({
  analyses,
  activeAnalysis,
  setActiveAnalysis,
}: MyAnalysesProps) {

  const [followUp, setFollowUp] = useState("");


const current =
  activeAnalysis || analyses[0] || null;

if (!current) {
  return (
    <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
      No analyses available
    </div>
  );
}

const animProcs =
  current.procedures || [];

const aiText =
  current.aiSummary || "";

const isRunning =
  current.status === "running";

const isComplete =
  current.status === "complete";



  return (
    <div className="flex flex-col h-full bg-[#f7f8fa] overflow-hidden">

      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">

        <div className="flex items-start gap-4">

          <button
            onClick={() =>
              setActiveAnalysis(null)
            }
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
                  Running
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
          disabled={isRunning}
          className={`px-5 py-2 rounded-xl text-sm font-medium transition-all ${
            isRunning
              ? "bg-gray-200 text-gray-500"
              : "bg-black text-white hover:opacity-90"
          }`}
        >
          {isRunning
            ? "Running..."
            : "Completed"}
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
                    detectionTypeMap[
                      proc.id
                    ] ??
                    detectionTypeMap[
                      "dup_invoice"
                    ];

                  return (
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

                        {proc.status ===
                          "flagged" && (
                          <div className="flex items-center gap-2 text-red-600 font-medium text-sm">
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            Flagged
                          </div>
                        )}

                        {proc.status ===
                          "passed" && (
                          <div className="flex items-center gap-2 text-green-600 font-medium text-sm">
                            <span className="w-2 h-2 rounded-full bg-green-500" />
                            Passed
                          </div>
                        )}

                        {proc.status ===
                          "running" && (
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

                        {proc.flagCount >
                          0 && (
                          <button className="text-blue-600 text-sm font-medium hover:underline">
                            View flags
                          </button>
                        )}
                      </td>
                    </tr>
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
                  : "No AI summary available"}
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100">

            <div className="flex items-center gap-2 border border-gray-200 rounded-xl px-3 py-2">

              <input
                type="text"
                value={followUp}
                onChange={(e) =>
                  setFollowUp(
                    e.target.value
                  )
                }
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