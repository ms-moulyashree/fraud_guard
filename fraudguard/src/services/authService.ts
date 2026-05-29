/**
 * services/authService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Handles MS365/Azure AD authentication + FastAPI JWT token management
 * Uses loginRedirect (not popup) for better UX
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PublicClientApplication } from "@azure/msal-browser";
import type { AccountInfo } from "@azure/msal-browser";
import { msalConfig, loginRequest, graphRequest } from "./msalConfig";
import { api, apiUserToMSUser, saveToken, clearToken, getToken } from "./apiService";

// ── Types ──────────────────────────────────────────────────────────────────

export interface MSUser {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  tenantId: string;
  jobTitle: string;
}

export interface SharePointFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  lastModified: string;
  mimeType: string;
  downloadUrl: string;
}

// ── Constants ──────────────────────────────────────────────────────────────

export const GRAPH_SCOPES = ["User.Read", "Files.Read.All", "Sites.Read.All"];
const SESSION_KEY = "fraudguard_user";

// ── Demo Accounts (for testing without MS365) ───────────────────────────

const DEMO_ACCOUNTS = [
  {
    email: "priya.sharma@company.com",
    name: "Priya Sharma",
    role: "Audit Manager",
    avatar: "PS",
  },
  {
    email: "rahul.verma@company.com",
    name: "Rahul Verma",
    role: "Finance Controller",
    avatar: "RV",
  },
];
const DEMO_PASSWORD = "Demo@1234";

// ── MSAL Instance ──────────────────────────────────────────────────────────

export const msalInstance = new PublicClientApplication(msalConfig);

let _initialized = false;

async function ensureInitialized() {
  if (_initialized) return;
  await msalInstance.initialize();
  _initialized = true;
}

// ── Helper Functions ───────────────────────────────────────────────────────

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function accountToMSUser(account: AccountInfo): MSUser {
  return {
    id: account.localAccountId,
    displayName: account.name ?? account.username,
    email: account.username,
    avatar: getInitials(account.name ?? account.username),
    tenantId: account.tenantId,
    jobTitle: "",
  };
}

function persistUser(user: MSUser) {
  const json = JSON.stringify(user);
  sessionStorage.setItem(SESSION_KEY, json);
  localStorage.setItem(SESSION_KEY, json);
}

function clearUser() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  clearToken(); // FIX: use clearToken() from apiService (shared key)
}

// ── Token Management ───────────────────────────────────────────────────────
// FIX: Removed separate JWT_TOKEN_KEY / saveJWTToken / clearJWTToken.
// Delegating to saveToken / getToken / clearToken from apiService so
// both files share one localStorage key and never get out of sync.

/** @deprecated — use getToken() from apiService directly */
export function getJWTToken(): string | null {
  return getToken();
}

// ── Get Stored Session ─────────────────────────────────────────────────────

export function getStoredSession(): MSUser | null {
  // FIX: Check localStorage FIRST — written by mockLogin (demo accounts).
  // Old code checked MSAL first, so demo sessions were invisible on refresh.
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) ?? sessionStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) return accountToMSUser(accounts[0]);

  return null;
}

export function getCurrentUser(): MSUser | null {
  return getStoredSession();
}

// ── Microsoft SSO Login (Redirect Flow) ────────────────────────────────────

/**
 * Initiate MS365 login using loginRedirect (not popup).
 * User is redirected to Microsoft, then back to app with #code= in URL.
 * tryAutoLogin() on app load will catch the redirect and complete auth.
 */
export async function loginWithMicrosoft(): Promise<void> {
  await ensureInitialized();
  // FIX: Do NOT use window.location.href here — that sends the user back to
  // the Login page after Microsoft authenticates them, which can trigger
  // logout() before handleRedirectPromise() has a chance to complete.
  // Always redirect to the app root; the router will forward to dashboard
  // once tryAutoLogin() returns a valid user.
  await msalInstance.loginRedirect({
    ...loginRequest,
    redirectStartPage: window.location.origin + "/",
    prompt: "select_account"
  });
}

// ── Auto-Login (called on every app load) ─────────────────────────────────

/**
 * Try to restore session from:
 * 1. Microsoft redirect (after loginWithMicrosoft)
 * 2. Existing MSAL session (silent token refresh)
 * 3. localStorage (demo login that survived a page refresh)
 *
 * IMPORTANT — do NOT call /auth/me here to "verify" the token.
 * That creates a catch-22: /auth/me itself needs the token, so any
 * transient backend error causes the catch block to wipe a perfectly
 * valid session. Instead, trust the token that's already in localStorage
 * (written by saveToken() during login). If it later turns out to be
 * expired, the first real API call will 401 and the app can redirect to
 * login at that point — without having already nuked the session on boot.
 */
