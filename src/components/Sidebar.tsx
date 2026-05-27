import React, { useState } from "react";
import type { Page } from "../App";
import type { MSUser } from "../services/authService";

interface SidebarProps {
  currentPage: Page;
  setCurrentPage: (page: Page) => void;
  user: MSUser;
  onLogout: () => void;
}

const navItems: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
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
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
  {
    id: "analyses",
    label: "My Analyses",
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    id: "flagged",
    label: "Flagged Items",
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
        <line x1="4" y1="22" x2="4" y2="15" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
      <svg
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        viewBox="0 0 24 24"
      >
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function Sidebar({
  currentPage,
  setCurrentPage,
  user,
}: SidebarProps) {
  const initials = user.avatar;

  // ✅ NEW STATE
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`${
        collapsed ? "w-[72px]" : "w-[210px]"
      } bg-white border-r border-gray-200 flex flex-col shrink-0 transition-all duration-300`}
    >
      {/* TOP */}
      <div className="h-14 border-b border-gray-100 flex items-center justify-between px-3">
      

        {/* COLLAPSE BUTTON */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-all"
        >
          {collapsed ? (
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          )}
        </button>
      </div>

      {/* NAV */}
      <nav className="flex-1 py-3 px-2 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setCurrentPage(item.id)}
            className={`w-full text-left px-3 py-2 rounded-lg mb-1 flex items-center ${
              collapsed ? "justify-center" : "gap-3"
            } text-[13px] transition-all duration-150 ${
              currentPage === item.id
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-50"
            }`}
          >
            <span
              className={
                currentPage === item.id
                  ? "text-blue-600"
                  : "text-gray-400"
              }
            >
              {item.icon}
            </span>

            {/* LABEL HIDDEN WHEN COLLAPSED */}
            {!collapsed && (
              <>
                <span>{item.label}</span>

                {item.id === "flagged" && (
                  <span className="ml-auto bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full font-semibold">
                    10
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* USER */}
      <div className="px-3 py-3 border-t border-gray-100">
        <div
          className={`flex items-center ${
            collapsed ? "justify-center" : "gap-2"
          }`}
        >
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-[11px] font-bold shrink-0">
            {initials}
          </div>

          {!collapsed && (
            <div className="min-w-0">
              <div className="text-[11px] font-semibold text-gray-700 truncate">
                {user.displayName.split(" ")[0]}
              </div>

              <div className="text-[10px] text-gray-400 truncate">
                {user.jobTitle}
              </div>
            </div>
          )}
        </div>

        {!collapsed && (
          <div className="mt-2 text-[10px] text-gray-300">
            FRAUDGUARD · Version 2.1.0
          </div>
        )}
      </div>
    </aside>
  );
}