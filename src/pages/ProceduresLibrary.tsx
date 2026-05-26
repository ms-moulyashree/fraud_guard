import { useState } from "react";
import type {
  Page,
  SelectedFile,
  AnalysisRun,
  ProcedureResult,
} from "../App";

const allProcedures = [
  {
    id: "dup_invoice",
    name: "Duplicate Invoice Detection",
    type: "Statistical",
    category: "Procure to Pay",
    description:
      "Identifies invoices with same vendor, amount, or invoice number filed multiple times.",
    risk: "High" as const,
  },
  {
    id: "weekend_booking",
    name: "Weekend / Holiday Booking",
    type: "Time-based",
    category: "Procure to Pay",
    description:
      "Flags transactions posted on weekends or public holidays.",
    risk: "Medium" as const,
  },
  {
    id: "three_way_match",
    name: "Three-way Match Exception",
    type: "Cross-data",
    category: "Procure to Pay",
    description:
      "Detects invoices without matching PO or GRN records.",
    risk: "High" as const,
  },
  {
    id: "benford",
    name: "Benford's Law First-Digit Test",
    type: "Statistical",
    category: "Procure to Pay",
    description:
      "Statistical test on first-digit distribution to detect fabricated transactions.",
    risk: "Medium" as const,
  },
  {
    id: "round_number",
    name: "Round Number Transaction Test",
    type: "Statistical",
    category: "Procure to Pay",
    description:
      "Flags suspiciously round figures that may indicate estimates or fabrications.",
    risk: "Medium" as const,
  },
  {
    id: "gst_pan",
    name: "GST / PAN Validation",
    type: "Cross-data",
    category: "Compliance",
    description:
      "Validates GST numbers and PAN against master vendor data and format rules.",
    risk: "High" as const,
  },
  {
    id: "split_payment",
    name: "Split Payment Detection",
    type: "Cross-data",
    category: "Procure to Pay",
    description:
      "Detects payments split below approval thresholds to same vendor on nearby dates.",
    risk: "High" as const,
  },
  {
    id: "inactive_vendor",
    name: "Inactive / Blocked Vendor Check",
    type: "Flag",
    category: "Human Resources",
    description:
      "Payments to vendors marked inactive or blocked in the vendor master.",
    risk: "High" as const,
  },
  {
    id: "new_vendor",
    name: "New Vendor High-Value Payment",
    type: "AI-assisted",
    category: "Human Resources",
    description:
      "High-value transactions within 30 days of vendor creation.",
    risk: "Medium" as const,
  },
  {
    id: "journal_timing",
    name: "Late Journal Entry Test",
    type: "Time-based",
    category: "General Ledger",
    description:
      "Journal entries posted after period-end cutoff.",
    risk: "Low" as const,
  },
];

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

const MOCK_FLAGS: Record<string, any[]> = {
  dup_invoice: [{ id: 1 }, { id: 2 }, { id: 3 }],
  weekend_booking: [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }],
  three_way_match: [{ id: 1 }],
  benford: [{ id: 1 }, { id: 2 }],
  round_number: [{ id: 1 }],
  gst_pan: [{ id: 1 }],
  split_payment: [{ id: 1 }, { id: 2 }],
  inactive_vendor: [{ id: 1 }],
  new_vendor: [{ id: 1 }],
  journal_timing: [],
};

const typeFilters = [
  "All",
  "Statistical",
  "Time-based",
  "Cross-data",
  "Flag",
  "AI-assisted",
];

interface ProceduresLibraryProps {
  selectedFile: SelectedFile | null;
  setCurrentPage: (page: Page) => void;
  setAnalyses: React.Dispatch<React.SetStateAction<AnalysisRun[]>>;
  setActiveAnalysis: (a: AnalysisRun) => void;
}

