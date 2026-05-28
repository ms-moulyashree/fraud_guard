import { useState, useEffect } from "react";
import type { Page, SelectedFile, AnalysisRun } from "../App";
import type { MSUser } from "../services/authService";
import { api, type ApiEngagement, type ApiFile, } from "../services/apiService";


interface DashboardProps {
  user: MSUser;
  setCurrentPage: (page: Page) => void;
  selectedFile: SelectedFile | null;
  setSelectedFile: (f: SelectedFile | null) => void;
  analyses: AnalysisRun[];
  onLogout: () => void;
  activeEngagement: ApiEngagement | null;
}

interface RecentRow {
  id: string;
  file_name: string;
  status: string;
  started_at: string;
  procedure_count: number;
  flag_count: number;
  high_risk_count: number;
}



export default function Dashboard({
  user,
  setCurrentPage,
  selectedFile,
  setSelectedFile,
  analyses,
  onLogout,
  activeEngagement,
}: DashboardProps) {
  const [selectedArea, setSelectedArea] = useState("");
  const [showFilePicker, setShowFilePicker] = useState(false);

const [recentFiles, setRecentFiles] =
  useState<ApiFile[]>([]);



  const [stats, setStats] = useState({
    total_procedures: 0,
    total_flags: 0,
    high_risk: 0,
    files_analysed: 0,
  });
  const [recentRows, setRecentRows] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
  if (!activeEngagement) return;

  const engagementId = activeEngagement.id;

  let cancelled = false;

  async function fetchDashboard() {
    setLoading(true);
    setError(null);

    try {
     
const [
  statsData,
  recentData,
  filesData,
] = await Promise.all([
  api.dashboard.stats(engagementId),

  api.dashboard.recent(
    engagementId,
    10
  ),

  api.files.recent(),
]);



      if (!cancelled) {
        setStats(statsData as any);
        setRecentRows(recentData as any);

        setRecentFiles(filesData as any);


      }
    } catch (err: any) {
      if (!cancelled) {
        setError(
          err.message ?? "Failed to load dashboard"
        );
      }
    } finally {
      if (!cancelled) {
        setLoading(false);
      }
    }
  }

  fetchDashboard();

  return () => {
    cancelled = true;
  };
}, [activeEngagement]);

  const statCards = [
    { label: "Total Procedures Run", value: stats.total_procedures.toLocaleString(), icon: "📈" },
    { label: "Flags Raised",         value: stats.total_flags.toLocaleString(),      icon: "🚩" },
    { label: "High Risk Items",      value: stats.high_risk.toLocaleString(),        icon: "⚠️" },
    { label: "Files Analysed",       value: stats.files_analysed.toLocaleString(),   icon: "📁" },
  ];

  const handleQuickRun = () => {
    if (!selectedFile) return;
    setCurrentPage("procedures");
  };

  function riskFromCounts(flagCount: number, highRisk: number): { label: string; classes: string } {
    if (highRisk > 0) return { label: "High",   classes: "bg-red-50 text-red-600 border-red-200" };
    if (flagCount > 0) return { label: "Medium", classes: "bg-yellow-50 text-yellow-600 border-yellow-200" };
    return { label: "Low", classes: "bg-green-50 text-green-600 border-green-200" };
  }

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Page title */}
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeEngagement?.year} · {activeEngagement?.name}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {statCards.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">
                    {loading ? <span className="text-gray-300">—</span> : s.value}
                  </span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <div className="text-xs text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent analyses table */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Recent analyses</h2>
              <button
                onClick={() => setCurrentPage("analyses")}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                View all
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </button>
            </div>

            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Loading recent analyses…</div>
            ) : recentRows.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No analyses yet. Run your first analysis to see results here.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 border-b border-gray-100">
                    <th className="text-left px-5 py-3 font-medium">File Name</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Procedures</th>
                    <th className="text-left px-4 py-3 font-medium">Flags</th>
                    <th className="text-left px-4 py-3 font-medium">Risk Level</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {recentRows.map((row, i) => {
                    const risk = riskFromCounts(row.flag_count, row.high_risk_count);
                    return (
                      <tr
                        key={row.id}
                        className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === recentRows.length - 1 ? "border-0" : ""}`}
                      >
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 text-gray-800 font-medium">
                            <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            {row.file_name}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                            row.status === "complete" ? "bg-green-50 text-green-600 border-green-200" :
                            row.status === "running"  ? "bg-blue-50 text-blue-600 border-blue-200" :
                            row.status === "failed"   ? "bg-red-50 text-red-600 border-red-200" :
                                                        "bg-gray-50 text-gray-500 border-gray-200"
                          }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">{row.procedure_count}</td>
                        <td className="px-4 py-3.5 text-gray-800 font-semibold">{row.flag_count}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${risk.classes}`}>
                            {risk.label}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500">{formatDate(row.started_at)}</td>
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => setCurrentPage("analyses")}
                              className="text-blue-600 hover:underline text-xs font-medium"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Right panel — Quick run */}
      <div className="w-[280px] bg-white border-l border-gray-200 flex flex-col overflow-y-auto">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-800">Quick run</h2>
        </div>
        <div className="p-4 flex flex-col gap-4">

          {/* File picker */}
          <div className="relative">
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">
              File from SharePoint
            </label>

            <button
              onClick={() =>
                setShowFilePicker(!showFilePicker)
              }
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <svg
                width="14"
                height="14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>

              <span
                className={
                  selectedFile
                    ? "text-gray-800 font-medium truncate"
                    : "text-gray-400"
                }
              >
                {selectedFile
                  ? selectedFile.name
                  : "Browse files..."}
              </span>
            </button>

            {showFilePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">

                {recentFiles.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => {
                      setSelectedFile({
                        name: f.name,
                        path: f.path,
                        columns:
                          f.column_names || [],
                        rowCount:
                          f.row_count || 0,
                        size:
                          f.size_label || "0 MB",
                      });

                      setShowFilePicker(false);
                    }}
                    className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="text-xs font-medium text-gray-800">
                      {f.name}
                    </div>

                    <div className="text-[11px] text-gray-400 mt-0.5">
                      {(f.row_count || 0).toLocaleString()}{" "}
                      rows ·{" "}
                      {f.size_label || "0 MB"}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected file info */}
          {selectedFile && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">

                <span className="text-xs font-semibold text-green-700 truncate">
                  {selectedFile.name}
                </span>

                <button
                  onClick={() =>
                    setSelectedFile(null)
                  }
                  className="text-green-400 hover:text-green-600 text-xs ml-2 shrink-0"
                >
                  ✕
                </button>
              </div>

              <p className="text-[11px] text-green-600">
                {selectedFile.rowCount.toLocaleString()} rows ·{" "}
                {selectedFile.columns.length} columns ·{" "}
                {selectedFile.size}
              </p>
            </div>
          )}

          {/* Business area */}
          <div>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">Business area</label>
            <select
              value={selectedArea}
              onChange={(e) => setSelectedArea(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-600 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select area</option>
              <option value="p2p">Procure to Pay</option>
              <option value="o2c">Order to Cash</option>
              <option value="r2r">Record to Report</option>
            </select>
          </div>

          {/* Run button */}
          <button
            onClick={handleQuickRun}
            disabled={!selectedFile}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3"/>
            </svg>
            Run analysis
          </button>

          {!selectedFile && (
            <p className="text-[11px] text-gray-400 text-center -mt-2">Select a file to enable</p>
          )}
        </div>
      </div>
    </div>
  );
}