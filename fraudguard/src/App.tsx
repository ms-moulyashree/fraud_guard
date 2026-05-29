import { useState, useEffect, useRef } from "react";
import logo from "./assets/logo.png";

import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import ProceduresLibrary from "./pages/ProceduresLibrary";
import MyAnalyses from "./pages/MyAnalyses";
import FlaggedItems from "./pages/FlaggedItems";
import Settings from "./pages/Settings";
import LoginPage from "./pages/LoginPage";

import {
  tryAutoLogin,
  logout,
  type MSUser,
} from "./services/authService";

import {
  api,
  apiAnalysisToRun,
  type ApiEngagement,
  setUnauthorizedHandler,
} from "./services/apiService";

export type Page =
  | "dashboard"
  | "procedures"
  | "analyses"
  | "flagged"
  | "settings";

export interface SelectedFile {
  name: string;
  path: string;
  columns: string[];
  rowCount: number;
  size: string;
  fileObject?: File;
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

export default function App() {
  const [user, setUser] = useState<MSUser | null>(null);
  const [checking, setChecking] = useState(true);

  const [currentPage, setCurrentPage] =
    useState<Page>("dashboard");

  const [selectedFile, setSelectedFile] =
    useState<SelectedFile | null>(null);

  const [analyses, setAnalyses] = useState<AnalysisRun[]>([]);

  const [activeAnalysis, setActiveAnalysis] =
    useState<AnalysisRun | null>(null);

  const [engagements, setEngagements] = useState<
    ApiEngagement[]
  >([]);

  const [activeEngagement, setActiveEngagement] =
    useState<ApiEngagement | null>(null);

  const [engagementOpen, setEngagementOpen] =
    useState(false);

  const engagementRef = useRef<HTMLDivElement>(null);

  // Prevent duplicate API loads during bootstrap
  const isBootstrapping = useRef(false);

  // ─────────────────────────────────────────────────────────────
  // Bootstrap session
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    async function bootstrap() {
      try {
        const restored = await tryAutoLogin();

        if (restored) {
  isBootstrapping.current = true;

  setUser(restored);

  // Only load protected data if JWT exists
  const token = localStorage.getItem("fraudguard_token");

  if (token) {
    await loadEngagements();
  } else {
    console.warn("No backend JWT yet — skipping protected API bootstrap");
  }
}
      } catch (err) {
        console.error("Bootstrap failed:", err);
      } finally {
        isBootstrapping.current = false;
        setChecking(false);
      }
    }

    bootstrap();
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Global 401 Handler
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    setUnauthorizedHandler(async () => {

      // Prevent logout during MS redirect flow
      const search = window.location.search;
      const hash = window.location.hash;

      const authInProgress =
        search.includes("code=") ||
        search.includes("state=") ||
        hash.includes("id_token=") ||
        hash.includes("access_token=");

      if (authInProgress) {
        console.warn("401 ignored during MS redirect");
        return;
      }

      await logout();

      setUser(null);
      setCurrentPage("dashboard");
      setAnalyses([]);
      setSelectedFile(null);
      setActiveAnalysis(null);
      setEngagements([]);
      setActiveEngagement(null);
    });
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Load engagements
  // ─────────────────────────────────────────────────────────────

  async function loadEngagements() {
    try {
      const engagementData = await api.engagements.list();

      setEngagements(engagementData);

      if (engagementData.length > 0) {
        setActiveEngagement(engagementData[0]);

        const analysisData = await api.analyses.list(
          engagementData[0].id
        );

        setAnalyses(
          analysisData.map(apiAnalysisToRun)
        );
      }
    } catch (err) {
      console.error(
        "Failed to load engagements:",
        err
      );
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Called after successful login
  // ─────────────────────────────────────────────────────────────

  const handleLogin = async (
    loggedInUser: MSUser
  ) => {
    isBootstrapping.current = true;

    setUser(loggedInUser);

    const token = localStorage.getItem("fraudguard_token");

if (token) {
  await loadEngagements();
}

    isBootstrapping.current = false;
  };

  // ─────────────────────────────────────────────────────────────
  // Reload analyses on engagement switch
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (
      !user ||
      !activeEngagement ||
      isBootstrapping.current
    ) {
      return;
    }

    api.analyses
      .list(activeEngagement.id)
      .then((data) => {
        setAnalyses(
          data.map(apiAnalysisToRun)
        );
      })
      .catch((err) => {
        console.error(
          "Failed to load analyses:",
          err
        );
      });

  }, [activeEngagement]);

  // ─────────────────────────────────────────────────────────────
  // Close dropdown on outside click
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        engagementRef.current &&
        !engagementRef.current.contains(
          e.target as Node
        )
      ) {
        setEngagementOpen(false);
      }
    }

    document.addEventListener(
      "mousedown",
      handleClick
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleClick
      );
    };
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Logout
  // ─────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await logout();

    setUser(null);
    setCurrentPage("dashboard");
    setAnalyses([]);
    setSelectedFile(null);
    setActiveAnalysis(null);
    setEngagements([]);
    setActiveEngagement(null);
  };

  // ─────────────────────────────────────────────────────────────
  // Loading Spinner
  // ─────────────────────────────────────────────────────────────

  if (checking) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0f1120",
        }}
      >
        <svg
          style={{
            animation: "spin 1s linear infinite",
            width: "32px",
            height: "32px",
          }}
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            style={{ opacity: 0.2 }}
            cx="12"
            cy="12"
            r="10"
            stroke="white"
            strokeWidth="4"
          />
          <path
            style={{ opacity: 0.8 }}
            fill="white"
            d="M4 12a8 8 0 018-8v8z"
          />
        </svg>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Not logged in
  // ─────────────────────────────────────────────────────────────

  if (!user) {
    return (
      <LoginPage onLogin={handleLogin} />
    );
  }

  // ─────────────────────────────────────────────────────────────
  // Main App
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden">

      {/* TOP BAR */}
      <header className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-5 shrink-0 z-20">

        {/* LEFT */}
        <div className="flex items-center gap-3">
          <img
            src={logo}
            alt="Logo"
            className="w-9 h-9 rounded-full object-cover"
          />

          <span className="text-sm font-semibold text-gray-800">
            FraudGuard
          </span>
        </div>

        {/* CENTER */}
        <div
          className="relative"
          ref={engagementRef}
        >
          <button
            onClick={() =>
              setEngagementOpen(!engagementOpen)
            }
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors min-w-[230px] justify-between"
          >
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center shrink-0">
                <svg
                  width="10"
                  height="10"
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <rect
                    x="2"
                    y="7"
                    width="20"
                    height="14"
                    rx="2"
                  />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </div>

              <span className="font-medium truncate">
                {activeEngagement?.name ||
                  "Select Engagement"}
              </span>
            </div>

            <svg
              width="12"
              height="12"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
              className={`shrink-0 transition-transform duration-150 ${
                engagementOpen
                  ? "rotate-180"
                  : ""
              }`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>

        {/* RIGHT */}
        <div className="flex items-center gap-3">
          <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-2 py-1 rounded-full font-medium">
            M365 · Connected
          </span>

          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
            {user.avatar}
          </div>
        </div>
      </header>

      {/* MAIN */}
      <div className="flex flex-1 overflow-hidden">

        <Sidebar
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          user={user}
          onLogout={handleLogout}
          selectedFile={selectedFile}
          flagCount={analyses.reduce((acc, a) => acc + a.procedures.reduce((s, p) => s + p.flagCount, 0), 0)}
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
              activeEngagement={activeEngagement}
            />
          )}

          {currentPage === "analyses" && (
    <MyAnalyses
      analyses={analyses}
      activeAnalysis={activeAnalysis}
      setActiveAnalysis={setActiveAnalysis}
      setAnalyses={setAnalyses}
    />
  )}

          {currentPage === "flagged" && (
            <FlaggedItems analyses={analyses} />
          )}

          {currentPage === "settings" && (
            <Settings user={user} />
          )}

        </main>
      </div>
    </div>
  );
}