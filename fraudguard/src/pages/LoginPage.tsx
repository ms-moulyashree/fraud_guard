import { useState } from "react";
import logo from "../assets/logo.png";
import type { MSUser } from "../services/authService";
import { loginWithMicrosoft, mockLogin } from "../services/authService";

interface LoginPageProps {
  onLogin: (user: MSUser) => void;
}

// ── Detect whether this render is the MS redirect-back landing ────────────────
// Only check the URL — MSAL keeps msal.* keys in sessionStorage for the entire
// session (token cache, account info), so a sessionStorage check would fire
// true forever after the first login and must NOT be used here.
// The auth code only appears in the URL once, immediately after MS redirects back.
function isMsalRedirectInProgress(): boolean {
  const hash   = window.location.hash;
  const search = window.location.search;
  // MSAL v2 / AAD v2: ?code=...&state=... in query string
  // MSAL v1 / AAD v1: #id_token=... or #access_token=... in hash
  return (
  search.includes("code=") ||
  search.includes("state=") ||
  search.includes("error=") ||
  hash.includes("id_token=") ||
  hash.includes("access_token=") ||
  hash.includes("error=")
);
}

// ── Silent loading screen shown while App.tsx finishes handleRedirectPromise ──
function RedirectLoadingScreen() {
  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex",
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      backgroundColor: "#0d0d1a",
    }}>
      <svg
        style={{ animation: "spin 1s linear infinite", width: "40px", height: "40px", marginBottom: "20px" }}
        fill="none" viewBox="0 0 24 24"
      >
        <circle style={{ opacity: 0.2 }} cx="12" cy="12" r="10" stroke="#60a5fa" strokeWidth="4" />
        <path style={{ opacity: 0.85 }} fill="#60a5fa" d="M4 12a8 8 0 018-8v8z" />
      </svg>
      <p style={{ color: "#9ca3af", fontSize: "14px", letterSpacing: "0.02em" }}>
        Completing sign-in…
      </p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Guard: if MS just redirected back, render the silent loading screen ──────
  // This prevents the login form (and any stray logout calls) from mounting
  // during the brief window while App.tsx is running handleRedirectPromise().
  if (isMsalRedirectInProgress()) {
    return <RedirectLoadingScreen />;
  }

  // ── Microsoft SSO — redirect mode (same tab, no popup) ────────────────────
  // loginWithMicrosoft() calls loginRedirect() which navigates THIS tab to
  // Microsoft. After auth, MS redirects back and tryAutoLogin() in App.tsx
  // picks up the session via handleRedirectPromise().
  const handleMSLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithMicrosoft(); // navigates away — code below won't run
    } catch (err: any) {
      setError(err?.message ?? "Sign-in failed. Please try again.");
      setLoading(false);
    }
    // setLoading(false) intentionally omitted on success — tab navigates away
    // and the spinner bridges the gap until the redirect fires.
  };

  // ── Demo account login ─────────────────────────────────────────────────────
  const handleDemoLogin = async (email: string) => {
    setError(null);
    setLoadingEmail(email);
    try {
      const user = await mockLogin(email);
      onLogin(user);
    } catch (err: any) {
      setError(err?.message ?? "Demo login failed. Please try again.");
    } finally {
      setLoadingEmail(null);
    }
  };

 

  const anyLoading = loading || !!loadingEmail;

  return (
    <div style={{
      minHeight: "100vh", width: "100%", display: "flex",
      alignItems: "center", justifyContent: "center",
      position: "relative", overflow: "hidden",
      backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80')`,
      backgroundSize: "cover", backgroundPosition: "center",
    }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.62)" }} />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: "440px", margin: "0 16px" }}>
        <div style={{
          backgroundColor: "rgba(18,18,35,0.92)", backdropFilter: "blur(12px)",
          borderRadius: "20px", padding: "40px",
          boxShadow: "0 25px 60px rgba(0,0,0,0.5)",
          border: "1px solid rgba(255,255,255,0.08)",
        }}>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "24px" }}>
            <img src={logo} alt="Varma & Varma" style={{
              width: "92px", height: "92px", objectFit: "contain",
              borderRadius: "50%", boxShadow: "0 10px 30px rgba(59,130,246,0.35)",
              backgroundColor: "white",
            }} />
          </div>

          <h1 style={{ color: "white", fontSize: "24px", fontWeight: 700, textAlign: "center", marginBottom: "6px" }}>
            Sign in to FraudGuard
          </h1>
          <p style={{ color: "#9ca3af", fontSize: "13px", textAlign: "center", marginBottom: "32px" }}>
            Varma &amp; Varma
          </p>

          {error && (
            <div style={{
              backgroundColor: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.35)",
              borderRadius: "8px", padding: "10px 14px", marginBottom: "16px",
              color: "#fca5a5", fontSize: "13px",
            }}>
              {error}
            </div>
          )}

          <button
            onClick={handleMSLogin}
            disabled={anyLoading}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center",
              gap: "10px", backgroundColor: "#2a2a45",
              border: "1px solid rgba(255,255,255,0.12)", color: "white",
              fontWeight: 500, fontSize: "14px", padding: "14px", borderRadius: "10px",
              cursor: anyLoading ? "not-allowed" : "pointer",
              opacity: anyLoading ? 0.6 : 1, marginBottom: "16px", transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { if (!anyLoading) e.currentTarget.style.backgroundColor = "#32324f"; }}
            onMouseLeave={(e) => { if (!anyLoading) e.currentTarget.style.backgroundColor = "#2a2a45"; }}
          >
            {loading ? (
              <svg style={{ animation: "spin 1s linear infinite", width: "20px", height: "20px" }} fill="none" viewBox="0 0 24 24">
                <circle style={{ opacity: 0.25 }} cx="12" cy="12" r="10" stroke="white" strokeWidth="4" />
                <path style={{ opacity: 0.75 }} fill="white" d="M4 12a8 8 0 018-8v8z" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 21 21" fill="none">
                <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
              </svg>
            )}
            {loading ? "Redirecting to Microsoft..." : "Continue with Microsoft 365"}
          </button>

         

          <p style={{ color: "#4b5563", fontSize: "11px", textAlign: "center", marginTop: "20px", lineHeight: "1.6" }}>
            Microsoft 365 login loads your SharePoint files automatically.
          </p>
        </div>
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}