import { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ProceduresLibrary from "./pages/ProceduresLibrary";
import MyAnalyses from "./pages/MyAnalyses";
import FlaggedItems from "./pages/FlaggedItems";
import Settings from "./pages/Settings";
import LoginPage from "./pages/LoginPage";
import { getStoredSession, mockLogout, type MSUser } from "./services/authService";

export type Page = "dashboard" | "procedures" | "analyses" | "flagged" | "settings";

export interface SelectedFile {
  name: string;
  path: string;
  columns: string[];
  rowCount: number;
  size: string;
}

export interface AnalysisRun {
  id: string;
  fileName: string;
  startedAt: string;
  status: "running" | "complete" | "failed";
  procedures: ProcedureResult[];
  aiSummary: string;
}

export interface ProcedureResult {
  id: string;
  name: string;
  status: "pending" | "running" | "passed" | "flagged" | "failed";
  riskLevel: "High" | "Medium" | "Low" | null;
  flagCount: number;
  details?: FlagDetail[];
}

export interface FlagDetail {
  rowId: string;
  invoiceNo: string;
  vendorId: string;
  amount: string;
  date: string;
  reason: string;
  riskLevel: "High" | "Medium" | "Low";
  documentType: string;
  status: "Open" | "Reviewed" | "In Workpaper";
}

export const ENGAGEMENTS = [
  { id: "1", name: "Reliance Industries Ltd.", year: "FY 2024–25", type: "Statutory Audit" },
  { id: "2", name: "Tata Consultancy Services", year: "FY 2024–25", type: "Internal Audit" },
  { id: "3", name: "Infosys Ltd.",              year: "FY 2024–25", type: "Risk Advisory"   },
  { id: "4", name: "HDFC Bank Ltd.",            year: "FY 2023–24", type: "Forensic Audit"  },
];

export default function App() {
  const [user, setUser] = useState<MSUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [selectedFile, setSelectedFile] = useState<SelectedFile | null>(null);
  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisRun | null>(null);

  const [activeEngagement, setActiveEngagement] = useState(ENGAGEMENTS[0]);
  const [engagementOpen, setEngagementOpen] = useState(false);
  const engagementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) setUser(stored);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (engagementRef.current && !engagementRef.current.contains(e.target as Node)) {
        setEngagementOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleLogout = async () => {
    await mockLogout();
    setUser(null);
    setCurrentPage("dashboard");
    setAnalyses([]);
    setSelectedFile(null);
  };

  if (!authChecked) return null;
  if (!user) return <LoginPage onLogin={setUser} />;

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* Global top bar */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 z-20">

        {/* Left: logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full border-2 border-gray-400 flex items-center justify-center">
            <svg width="10" height="10" fill="none" stroke="#6b7280" strokeWidth="2.5" viewBox="0 0 24 24">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>
          <span className="text-sm font-semibold text-gray-800">FraudGuard</span>
        </div>

        {/* Centre: engagement dropdown */}
        <div className="relative" ref={engagementRef}>
          <button
            onClick={() => setEngagementOpen(!engagementOpen)}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-w-[230px] justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
                <svg width="10" height="10" fill="none" stroke="#3b82f6" strokeWidth="2" viewBox="0 0 24 24">
                  <rect x="2" y="7" width="20" height="14" rx="2"/>
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
                </svg>
              </div>
              <span className="font-medium truncate">{activeEngagement.name}</span>
            </div>
            <svg
              width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
              className={`shrink-0 transition-transform duration-150 ${engagementOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>

          {/* Dropdown panel */}
          {engagementOpen && (
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50">
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Switch Engagement</p>
              </div>

              {ENGAGEMENTS.map((eng) => {
                const isActive = activeEngagement.id === eng.id;
                return (
                  <button
                    key={eng.id}
                    onClick={() => { setActiveEngagement(eng); setEngagementOpen(false); }}
                    className={`w-full px-4 py-3 text-left flex items-center justify-between transition-colors border-b border-gray-50 last:border-0 ${
                      isActive ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${
                        isActive ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-500"
                      }`}>
                        {eng.name.charAt(0)}
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${isActive ? "text-blue-700" : "text-gray-800"}`}>
                          {eng.name}
                        </div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{eng.year} · {eng.type}</div>
                      </div>
                    </div>
                    {isActive && (
                      <svg width="14" height="14" fill="none" stroke="#3b82f6" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    )}
                  </button>
                );
              })}

              
            </div>
          )}
        </div>

        {/* Right: M365 badge + avatar */}
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full font-medium">
            M365 · Connected
          </span>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user.avatar}
          </div>
        </div>
      </header>

      {/* Sidebar + page content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          user={user}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-hidden flex flex-col">
          {currentPage === "dashboard" && (
            <Dashboard
              user={user}
              setCurrentPage={setCurrentPage}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              analyses={analyses}
              onLogout={handleLogout}
              activeEngagement={activeEngagement}
            />
          )}
          {currentPage === "procedures" && (
            <ProceduresLibrary
              selectedFile={selectedFile}
              setCurrentPage={setCurrentPage}
              setAnalyses={setAnalyses}
              setActiveAnalysis={setActiveAnalysis}
            />
          )}
          {currentPage === "analyses" && (
            <MyAnalyses
              analyses={analyses}
              activeAnalysis={activeAnalysis}
              setActiveAnalysis={setActiveAnalysis}
            />
          )}
          {currentPage === "flagged" && <FlaggedItems analyses={analyses} />}
          {currentPage === "settings" && <Settings user={user} />}
        </main>
      </div>
    </div>
  );
}