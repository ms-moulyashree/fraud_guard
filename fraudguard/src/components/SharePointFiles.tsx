/**
 * SharePointFiles.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shown after login. Fetches and displays the signed-in user's SharePoint /
 * OneDrive files via Microsoft Graph. Each user only sees their own files.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useEffect, useState } from "react";
import type { MSUser, SharePointFile } from "../services/authService";
import { getUserFiles } from "../services/authService";

interface Props {
  user: MSUser;
  onLogout: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fileIcon(mimeType: string): string {
  if (mimeType.includes("pdf")) return "📄";
  if (mimeType.includes("word") || mimeType.includes("document")) return "📝";
  if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "📑";
  if (mimeType.includes("image")) return "🖼️";
  if (mimeType.includes("zip") || mimeType.includes("compressed")) return "🗜️";
  return "📁";
}

export default function SharePointFiles({ user, onLogout }: Props) {
  const [files, setFiles] = useState<SharePointFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const result = await getUserFiles();
        setFiles(result);
      } catch (err: any) {
        setError(err.message ?? "Failed to load files.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const filtered = files.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0f1120", color: "white", fontFamily: "system-ui, sans-serif" }}>

      {/* Top bar */}
      <div
        style={{
          backgroundColor: "rgba(18,18,35,0.95)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          padding: "14px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "36px", height: "36px", borderRadius: "50%",
              backgroundColor: "#2563eb",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "12px", fontWeight: 700,
            }}
          >
            {user.avatar}
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>{user.displayName}</div>
            <div style={{ fontSize: "11px", color: "#9ca3af" }}>{user.email}</div>
          </div>
        </div>

        <button
          onClick={onLogout}
          style={{
            backgroundColor: "transparent",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#9ca3af",
            borderRadius: "8px",
            padding: "7px 16px",
            fontSize: "12px",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "white")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "#9ca3af")}
        >
          Sign out
        </button>
      </div>

      {/* Main content */}
      <div style={{ maxWidth: "900px", margin: "0 auto", padding: "40px 24px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "4px" }}>
          My SharePoint Files
        </h2>
        <p style={{ color: "#9ca3af", fontSize: "13px", marginBottom: "28px" }}>
          Files from your Microsoft 365 account · {user.email}
        </p>

        {/* Search */}
        <input
          type="text"
          placeholder="Search files…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            width: "100%",
            boxSizing: "border-box",
            backgroundColor: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "10px",
            color: "white",
            fontSize: "14px",
            padding: "11px 16px",
            marginBottom: "20px",
            outline: "none",
          }}
        />

        {/* States */}
        {loading && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
            <svg style={{ animation: "spin 1s linear infinite", width: "28px", height: "28px", margin: "0 auto 12px", display: "block" }} fill="none" viewBox="0 0 24 24">
              <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
              <path style={{ opacity: 0.8 }} fill="white" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            Loading your files…
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: "rgba(220,38,38,0.12)",
              border: "1px solid rgba(220,38,38,0.3)",
              borderRadius: "10px",
              padding: "16px 20px",
              color: "#fca5a5",
              fontSize: "13px",
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#6b7280" }}>
            {search ? `No files matching "${search}"` : "No files found in your drive."}
          </div>
        )}

        {/* File list */}
        {!loading && !error && filtered.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {filtered.map((file) => (
              <a
                key={file.id}
                href={file.webUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  backgroundColor: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: "10px",
                  padding: "14px 18px",
                  textDecoration: "none",
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.04)")}
              >
                {/* Icon */}
                <span style={{ fontSize: "24px", flexShrink: 0 }}>{fileIcon(file.mimeType)}</span>

                {/* Details */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "white", fontSize: "14px", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {file.name}
                  </div>
                  <div style={{ color: "#9ca3af", fontSize: "11px", marginTop: "2px" }}>
                    {formatBytes(file.size)} · Modified {formatDate(file.lastModified)}
                  </div>
                </div>

                {/* Download */}
                <a
                  href={file.downloadUrl}
                  download={file.name}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    color: "#60a5fa",
                    fontSize: "11px",
                    textDecoration: "none",
                    padding: "5px 10px",
                    border: "1px solid rgba(96,165,250,0.3)",
                    borderRadius: "6px",
                    flexShrink: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  ↓ Download
                </a>
              </a>
            ))}
          </div>
        )}

        {!loading && !error && files.length > 0 && (
          <p style={{ color: "#4b5563", fontSize: "11px", marginTop: "20px", textAlign: "center" }}>
            Showing {filtered.length} of {files.length} files from your OneDrive / SharePoint
          </p>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}