export async function tryAutoLogin(): Promise<MSUser | null> {
  await ensureInitialized();

  // 1. Handle Microsoft redirect with #code= in URL
  try {
    const redirectResult = await msalInstance.handleRedirectPromise();
  if (redirectResult?.account) {
      const user = accountToMSUser(redirectResult.account);
      persistUser(user);

      try {
        let graphToken = redirectResult.accessToken;
        try {
          const fullToken = await msalInstance.acquireTokenSilent({
            ...graphRequest,
            account: redirectResult.account,
          });
          graphToken = fullToken.accessToken;
        } catch {
          // use redirect token as fallback
        }
        const res = await api.auth.microsoftLogin(graphToken);
        saveToken(res.access_token);
        console.log("Backend JWT created successfully");
      } catch (err) {
        console.warn("Backend JWT exchange failed:", err);
      }

      return user;
    }
  } catch (err: any) {
    // FIX: Distinguish a real auth error from a benign MSAL init issue.
    // "hash_empty_error" just means there was no redirect to process — safe
    // to ignore. Any other error (state mismatch, invalid_grant, etc.) means
    // the redirect was corrupted; clear storage so the user can try again
    // cleanly instead of being silently stuck.
    const isNoRedirect =
      err?.errorCode === "hash_empty_error" ||
      err?.message?.includes("no_cached_state");
    if (!isNoRedirect) {
      console.error("handleRedirectPromise real error — clearing state:", err);
      // Clear only MSAL-related storage; leave JWT/demo session intact
      try { msalInstance.clearCache(); } catch {}
    } else {
      console.warn("handleRedirectPromise (no redirect, non-fatal):", err);
    }
  }

  // 2. Silent token refresh for existing MSAL session
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const tokenRes = await msalInstance.acquireTokenSilent({
        ...graphRequest,
        account: accounts[0],
      });
      // If no backend JWT, exchange MS token for one now
      if (!getToken()) {
        try {
          const res = await api.auth.microsoftLogin(tokenRes.accessToken);
          saveToken(res.access_token);
          console.log("Backend JWT refreshed successfully");
        } catch (err) {
          console.warn("Backend JWT refresh failed:", err);
        }
      }
      return accountToMSUser(accounts[0]);
    } catch {
      // Token expired — fall through
    }
  }

  // 3. Restore demo/JWT session from localStorage.
  // Trust the stored JWT — do NOT verify with /auth/me here (see note above).
  // If the JWT is expired, the next authenticated API call will 401 and the
  // app's global error handler should redirect to login at that point.
  try {
  const raw =
    localStorage.getItem(SESSION_KEY) ??
    sessionStorage.getItem(SESSION_KEY);

  // Restore stored session immediately.
  // JWT may or may not exist yet (MS SSO users can still be valid).
  const token = getToken();

if (raw && token) {
  return JSON.parse(raw) as MSUser;
}

// Session exists but JWT missing
if (raw && !token) {
  console.warn("Stored session found but JWT missing");
  clearUser();
}
} catch {
  // Corrupted storage — clear and force re-login.
  clearUser();
}

  return null;
}

// ── Demo Account Login ─────────────────────────────────────────────────────

/**
 * Login with demo account (for development/testing).
 *
 * FIX: Now uses api.auth.login / api.auth.register from apiService which
 * hit the correct endpoints (/api/v1/auth/login, /api/v1/auth/register).
 * Old code called /api/auth/login (missing /v1) and passed "username" in
 * the register body (backend expects "display_name").
 */
export async function mockLogin(emailHint?: string): Promise<MSUser> {
  const email = emailHint ?? DEMO_ACCOUNTS[0].email;
  const demoAccount = DEMO_ACCOUNTS.find((a) => a.email === email);

  if (!demoAccount) {
    throw new Error(`Unknown demo account: ${email}`);
  }

  try {
    // api.auth.login calls saveToken() internally — JWT stored immediately
    const res = await api.auth.login(email, DEMO_PASSWORD);
    const user = apiUserToMSUser(res.user);
    persistUser(user);
    return user;
  } catch (loginErr: any) {
    // Account doesn't exist yet — register it first
    if (
  loginErr.message === "Invalid credentials" ||
  loginErr.status === 401 ||
  loginErr.status === 422
)  {
      try {
        const res = await api.auth.register({
          display_name: demoAccount.name,  // FIX: was "username", backend needs "display_name"
          email: demoAccount.email,
          password: DEMO_PASSWORD,
          job_title: demoAccount.role,
          tenant_id: "demo-tenant",
        });
        saveToken(res.access_token);
        const user = apiUserToMSUser(res.user);
        persistUser(user);
        return user;
      } catch (regErr: any) {
        throw new Error(`Registration failed: ${regErr.message}`);
      }
    }
    throw new Error(`Demo login failed: ${loginErr.message}`);
  }
}

