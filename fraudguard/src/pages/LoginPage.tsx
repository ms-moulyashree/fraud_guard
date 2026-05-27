import { useState } from "react";
import logo from "../assets/logo.png";
import { mockLogin, type MSUser } from "../services/authService";

interface LoginPageProps {
  onLogin: (user: MSUser) => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);

  const handleMSLogin = async (email?: string) => {
    setLoading(true);
    setLoadingEmail(email ?? null);
    try {
      const user = await mockLogin(email);
      onLogin(user);
    } finally {
      setLoading(false);
      setLoadingEmail(null);
    }
  };

  const demoAccounts = [
  
    { email: "priya.sharma@company.com", name: "Priya Sharma", role: "Audit Manager", avatar: "PS" },
    { email: "rahul.verma@company.com", name: "Rahul Verma", role: "Finance Controller", avatar: "RV" },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80')`,
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {/* Dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.62)",
        }}
      />

      {/* Card */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          width: "100%",
          maxWidth: "440px",
          margin: "0 16px",
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(18, 18, 35, 0.92)",
            backdropFilter: "blur(12px)",
            borderRadius: "20px",
            padding: "40px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          {/* Logo */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              marginBottom: "24px",
            }}
          >
            <img
              src={logo}
              alt="Varma & Varma"
              style={{
                width: "92px",
                height: "92px",
                objectFit: "contain",
                borderRadius: "50%",
                boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
                backgroundColor: "white",
              }}
            />
          </div>
          {/* Title */}
          <h1 style={{ color: "white", fontSize: "24px", fontWeight: 700, textAlign: "center", marginBottom: "6px" }}>
            Sign in to FraudGuard
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", marginBottom: "32px" }}>
            Varma &amp; Varma
          </p>

          {/* Microsoft button */}
          <button
            onClick={() => handleMSLogin()}
            disabled={loading}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "10px",
              backgroundColor: "#2a2a45",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "white",
              fontWeight: 500,
              fontSize: "14px",
              padding: "12px",
              borderRadius: "10px",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
              marginBottom: "16px",
              transition: "background 0.2s",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#32324f")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#2a2a45")}
          >
            <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            {loading && !loadingEmail ? "Signing in..." : "Continue with Microsoft 365"}
          </button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
            <span style={{ color: "#6b7280", fontSize: "12px" }}>or select demo account</span>
            <div style={{ flex: 1, height: "1px", backgroundColor: "rgba(255,255,255,0.08)" }} />
          </div>

          {/* Demo accounts */}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {demoAccounts.map((acc) => (
              <button
                key={acc.email}
                onClick={() => handleMSLogin(acc.email)}
                disabled={loading}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  backgroundColor: "rgba(42,42,69,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: "10px",
                  padding: "12px 16px",
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.5 : 1,
                  textAlign: "left",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#32324f")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "rgba(42,42,69,0.6)")}
              >
                {/* Avatar */}
                <div
                  style={{
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    backgroundColor: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "white",
                    fontSize: "11px",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {acc.avatar}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: "white", fontSize: "13px", fontWeight: 600 }}>{acc.name}</div>
                  <div style={{ color: "#9ca3af", fontSize: "11px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {acc.email} · {acc.role}
                  </div>
                </div>

                {/* Arrow or spinner */}
                {loadingEmail === acc.email ? (
                  <svg style={{ animation: "spin 1s linear infinite", width: "16px", height: "16px", color: "#60a5fa" }} fill="none" viewBox="0 0 24 24">
                    <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path style={{ opacity: 0.75 }} fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                ) : (
                  <svg width="14" height="14" fill="none" stroke="#6b7280" strokeWidth="2" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                )}
              </button>
            ))}
          </div>

          {/* Footer */}
          <p style={{ textAlign: "center", fontSize: "11px", color: "#6b7280", marginTop: "24px", lineHeight: 1.7 }}>
            🔒 Mock auth — no real Microsoft credentials required.<br />
            Replace{" "}
            <code style={{ backgroundColor: "rgba(255,255,255,0.08)", padding: "1px 6px", borderRadius: "4px", color: "#d1d5db" }}>
              authService.ts
            </code>{" "}
            with MSAL.js for production.
          </p>
        </div>
      </div>

      {/* Spinner keyframe */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}