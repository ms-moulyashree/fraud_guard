import { useState } from "react";
import type { Page, SelectedFile, AnalysisRun, ProcedureResult } from "../App";

const allProcedures = [
  {
    id: "dup_invoice",
    name: "Duplicate Invoice Detection",
    category: "Procure to Pay",
    description: "Identifies invoices with same vendor, amount, or invoice number filed multiple times.",
    risk: "High" as const,
  },
  {
    id: "weekend_booking",
    name: "Weekend / Holiday Booking",
    category: "Procure to Pay",
    description: "Flags transactions posted on weekends or public holidays.",
    risk: "Medium" as const,
  },
  {
    id: "three_way_match",
    name: "Three-way Match Exception",
    category: "Procure to Pay",
    description: "Detects invoices without matching PO or GRN records.",
    risk: "High" as const,
  },
  {
    id: "benford",
    name: "Benford's Law First-Digit Test",
    category: "Procure to Pay",
    description: "Statistical test on first-digit distribution to detect fabricated transactions.",
    risk: "Medium" as const,
  },
  {
    id: "round_number",
    name: "Round Number Transaction Test",
    category: "Procure to Pay",
    description: "Flags suspiciously round figures that may indicate estimates or fabrications.",
    risk: "Medium" as const,
  },
  {
    id: "gst_pan",
    name: "GST / PAN Validation",
    category: "Compliance",
    description: "Validates GST numbers and PAN against master vendor data and format rules.",
    risk: "High" as const,
  },
  {
    id: "split_payment",
    name: "Split Payment Detection",
    category: "Procure to Pay",
    description: "Detects payments split below approval thresholds to same vendor on nearby dates.",
    risk: "High" as const,
  },
  {
    id: "inactive_vendor",
    name: "Inactive / Blocked Vendor Check",
    category: "Human Resources",
    description: "Payments to vendors marked inactive or blocked in the vendor master.",
    risk: "High" as const,
  },
  {
    id: "new_vendor",
    name: "New Vendor High-Value Payment",
    category: "Human Resources",
    description: "High-value transactions within 30 days of vendor creation.",
    risk: "Medium" as const,
  },
  {
    id: "journal_timing",
    name: "Late Journal Entry Test",
    category: "General Ledger",
    description: "Journal entries posted after period-end cutoff.",
    risk: "Low" as const,
  },
];

const categories = ["All", "Procure to Pay", "Human Resources", "Compliance", "General Ledger"];

const MOCK_FLAGS: Record<
  string,
  {
    rowId: string;
    invoiceNo: string;
    vendorId: string;
    amount: string;
    date: string;
    reason: string;
    riskLevel: "High" | "Medium" | "Low";
    documentType: string;
    status: "Open" | "Reviewed" | "In Workpaper";
  }[]
