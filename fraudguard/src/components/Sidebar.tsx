import React, { useState } from "react";
import type { Page } from "../App";
import type { MSUser } from "../services/authService";

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  user: MSUser;
  onLogout: () => void;
  selectedFile: { name: string } | null;
  flagCount?: number;
}

const navItems: { id: Page; label: string; requiresFile: boolean; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    requiresFile: false,
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "procedures",
    label: "Procedures Library",
    requiresFile: true,
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "analyses",
    label: "My Analyses",
    requiresFile: true,
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "flagged",
    label: "Flagged Items",
    requiresFile: true,
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    requiresFile: false,
    icon: (
      <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({ currentPage, setCurrentPage, user, onLogout, selectedFile, flagCount = 0 }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [tooltip, setTooltip] = useState<string | null>(null);

  const handleLogout = async () => {
    setLoggingOut(true);
    await onLogout();
  };

  return (
    <aside className={`${collapsed ? "w-[72px]" : "w-[210px]"} bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300`}>

      {/* TOP */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-3">
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-all"
        >
          {collapsed ? (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* NAV */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navItems.map((item) => {
          const locked = item.requiresFile && !selectedFile;
          const isActive = currentPage === item.id;

          return (
            <div key={item.id} className="relative">
              <button
                onClick={() => {
                  if (!locked) setCurrentPage(item.id);
                }}
                onMouseEnter={() => locked ? setTooltip(item.id) : null}
                onMouseLeave={() => setTooltip(null)}
                disabled={locked}
                className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center ${
                  collapsed ? "justify-center" : "gap-3"
                } text-[13px] transition-all duration-150 ${
                  locked
                    ? "text-gray-300 cursor-not-allowed"
                    : isActive
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span className={locked ? "text-gray-300" : isActive ? "text-blue-600" : "text-gray-400"}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {item.id === "flagged" && !locked && flagCount > 0 && (
                      <span className="ml-auto bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                        {flagCount}
                      </span>
                    )}
                    {locked && (
                      <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="text-gray-300 shrink-0">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                        <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                      </svg>
                    )}
                  </>
                )}
              </button>

              {/* Tooltip on hover when locked */}
              {tooltip === item.id && locked && !collapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 bg-gray-800 text-white text-[11px] px-2 py-1 rounded whitespace-nowrap z-50 pointer-events-none">
                  Select a file first
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* USER + LOGOUT */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2"}`}>
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {user.avatar}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-gray-700 truncate">
                {user.displayName.split(" ")[0]}
              </div>
              <div className="text-[10px] text-gray-400 truncate">{user.jobTitle}</div>
            </div>
          )}
        </div>

        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Sign out"
          className={`mt-3 w-full flex items-center ${
            collapsed ? "justify-center px-0" : "gap-2 px-3"
          } py-2 rounded-lg text-[12px] font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50`}
        >
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" className="shrink-0">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
          </svg>
          {!collapsed && (loggingOut ? "Signing out…" : "Sign out")}
        </button>

        {!collapsed && (
          <div className="mt-2 text-[10px] text-gray-300">FRAUDGUARD · Version 2.1.0</div>
        )}
      </div>
    </aside>
  );
}