export default function ProceduresLibrary({
  selectedFile,
  setCurrentPage,
  setAnalyses,
  setActiveAnalysis,
}: ProceduresLibraryProps) {
  const [selectedArea, setSelectedArea] =
    useState("All Areas");

  const [selectedType, setSelectedType] =
    useState("All");

  const [toggled, setToggled] = useState<Set<string>>(
    new Set()
  );

  const [search, setSearch] = useState("");

  const toggle = (id: string) => {
    setToggled((prev) => {
      const next = new Set(prev);

      next.has(id) ? next.delete(id) : next.add(id);

      return next;
    });
  };

  // ✅ FILTERING
  const filteredProcedures = allProcedures.filter(
    (proc) => {
      const areaMatch =
        selectedArea === "All Areas" ||
        proc.category === selectedArea;

      const typeMatch =
        selectedType === "All" ||
        proc.type === selectedType;

      const searchMatch =
        proc.name
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        proc.description
          .toLowerCase()
          .includes(search.toLowerCase());

      return (
        areaMatch &&
        typeMatch &&
        searchMatch
      );
    }
  );

  const handleRunAnalysis = () => {
    if (toggled.size === 0 || !selectedFile) return;

    const selectedProcs = allProcedures.filter((p) =>
      toggled.has(p.id)
    );

    const procedures: ProcedureResult[] =
      selectedProcs.map((p) => ({
        id: p.id,
        name: p.name,
        status: "pending",
        riskLevel: null,
        flagCount:
          MOCK_FLAGS[p.id]?.length ?? 0,
        details: MOCK_FLAGS[p.id] ?? [],
      }));

    const run: AnalysisRun = {
      id: `RUN-${Date.now()}`,
      fileName: selectedFile.name,
      startedAt: new Date().toLocaleTimeString(),
      status: "running",
      procedures,
      aiSummary: `Analysis started for ${selectedFile.name}`,
    };

    setAnalyses((prev) => [run, ...prev]);

    setActiveAnalysis(run);

    setCurrentPage("analyses");
  };

  return (
    <div className="flex h-screen bg-[#f6f7fb] overflow-hidden">
      {/* MAIN */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* TOP BAR */}
        <div className="h-16 bg-white border-b border-gray-200 px-8 flex items-center justify-between">
          <div>
            <h1 className="text-[15px] font-semibold text-gray-900">
              Select procedures
            </h1>

            {selectedFile && (
              <p className="text-sm text-gray-400 mt-1">
                {selectedFile.name} · Procure to
                Pay
              </p>
            )}
          </div>

          <div className="flex items-center gap-4">
            <div className="px-4 py-2 border border-gray-200 rounded-xl text-[13px] text-gray-700 bg-white">
              Reliance Industries Ltd.
            </div>

            <div className="text-sm text-gray-400">
              <span className="font-semibold text-blue-600">
                M365
              </span>{" "}
              · Connected
            </div>

            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-semibold text-sm">
              AS
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR */}
          <div className="w-[260px] bg-white border-r border-gray-200 px-5 py-5 overflow-y-auto">
            <h3 className="text-sm font-semibold text-gray-500 mb-4">
              Business area
            </h3>

            <div className="space-y-1">
              {businessAreas.map((area) => (
                <button
                  key={area.name}
                  onClick={() =>
                    setSelectedArea(area.name)
                  }
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-[13px] transition-all ${
                    selectedArea === area.name
                      ? "bg-[#eef2ff] text-[#4f46e5] font-semibold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span>{area.name}</span>

                  <span className="text-xs opacity-70">
                    {area.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* PROCEDURES */}
          <div className="flex-1 px-8 py-6 overflow-y-auto">
            {/* SEARCH + FILTERS */}
            <div className="flex flex-wrap gap-3 mb-5">
              <input
                type="text"
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Search procedures..."
                className="flex-1 min-w-[260px] h-10 px-4 rounded-xl border border-gray-200 bg-white outline-none focus:ring-2 focus:ring-blue-100"
              />

              {typeFilters.map((filter) => (
                <button
                  key={filter}
                  onClick={() =>
                    setSelectedType(filter)
                  }
                  className={`h-10 px-4 rounded-full border text-[12px] transition-all ${
                    selectedType === filter
                      ? "bg-blue-50 border-blue-200 text-blue-600 font-semibold"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* COUNT */}
            <div className="text-[12px] text-gray-500 mb-4">
              {filteredProcedures.length} procedures
            </div>

            {/* CARDS */}
            <div className="grid grid-cols-2 gap-5">
              {filteredProcedures.map((proc) => {
                const active =
                  toggled.has(proc.id);

                return (
                  <div
                    key={proc.id}
                    onClick={() =>
                      toggle(proc.id)
                    }
                    className={`bg-white border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-md ${
                      active
                        ? "border-blue-500 ring-2 ring-blue-100"
                        : "border-gray-200"
                    }`}
                  >
                    {/* HEADER */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[15px] font-semibold text-gray-900 leading-5">
                            {proc.name}
                          </h3>

                          <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-medium">
                            {proc.category}
                          </span>
                        </div>

                        {/* TYPE */}
                        <span
                          className={`inline-flex mt-3 px-3 py-1 rounded-full text-[11px] font-semibold ${
                            proc.type ===
                            "Statistical"
                              ? "bg-emerald-50 text-emerald-600"
                              : proc.type ===
                                "Time-based"
                              ? "bg-amber-50 text-amber-600"
                              : proc.type ===
                                  "Cross-data"
                              ? "bg-blue-50 text-blue-600"
                              : proc.type ===
                                  "Flag"
                              ? "bg-red-50 text-red-600"
                              : "bg-purple-50 text-purple-600"
                          }`}
                        >
                          {proc.type}
                        </span>
                      </div>

                      {/* TOGGLE */}
                      <div
                        className={`w-11 h-6 rounded-full transition-all flex items-center px-1 shrink-0 ${
                          active
                            ? "bg-blue-600 justify-end"
                            : "bg-gray-200 justify-start"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                      </div>
                    </div>

                    {/* DESCRIPTION */}
                    <p className="text-[12px] text-gray-500 leading-6 mb-4">
                      {proc.description}
                    </p>

                    {/* FOOTER */}
                    <div className="flex items-center justify-between">
                      {/* RISK */}
                      <span
                        className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${
                          proc.risk === "High"
                            ? "text-red-600 border-red-200 bg-red-50"
                            : proc.risk ===
                              "Medium"
                            ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                            : "text-green-600 border-green-200 bg-green-50"
                        }`}
                      >
                        {proc.risk} Risk
                      </span>

                      {/* FLAGS */}
                      <span className="text-[11px] text-gray-400">
                        {
                          MOCK_FLAGS[proc.id]
                            ?.length
                        }{" "}
                        flags
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* FOOTER ACTION */}
            <div className="sticky bottom-0 mt-8 bg-white border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center gap-6">
                <div className="text-sm font-medium text-gray-700">
                  {toggled.size} procedures
                  selected
                </div>

                <button
                  onClick={() => {
                    const ids =
                      filteredProcedures.map(
                        (p) => p.id
                      );

                    setToggled(new Set(ids));
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Select all in area
                </button>
              </div>

              <button
                onClick={handleRunAnalysis}
                disabled={
                  toggled.size === 0 ||
                  !selectedFile
                }
                className="bg-[#6d7dfc] hover:bg-[#5d6ef7] text-[13px] disabled:opacity-40 disabled:cursor-not-allowed text-white px-6 py-3 rounded-xl font-medium transition-all"
              >
                Run analysis — {toggled.size}{" "}
                procedures
              </button>
            </div>

            {!selectedFile && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-sm text-amber-700">
                  Select a file from Dashboard
                  before running an analysis.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}