> = {
  dup_invoice: [
    { rowId: "R-0241", invoiceNo: "INV-2024-8821", vendorId: "VND-0091", amount: "₹4,25,000", date: "2025-01-14", reason: "Same invoice number filed by VND-0091 on 2025-01-10 and 2025-01-14", riskLevel: "High", documentType: "AP Invoice", status: "Open" },
    { rowId: "R-0242", invoiceNo: "INV-2024-8821", vendorId: "VND-0091", amount: "₹4,25,000", date: "2025-01-10", reason: "Duplicate of R-0241 — identical vendor, amount, and invoice number", riskLevel: "High", documentType: "AP Invoice", status: "Open" },
    { rowId: "R-1093", invoiceNo: "INV-2025-0012", vendorId: "VND-0147", amount: "₹87,500", date: "2025-02-03", reason: "Same amount and vendor within 3 days — possible re-submission", riskLevel: "High", documentType: "AP Invoice", status: "Open" },
  ],
  weekend_booking: [
    { rowId: "R-0512", invoiceNo: "INV-2024-9102", vendorId: "VND-0033", amount: "₹1,20,000", date: "2025-01-04", reason: "Transaction posted on Saturday (Jan 4, 2025)", riskLevel: "Medium", documentType: "AP Invoice", status: "Open" },
    { rowId: "R-0788", invoiceNo: "INV-2024-9203", vendorId: "VND-0057", amount: "₹2,80,000", date: "2025-01-05", reason: "Posted on Sunday (Jan 5, 2025)", riskLevel: "Medium", documentType: "AP Invoice", status: "Open" },
    { rowId: "R-0901", invoiceNo: "INV-2024-9388", vendorId: "VND-0082", amount: "₹95,000", date: "2025-01-26", reason: "Republic Day — public holiday posting", riskLevel: "Medium", documentType: "AP Invoice", status: "Open" },
    { rowId: "R-1201", invoiceNo: "INV-2025-0041", vendorId: "VND-0114", amount: "₹3,40,000", date: "2025-02-15", reason: "Posted on Saturday (Feb 15, 2025)", riskLevel: "Medium", documentType: "AP Invoice", status: "Open" },
    { rowId: "R-1344", invoiceNo: "INV-2025-0088", vendorId: "VND-0022", amount: "₹62,000", date: "2025-02-16", reason: "Sunday posting with no system override log", riskLevel: "Medium", documentType: "AP Invoice", status: "Open" },
  ],
  round_number: [
    { rowId: "R-0099", invoiceNo: "INV-2025-0200", vendorId: "VND-0200", amount: "₹1,00,00,000", date: "2025-01-31", reason: "Clean round number ₹1 Cr transfer — possible estimate or fabricated amount", riskLevel: "Medium", documentType: "Bank Transfer", status: "Open" },
  ],
  gst_pan: [
    { rowId: "R-0730", invoiceNo: "INV-2024-8900", vendorId: "VND-0061", amount: "₹2,10,000", date: "2024-12-22", reason: "GST number format invalid (18 chars expected, got 15)", riskLevel: "High", documentType: "AP Invoice", status: "Open" },
  ],
};

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
  const [category, setCategory] = useState("All");
  const [toggled, setToggled] = useState<Set<string>>(new Set());

  const filtered = allProcedures.filter((p) => category === "All" || p.category === category);

  const toggle = (id: string) => {
    setToggled((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleRunAnalysis = () => {
    if (toggled.size === 0 || !selectedFile) return;

    const selectedProcs = allProcedures.filter((p) => toggled.has(p.id));

    // ✅ FIX: initialise all procedures as "pending" with flagCount=0
    // MyAnalyses will drive its own local animation — we just need the
    // procedure list and the final flag data here.
    const procedures: ProcedureResult[] = selectedProcs.map((p) => ({
      id: p.id,
      name: p.name,
      status: "pending",
      riskLevel: null,
      flagCount: MOCK_FLAGS[p.id]?.length ?? 0,   // ✅ pre-populate so MyAnalyses knows what to show after run
      details: MOCK_FLAGS[p.id] ?? [],             // ✅ pre-populate details too
    }));

    const totalFlags = procedures.reduce((s, p) => s + p.flagCount, 0);
    const highRiskCount = selectedProcs.filter(
      (p) => (MOCK_FLAGS[p.id]?.length ?? 0) > 0 && p.risk === "High"
    ).length;

    const run: AnalysisRun = {
      id: `RUN-${Date.now()}`,
      fileName: selectedFile.name,
      startedAt: new Date().toLocaleTimeString(),
      // ✅ FIX: status is "running" — MyAnalyses animates it locally,
      //    but the actual flag data is already present so results show correctly.
      status: "running",
      procedures,
      // ✅ Pre-populate AI summary so it's ready when animation completes
      aiSummary: `Analysis of ${selectedFile.name} across ${selectedProcs.length} procedure${selectedProcs.length !== 1 ? "s" : ""} identified ${totalFlags} flag${totalFlags !== 1 ? "s" : ""}. ${
        highRiskCount > 0
          ? `${highRiskCount} high-risk procedure${highRiskCount !== 1 ? "s" : ""} require immediate review — notably Duplicate Invoice Detection (3 flags, ₹4,25,000 at risk) and GST/PAN Validation errors. Weekend bookings (5 flags) suggest a potential control gap in the posting schedule. Recommend escalating duplicate invoice cases to the AP manager and re-validating vendor GST details.`
          : "No high-risk issues detected. Review medium-risk flags as part of standard audit procedures."
      }`,
    };

    // ✅ Add to analyses list and set as active BEFORE navigating
    setAnalyses((prev) => [run, ...prev]);
    setActiveAnalysis(run);

    // ✅ Navigate last — after state is set
    setCurrentPage("analyses");
  };

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Procedures Library</h1>
          {selectedFile && (
            <p className="text-xs text-green-600 mt-0.5 font-medium">
              ◈ {selectedFile.name} · {selectedFile.rowCount.toLocaleString()} rows · {selectedFile.columns.length} columns
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">{toggled.size} selected</span>
          <button
            onClick={handleRunAnalysis}
            disabled={toggled.size === 0 || !selectedFile}
            className="flex items-center gap-2 bg-blue-600 disabled:opacity-30 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 active:scale-95 transition-all"
          >
            <svg width="12" height="12" fill="currentColor" viewBox="0 0 24 24">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            Run Analysis ({toggled.size})
          </button>
        </div>
      </div>

      <div className="px-6 py-5">
        {/* Category tabs */}
        <div className="flex gap-2 mb-5 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                category === cat
                  ? "bg-blue-50 text-blue-600 border-blue-200"
                  : "text-gray-500 border-gray-200 bg-white hover:text-gray-700 hover:bg-gray-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Procedures list */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          {filtered.map((proc, i) => (
            <div
              key={proc.id}
              onClick={() => toggle(proc.id)}
              className={`flex items-center gap-4 px-5 py-4 cursor-pointer transition-all ${
                i !== filtered.length - 1 ? "border-b border-gray-100" : ""
              } ${toggled.has(proc.id) ? "bg-blue-50" : "hover:bg-gray-50"}`}
            >
              {/* Toggle switch */}
              <div
                className={`w-10 h-5 rounded-full border-2 transition-all shrink-0 flex items-center px-0.5 ${
                  toggled.has(proc.id)
                    ? "bg-blue-600 border-blue-600 justify-end"
                    : "bg-gray-200 border-gray-200 justify-start"
                }`}
              >
                <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-sm font-semibold text-gray-800">{proc.name}</span>
                  <span className="text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded border border-gray-200 font-medium">
                    {proc.category}
                  </span>
                </div>
                <p className="text-xs text-gray-500">{proc.description}</p>
              </div>

              {/* Risk badge */}
              <span
                className={`text-xs px-2.5 py-1 rounded-full border font-semibold shrink-0 ${
                  proc.risk === "High"
                    ? "text-red-600 border-red-200 bg-red-50"
                    : proc.risk === "Medium"
                    ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                    : "text-green-600 border-green-200 bg-green-50"
                }`}
              >
                {proc.risk}
              </span>
            </div>
          ))}
        </div>

        {!selectedFile && (
          <div className="mt-4 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-2">
            <svg width="14" height="14" fill="none" stroke="#d97706" strokeWidth="2" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <p className="text-xs text-amber-700">Select a file from the Dashboard before running an analysis.</p>
          </div>
        )}
      </div>
    </div>
  );
}