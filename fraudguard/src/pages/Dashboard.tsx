import { useMsal } from "@azure/msal-react";
import { graphRequest } from "../services/msalConfig";
import { useState, useEffect, useRef } from "react";
import type { Page, SelectedFile, AnalysisRun } from "../App";
import type { MSUser } from "../services/authService";
import { api, type ApiEngagement, type ApiFile } from "../services/apiService";

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
  const { instance, accounts } = useMsal();
  const [selectedArea, setSelectedArea] = useState("");
  const [showFilePicker, setShowFilePicker] = useState(false);
  const [search, setSearch] = useState("");
  const [pendingFile, setPendingFile] = useState<ApiFile | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const [msFiles, setMsFiles] = useState<ApiFile[]>([]);
  const [msFilesLoading, setMsFilesLoading] = useState(false);
  const [msFilesError, setMsFilesError] = useState<string | null>(null);

  const [recentFiles, setRecentFiles] = useState<ApiFile[]>([]);
  const [stats, setStats] = useState({ total_procedures: 0, total_flags: 0, high_risk: 0, files_analysed: 0 });
  const [recentRows, setRecentRows] = useState<RecentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Close picker on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowFilePicker(false);
        setPendingFile(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (!activeEngagement) return;
    const token = localStorage.getItem("fraudguard_token");
    if (!token) return;

    let cancelled = false;
    async function fetchDashboard() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, recentData, filesData] = await Promise.all([
          api.dashboard.stats(activeEngagement!.id),
          api.dashboard.recent(activeEngagement!.id, 10),
          api.files.recent(),
        ]);
        if (!cancelled) {
          setStats(statsData as any);
          setRecentRows(recentData as any);
          setRecentFiles(filesData as any);
        }
      } catch (err: any) {
        if (!cancelled) setError(err.message ?? "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchDashboard();
    return () => { cancelled = true; };
  }, [activeEngagement]);

  useEffect(() => {
    if (!showFilePicker) return;
    if (msFiles.length > 0) return;
    setMsFilesLoading(true);
    setMsFilesError(null);
    (async () => {
      try {
        const account = accounts[0];
        const tokenRes = await instance.acquireTokenSilent({ ...graphRequest, account });
        const res = await fetch(
          "https://graph.microsoft.com/v1.0/me/drive/root/children?$top=50&$select=id,name,size,lastModifiedDateTime,file,webUrl",
          { headers: { Authorization: `Bearer ${tokenRes.accessToken}` } }
        );
        if (!res.ok) throw new Error("Graph API error: " + res.statusText);
        const data = await res.json();
        const allowed = [".xlsx", ".xls", ".csv"];
        const files: ApiFile[] = (data.value as any[])
          .filter((f: any) => allowed.some(ext => f.name?.toLowerCase().endsWith(ext)))
          .map((f: any) => ({
            id: f.id,
            name: f.name,
            path: f.id,
            source: "onedrive",
            file_type: f.name.split(".").pop()?.toLowerCase() ?? "",
            row_count: null,
            column_names: null,
            size_label: f.size < 1048576 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / 1048576).toFixed(1)} MB`,
            site_name: null,
            uploaded_at: f.lastModifiedDateTime ?? null,
          }));
        setMsFiles(files);
      } catch (err: any) {
        setMsFilesError(err.message ?? "Failed to load OneDrive files");
      } finally {
        setMsFilesLoading(false);
      }
    })();
  }, [showFilePicker]);

  const filteredFiles = msFiles.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  const recentChips = recentFiles.slice(0, 3);

  const statCards = [
    { label: "Total Procedures Run", value: stats.total_procedures.toLocaleString(), icon: "📈" },
    { label: "Flags Raised",         value: stats.total_flags.toLocaleString(),      icon: "🚩" },
    { label: "High Risk Items",      value: stats.high_risk.toLocaleString(),        icon: "⚠️" },
    { label: "Files Analysed",       value: stats.files_analysed.toLocaleString(),   icon: "📁" },
  ];

  function riskFromCounts(flagCount: number, highRisk: number) {
    if (highRisk > 0) return { label: "High",   classes: "bg-red-50 text-red-600 border-red-200" };
    if (flagCount > 0) return { label: "Medium", classes: "bg-yellow-50 text-yellow-600 border-yellow-200" };
    return { label: "Low", classes: "bg-green-50 text-green-600 border-green-200" };
  }

  function formatDate(iso: string) {
    try { return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
    catch { return iso; }
  }

  async function handleUseFile() {
    if (!pendingFile) return;
    try {
      const registered = await api.files.register({
        name: pendingFile.name,
        path: pendingFile.path,
        source: pendingFile.source,
        file_type: pendingFile.file_type,
        size_label: pendingFile.size_label ?? undefined,
        row_count: pendingFile.row_count ?? undefined,
        column_names: pendingFile.column_names ?? [],
        site_name: pendingFile.site_name ?? undefined,
        engagement_id: activeEngagement?.id,
      });
      setSelectedFile({
        name: registered.name,
        path: registered.path,
        columns: registered.column_names ?? [],
        rowCount: registered.row_count ?? 0,
        size: registered.size_label ?? "",
      });
      const fresh = await api.files.recent();
      setRecentFiles(fresh as any);
    } catch {
      setSelectedFile({
        name: pendingFile.name,
        path: pendingFile.path,
        columns: pendingFile.column_names ?? [],
        rowCount: pendingFile.row_count ?? 0,
        size: pendingFile.size_label ?? "",
      });
    }
    setShowFilePicker(false);
    setPendingFile(null);
  }

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeEngagement?.year} · {activeEngagement?.name}
            </p>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
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

          {/* Recent analyses */}
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 flex items-center justify-between border-b border-gray-100">
              <h2 className="text-sm font-semibold text-gray-800">Recent analyses</h2>
              <button onClick={() => setCurrentPage("analyses")} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                View all
                <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
            {loading ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">Loading recent analyses…</div>
            ) : recentRows.length === 0 ? (
              <div className="px-5 py-8 text-center text-sm text-gray-400">No analyses yet. Select a file and run your first analysis.</div>
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
                      <tr key={row.id} className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === recentRows.length - 1 ? "border-0" : ""}`}>
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2 text-gray-800 font-medium">
                            <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                            {row.file_name}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                            row.status === "complete" ? "bg-green-50 text-green-600 border-green-200" :
                            row.status === "running"  ? "bg-blue-50 text-blue-600 border-blue-200" :
                            row.status === "failed"   ? "bg-red-50 text-red-600 border-red-200" :
                                                        "bg-gray-50 text-gray-500 border-gray-200"
                          }`}>{row.status}</span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-600">{row.procedure_count}</td>
                        <td className="px-4 py-3.5 text-gray-800 font-semibold">{row.flag_count}</td>
                        <td className="px-4 py-3.5">
                          <span className={`text-xs px-2 py-1 rounded-full font-medium border ${risk.classes}`}>{risk.label}</span>
                        </td>
                        <td className="px-4 py-3.5 text-gray-500">{formatDate(row.started_at)}</td>
                        <td className="px-4 py-3.5">
                          <button onClick={() => setCurrentPage("analyses")} className="text-blue-600 hover:underline text-xs font-medium">View</button>
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

          {/* File picker trigger */}
          <div className="relative" ref={pickerRef}>
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">File from SharePoint</label>
            <button
              onClick={() => { setShowFilePicker(!showFilePicker); setPendingFile(null); }}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span className={selectedFile ? "text-gray-800 font-medium truncate" : "text-gray-400"}>
                {selectedFile ? selectedFile.name : "Browse files..."}
              </span>
            </button>

            {/* OneDrive File Picker Modal */}
            {showFilePicker && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
                <div className="bg-white rounded-xl shadow-2xl w-[860px] max-h-[560px] flex flex-col overflow-hidden border border-gray-200">

                  {/* Header */}
                  <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-semibold text-gray-900">Select a file from OneDrive</h3>
                        <span className="text-[11px] bg-blue-50 text-blue-600 border border-blue-200 px-2 py-0.5 rounded-full font-medium">M365 ✓</span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5">Your recent OneDrive / SharePoint files (.xlsx, .xls, .csv)</p>
                    </div>
                    <button onClick={() => { setShowFilePicker(false); setPendingFile(null); }} className="text-gray-400 hover:text-gray-600">
                      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>

                  <div className="flex flex-1 overflow-hidden">
                    {/* Center: file grid */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                      <div className="px-4 pt-3 pb-2 border-b border-gray-50">
                        <div className="relative mb-2">
                          <svg width="13" height="13" fill="none" stroke="#9ca3af" strokeWidth="2" viewBox="0 0 24 24" className="absolute left-3 top-1/2 -translate-y-1/2">
                            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                          </svg>
                          <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search files..."
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        {!search && recentChips.length > 0 && (
                          <div className="flex items-center gap-2 overflow-x-auto pb-1">
                            <span className="text-[11px] text-gray-400 shrink-0">Recently used:</span>
                            {recentChips.map(f => (
                              <button
                                key={f.id}
                                onClick={() => setPendingFile(f)}
                                className={`text-[11px] px-2 py-1 rounded border shrink-0 transition-colors ${
                                  pendingFile?.id === f.id ? "bg-blue-50 border-blue-300 text-blue-600" : "border-gray-200 text-gray-500 hover:bg-gray-50"
                                }`}
                              >
                                {f.name.length > 20 ? f.name.slice(0, 20) + "…" : f.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* File grid */}
                      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 gap-2 content-start">
                        {msFilesLoading ? (
                          <div className="col-span-2 text-center py-8 text-sm text-gray-400">Loading your OneDrive files…</div>
                        ) : msFilesError ? (
          <div className="col-span-2 text-center py-8">
            <p className="text-sm text-red-400 mb-3">⚠️ {msFilesError}</p>
            <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg">
              Upload local file
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
              onChange={async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const registered = await api.files.upload(file, activeEngagement?.id);
    setSelectedFile({
      name: registered.name,
      path: registered.path,
      columns: registered.column_names ?? [],
      rowCount: registered.row_count ?? 0,
      size: registered.size_label ?? "",
      fileObject: file,
    });
    setShowFilePicker(false);
    setPendingFile(null);
  } catch (err: any) {
    setMsFilesError(err.message ?? "Upload failed");
  }
}}
              />
            </label>
          </div>
        ) : filteredFiles.length === 0 ? (
                          <div className="col-span-2 text-center py-8 text-sm text-gray-400">No files found</div>
                        ) : filteredFiles.map(f => (
                          <button
                            key={f.id}
                            onClick={() => setPendingFile(f)}
                            className={`text-left p-3 rounded-lg border transition-all ${
                              pendingFile?.id === f.id
                                ? "border-blue-400 bg-blue-50 ring-1 ring-blue-300"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                f.file_type === "csv" ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
                              }`}>{(f.file_type || "file").toUpperCase()}</span>
                              <span className="text-[12px] font-medium text-gray-800 truncate">{f.name}</span>
                            </div>
                            <div className="text-[11px] text-gray-400">
                              {f.size_label ?? "—"} · {f.uploaded_at ? new Date(f.uploaded_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Right: column preview */}
                    <div className="w-[200px] border-l border-gray-100 flex flex-col shrink-0">
                      {pendingFile ? (
                        <>
                          <div className="px-3 py-2.5 border-b border-gray-100">
                            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                              {pendingFile.column_names?.length ? `Detected columns (${pendingFile.column_names.length})` : "File selected"}
                            </div>
                            <div className="text-[11px] text-gray-400 truncate">{pendingFile.source === "onedrive" ? "OneDrive" : "SharePoint"}</div>
                          </div>
                          <div className="flex-1 overflow-y-auto py-1">
                            {pendingFile.column_names && pendingFile.column_names.length > 0 ? (
                              pendingFile.column_names.map(col => (
                                <div key={col} className="flex items-center justify-between px-3 py-1.5 hover:bg-gray-50">
                                  <span className="text-[12px] text-gray-700">{col}</span>
                                  <span className="text-[10px] text-gray-400">text</span>
                                </div>
                              ))
                            ) : (
                              <div className="px-3 py-3 text-[11px] text-gray-400">Columns will be detected when analysis runs.</div>
                            )}
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center text-[12px] text-gray-400 text-center px-4">
                          Select a file to preview columns
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-end">
                    <button
                      onClick={handleUseFile}
                      disabled={!pendingFile}
                      className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2 rounded-lg transition-colors"
                    >
                      Use this file
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Selected file info */}
          {selectedFile && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-green-700 truncate">{selectedFile.name}</span>
                <button onClick={() => setSelectedFile(null)} className="text-green-400 hover:text-green-600 text-xs ml-2 shrink-0">✕</button>
              </div>
              <p className="text-[11px] text-green-600">
                {selectedFile.rowCount.toLocaleString()} rows · {selectedFile.columns.length} columns · {selectedFile.size}
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
            onClick={() => { if (selectedFile) setCurrentPage("procedures"); }}
            disabled={!selectedFile}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
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