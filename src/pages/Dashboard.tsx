import { useState } from "react";
import type { Page, SelectedFile, AnalysisRun, FlagDetail } from "../App";
import type { MSUser } from "../services/authService";

interface Engagement {
  id: string;
  name: string;
  year: string;
  type: string;
}

interface DashboardProps {
  user: MSUser;
  setCurrentPage: (page: Page) => void;
  selectedFile: SelectedFile | null;
  setSelectedFile: (f: SelectedFile | null) => void;
  analyses: AnalysisRun[];
  onLogout: () => void;
  activeEngagement: Engagement;
}

const recentAnalyses = [
  { id: "1", fileName: "AP_Transactions_Q3.xlsx", businessArea: "Procure to Pay", procedures: 45, flags: 12, risk: "High",   date: "23 May 2025" },
  { id: "2", fileName: "Sales_Ledger_Q4.xlsx",    businessArea: "Order to Cash",   procedures: 38, flags: 3,  risk: "Low",    date: "22 May 2025" },
  { id: "3", fileName: "Vendor_Master.xlsx",       businessArea: "Procure to Pay", procedures: 29, flags: 7,  risk: "Medium", date: "21 May 2025" },
];

const recentActivity = [
  { text: "Analysis completed — AP_Transactions_Q3.xlsx", time: "2h ago" },
  { text: "3 high-risk items flagged in Vendor_Master.xlsx", time: "5h ago" },
  { text: "New procedures added to Procure to Pay library", time: "1d ago" },
  { text: "Export sent to SharePoint", time: "1d ago" },
];

const stats = [
  { label: "Total Procedures Run", value: "2,847", change: "+12%", up: true,  icon: "📈" },
  { label: "Flags Raised",         value: "184",   change: "+5.2%", up: true,  icon: "🚩" },
  { label: "High Risk Items",      value: "23",    change: "-8%",   up: false, icon: "⚠️" },
  { label: "Files Analysed",       value: "67",    change: "+18%",  up: true,  icon: "📁" },
];

const SHAREPOINT_FILES: SelectedFile[] = [
  { name: "AP_Transactions_FY2025.xlsx", path: "/sites/Finance/AP_Transactions_FY2025.xlsx", columns: ["InvoiceNo","VendorID","Amount","Date","GSTIN","PAN","PO_No","GRN_No"], rowCount: 4821, size: "2.4 MB" },
  { name: "Vendor_Master_FY2025.xlsx",   path: "/sites/Finance/Vendor_Master_FY2025.xlsx",   columns: ["VendorID","Name","GSTIN","PAN","Status","CreatedDate"],                rowCount: 1203, size: "0.8 MB" },
  { name: "Sales_Ledger_FY2025.xlsx",    path: "/sites/Finance/Sales_Ledger_FY2025.xlsx",    columns: ["OrderID","CustomerID","Amount","Date","Region","Salesperson"],         rowCount: 9104, size: "5.1 MB" },
];

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

  const handleQuickRun = () => {
    if (!selectedFile) return;
    setCurrentPage("procedures");
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6">
          {/* Page title */}
          <div className="mb-5">
            <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {activeEngagement.year} · {activeEngagement.name}
            </p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {stats.map((s) => (
              <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-2xl font-bold text-gray-900">{s.value}</span>
                  <span className="text-lg">{s.icon}</span>
                </div>
                <div className="text-xs text-gray-500 mb-1">{s.label}</div>
                <div className={`text-xs font-medium ${s.up ? "text-green-600" : "text-red-500"}`}>
                  {s.change} <span className="text-gray-400 font-normal">vs last month</span>
                </div>
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
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-100">
                  <th className="text-left px-5 py-3 font-medium">File Name</th>
                  <th className="text-left px-4 py-3 font-medium">Business Area</th>
                  <th className="text-left px-4 py-3 font-medium">Procedures</th>
                  <th className="text-left px-4 py-3 font-medium">Flags</th>
                  <th className="text-left px-4 py-3 font-medium">Risk Level</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                  <th className="text-left px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {recentAnalyses.map((row, i) => (
                  <tr
                    key={row.id}
                    className={`border-b border-gray-50 hover:bg-gray-50 transition-colors ${i === recentAnalyses.length - 1 ? "border-0" : ""}`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2 text-gray-800 font-medium">
                        <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <polyline points="14 2 14 8 20 8"/>
                        </svg>
                        {row.fileName}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-gray-600">{row.businessArea}</td>
                    <td className="px-4 py-3.5 text-gray-600">{row.procedures}</td>
                    <td className="px-4 py-3.5 text-gray-800 font-semibold">{row.flags}</td>
                    <td className="px-4 py-3.5">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium border ${
                        row.risk === "High"   ? "bg-red-50 text-red-600 border-red-200" :
                        row.risk === "Medium" ? "bg-yellow-50 text-yellow-600 border-yellow-200" :
                                               "bg-green-50 text-green-600 border-green-200"
                      }`}>
                        {row.risk}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-gray-500">{row.date}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <button className="text-blue-600 hover:underline text-xs font-medium">View</button>
                        <button className="text-gray-400 hover:text-gray-600 text-xs">Re-run</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
            <label className="text-xs text-gray-500 font-medium mb-1.5 block">File from SharePoint</label>
            <button
              onClick={() => setShowFilePicker(!showFilePicker)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-left flex items-center gap-2 hover:bg-gray-50 transition-colors"
            >
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
              <span className={selectedFile ? "text-gray-800 font-medium truncate" : "text-gray-400"}>
                {selectedFile ? selectedFile.name : "Browse files..."}
              </span>
            </button>

            {showFilePicker && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 overflow-hidden">
                {SHAREPOINT_FILES.map((f) => (
                  <button
                    key={f.path}
                    onClick={() => { setSelectedFile(f); setShowFilePicker(false); }}
                    className="w-full px-3 py-2.5 text-left hover:bg-blue-50 transition-colors border-b border-gray-50 last:border-0"
                  >
                    <div className="text-xs font-medium text-gray-800">{f.name}</div>
                    <div className="text-[11px] text-gray-400 mt-0.5">{f.rowCount.toLocaleString()} rows · {f.size}</div>
                  </button>
                ))}
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

          {/* Recent activity */}
          <div className="mt-2">
            <h3 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wide">Recent activity</h3>
            <div className="flex flex-col gap-3">
              {recentActivity.map((a, i) => (
                <div key={i} className="flex gap-2">
                  <div className="mt-0.5 w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <svg width="8" height="8" fill="none" stroke="#3b82f6" strokeWidth="2.5" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-700 leading-snug">{a.text}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}