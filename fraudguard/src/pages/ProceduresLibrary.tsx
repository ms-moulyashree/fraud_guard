import { useEffect, useState } from "react";

import type {
  Page,
  SelectedFile,
  AnalysisRun,
} from "../App";

import {
  api,
  apiAnalysisToRun,
  type ApiProcedure,
  type ApiEngagement,
} from "../services/apiService";

// ─── Constants ───────────────────────────────────────────────────────────────

const businessAreas = [
  { name: "All Areas", count: 926 },
  { name: "Procure to Pay", count: 334 },
  { name: "Order to Cash", count: 203 },
  { name: "Human Resources", count: 98 },
  { name: "Inventory", count: 128 },
  { name: "Accounting & Financial", count: 54 },
  { name: "Hotel & Rental Properties", count: 51 },
  { name: "PPE", count: 35 },
  { name: "Claims & Disbursement", count: 12 },
  { name: "Travel Expenses", count: 11 },
];

const typeFilters = [
  "All",
  "Statistical",
  "Time-based",
  "Cross-data",
  "Flag",
  "AI-assisted",
];

// Colour map for procedure type badges
const typeBadgeStyle: Record<string, { bg: string; text: string; border: string }> = {
  Statistical:  { bg: "#e8f5e9", text: "#2e7d32", border: "#a5d6a7" },
  "Time-based": { bg: "#fff8e1", text: "#e65100", border: "#ffcc80" },
  "Cross-data": { bg: "#e3f2fd", text: "#1565c0", border: "#90caf9" },
  Flag:         { bg: "#fce4ec", text: "#ad1457", border: "#f48fb1" },
  "AI-assisted":{ bg: "#ede7f6", text: "#4527a0", border: "#b39ddb" },
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProceduresLibraryProps {
  selectedFile: SelectedFile | null;
  setCurrentPage: (page: Page) => void;
  setAnalyses: React.Dispatch<React.SetStateAction<AnalysisRun[]>>;
  setActiveAnalysis: React.Dispatch<React.SetStateAction<AnalysisRun | null>>;
  activeEngagement: ApiEngagement | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProceduresLibrary({
  selectedFile,
  setCurrentPage,
  setAnalyses,
  setActiveAnalysis,
  activeEngagement,
}: ProceduresLibraryProps) {

  const [procedures, setProcedures] = useState<ApiProcedure[]>([]);
  const [loading, setLoading]       = useState(true);
  const [selectedArea, setSelectedArea] = useState("All Areas");
  const [selectedType, setSelectedType] = useState("All");
  const [toggled, setToggled]       = useState<Set<string>>(new Set());
  const [search, setSearch]         = useState("");
  const [running, setRunning]       = useState(false);

  // ── Load procedures from DB ──────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      try {
        const data = await api.procedures.list();
        setProcedures(data);
      } catch (err) {
        console.error("Failed to load procedures", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // ── Toggle a procedure on / off ──────────────────────────────────────────
  const toggle = (id: string) => {
    setToggled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // ── Select all visible procedures ────────────────────────────────────────
  const selectAllVisible = () => {
    setToggled((prev) => {
      const next = new Set(prev);
      filteredProcedures.forEach((p) => next.add(p.id));
      return next;
    });
  };

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredProcedures = procedures.filter((proc) => {
    const areaMatch =
      selectedArea === "All Areas" || proc.category === selectedArea;
    const typeMatch =
      selectedType === "All" || proc.type === selectedType;
    const searchMatch =
      proc.name.toLowerCase().includes(search.toLowerCase()) ||
      proc.description.toLowerCase().includes(search.toLowerCase());
    return areaMatch && typeMatch && searchMatch;
  });

  // ── Run analysis ─────────────────────────────────────────────────────────
  const handleRunAnalysis = async () => {
    if (toggled.size === 0 || !selectedFile) return;

    try {
      setRunning(true);

      const procedureIds = Array.from(toggled);
      let runId: string;

      if (selectedFile.fileObject) {
        const res = await api.analyses.uploadAndRun(
          selectedFile.fileObject,
          procedureIds,
          activeEngagement?.id
        );
        runId = res.run_id;
      } else {
        const res = await api.analyses.start({
          file_name:     selectedFile.name,
          file_path:     selectedFile.path || "",
          columns:       selectedFile.columns || [],
          procedure_ids: procedureIds,
          file_size:     selectedFile.size,
          row_count:     selectedFile.rowCount,
        });
        runId = res.run_id;
      }

      const analysis          = await api.analyses.get(runId);
      const convertedAnalysis = apiAnalysisToRun(analysis);

      setAnalyses((prev) => [convertedAnalysis, ...prev]);
      setActiveAnalysis(convertedAnalysis);
      setCurrentPage("analyses");

    } catch (err) {
      console.error("Failed to run analysis:", err);
      alert(err instanceof Error ? err.message : "Failed to start analysis");
    } finally {
      setRunning(false);
    }
  };

  // ── Loading state ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 text-sm">
        <svg className="animate-spin w-5 h-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        Loading procedures...
      </div>
    );
  }

  // ── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="flex h-full bg-[#f6f7fb] overflow-hidden">

      {/* ── Left panel: Business Areas ── */}
      <aside className="w-56 shrink-0 bg-white border-r border-gray-100 flex flex-col py-4 overflow-y-auto">

        {/* Back button + breadcrumb */}
        <div className="px-4 mb-4">
          <button
            onClick={() => setCurrentPage("dashboard")}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 mb-3"
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
            Back
          </button>

          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
            Select procedures
          </p>
          {selectedFile && (
            <p className="text-[11px] text-gray-500 leading-tight truncate">
              {selectedFile.name}
              <span className="block text-gray-400">Procure to Pay</span>
            </p>
          )}
        </div>

        <div className="px-3 mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider px-1 mb-1">
            Business area
          </p>
        </div>

        <nav className="flex-1 px-2">
          {businessAreas.map((area) => {
            const active = selectedArea === area.name;
            return (
              <button
                key={area.name}
                onClick={() => setSelectedArea(area.name)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg mb-0.5 text-left transition-colors text-sm ${
                  active
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className="truncate">{area.name}</span>
                <span
                  className={`text-xs shrink-0 ml-1 ${
                    active ? "text-blue-500" : "text-gray-400"
                  }`}
                >
                  {area.count}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* ── Right panel: Procedures grid ── */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top toolbar */}
        <div className="bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-3 shrink-0">

          {/* Search */}
          <div className="relative flex-1 max-w-xs">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
            >
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="Search procedures..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 transition"
            />
          </div>

          {/* Type filter chips */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {typeFilters.map((t) => (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                  selectedType === t
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600"
                }`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Procedure count */}
        <div className="px-6 py-2 shrink-0">
          <p className="text-xs text-gray-500">
            {filteredProcedures.length} procedure{filteredProcedures.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Procedure cards grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-24">
          {filteredProcedures.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" className="mb-3 opacity-40">
                <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
              </svg>
              <p className="text-sm">No procedures match your filters</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 pt-1">
              {filteredProcedures.map((proc) => {
                const isOn = toggled.has(proc.id);
                const badge = typeBadgeStyle[proc.type] ?? {
                  bg: "#f3f4f6", text: "#374151", border: "#d1d5db",
                };

                return (
                  <div
                    key={proc.id}
                    onClick={() => toggle(proc.id)}
                    className={`relative bg-white rounded-xl border p-4 cursor-pointer transition-all select-none ${
                      isOn
                        ? "border-blue-400 shadow-sm ring-1 ring-blue-200"
                        : "border-gray-200 hover:border-gray-300 hover:shadow-sm"
                    }`}
                  >
                    {/* Header row */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className="text-sm font-semibold text-gray-800 leading-tight">
                        {proc.name}
                      </span>

                      {/* Toggle switch */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(proc.id);
                        }}
                        className={`relative shrink-0 w-9 h-5 rounded-full transition-colors ${
                          isOn ? "bg-blue-600" : "bg-gray-200"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                            isOn ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </button>
                    </div>

                    {/* Type badge */}
                    <div className="mb-2">
                      <span
                        className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border"
                        style={{
                          backgroundColor: badge.bg,
                          color: badge.text,
                          borderColor: badge.border,
                        }}
                      >
                        {proc.type}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-gray-500 leading-relaxed line-clamp-2">
                      {proc.description}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Bottom bar: selection count + run button ── */}
        <div className="absolute bottom-0 left-56 right-0 bg-white border-t border-gray-200 px-6 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">
              <span className="font-semibold text-gray-800">{toggled.size}</span>{" "}
              procedure{toggled.size !== 1 ? "s" : ""} selected
            </span>

            {filteredProcedures.length > 0 && (
              <button
                onClick={selectAllVisible}
                className="text-xs text-blue-600 hover:underline"
              >
                ☑ Select all in area
              </button>
            )}
          </div>

          <button
            onClick={handleRunAnalysis}
            disabled={toggled.size === 0 || !selectedFile || running}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              toggled.size === 0 || !selectedFile || running
                ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                : "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            }`}
          >
            {running ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                Running…
              </>
            ) : (
              <>
                Run analysis — {toggled.size} procedure{toggled.size !== 1 ? "s" : ""}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}