// ── Logout ──────────────────────────────────────────────────────────────────

/**
 * Logout user:
 * 1. Clear local session + JWT
 * 2. Sign out from MSAL if active (redirects away)
 *
 * FIX: Removed backend /auth/logout call — endpoint doesn't exist.
 * JWT auth is stateless; clearing the token locally is sufficient.
 */
export async function logout(): Promise<void> {
  await ensureInitialized();

  // FIX: If Microsoft just redirected back with #code= or #error= in the URL,
  // we are mid-authentication. Calling logoutRedirect() here would navigate
  // to the Microsoft "You signed out" page and destroy the active login flow.
  // Let handleRedirectPromise() in tryAutoLogin() finish first.
  // MSAL auth-code flow uses query params (?code= / ?state=)
// while older implicit flows may still use hash fragments.
// Block logout while redirect auth is still completing.
const search = window.location.search;
const hash = window.location.hash;

if (
  search.includes("code=") ||
  search.includes("state=") ||
  search.includes("error=") ||
  hash.includes("id_token=") ||
  hash.includes("error=")
) {
  console.warn("logout() blocked — redirect in progress");
  return;
}

  clearUser();

  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      await msalInstance.logoutRedirect({ account: accounts[0] });
      // navigates away — code below won't run
    } catch (error) {
      console.error("MSAL logout error:", error);
    }
  }
  // FIX: If there are no MSAL accounts (demo/JWT user), just clearing local
  // storage is enough. Never call logoutRedirect() with no account — that
  // sends the user to the Microsoft "signed out" page for no reason.
}

// ── Get Access Token ────────────────────────────────────────────────────────

export async function getAccessToken(): Promise<string> {
  await ensureInitialized();

  // Prefer backend JWT (set by demo login)
  const jwtToken = getToken();
  if (jwtToken) return jwtToken;

  // Fall back to MSAL token (MS SSO users)
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length > 0) {
    try {
      const result = await msalInstance.acquireTokenSilent({
        ...graphRequest,
        account: accounts[0],
      });
      return result.accessToken;
    } catch (error) {
      console.error("Error acquiring token:", error);
    }
  }

  throw new Error("Not authenticated");
}

// ── Graph API Helpers ──────────────────────────────────────────────────────

async function getGraphToken(): Promise<string> {
  await ensureInitialized();
  const accounts = msalInstance.getAllAccounts();
  if (accounts.length === 0) {
    throw new Error("SharePoint files require a real Microsoft login.");
  }
  const result = await msalInstance.acquireTokenSilent({
    ...graphRequest,
    account: accounts[0],
  });
  return result.accessToken;
}

export async function getUserFiles(folderId?: string): Promise<SharePointFile[]> {
  const token = await getGraphToken();
  const endpoint = folderId
    ? `https://graph.microsoft.com/v1.0/me/drive/items/${folderId}/children`
    : `https://graph.microsoft.com/v1.0/me/drive/root/children`;

  const res = await fetch(
    `${endpoint}?$select=id,name,size,webUrl,lastModifiedDateTime,file,@microsoft.graph.downloadUrl&$top=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Graph API error: ${err.error?.message}`);
  }

  const data = await res.json();
  return (data.value as any[])
    .filter((i) => i.file)
    .map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size ?? 0,
      webUrl: item.webUrl,
      lastModified: item.lastModifiedDateTime,
      mimeType: item.file?.mimeType ?? "application/octet-stream",
      downloadUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
    }));
}

export async function getSiteFiles(
  siteId: string,
  driveId?: string
): Promise<SharePointFile[]> {
  const token = await getGraphToken();
  const base = driveId
    ? `https://graph.microsoft.com/v1.0/sites/${siteId}/drives/${driveId}/root/children`
    : `https://graph.microsoft.com/v1.0/sites/${siteId}/drive/root/children`;

  const res = await fetch(
    `${base}?$select=id,name,size,webUrl,lastModifiedDateTime,file,@microsoft.graph.downloadUrl&$top=50`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`Graph API error: ${err.error?.message}`);
  }

  const data = await res.json();
  return (data.value as any[])
    .filter((i) => i.file)
    .map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size ?? 0,
      webUrl: item.webUrl,
      lastModified: item.lastModifiedDateTime,
      mimeType: item.file?.mimeType ?? "application/octet-stream",
      downloadUrl: item["@microsoft.graph.downloadUrl"] ?? item.webUrl,
    }));
}