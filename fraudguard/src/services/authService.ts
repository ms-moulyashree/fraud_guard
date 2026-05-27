/**
 * authService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real auth service — talks to FastAPI backend.
 * Keeps the same interface as the mock so App.tsx needs minimal changes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { api, apiUserToMSUser, saveToken, clearToken, getToken } from "./apiService";

export interface MSUser {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  tenantId: string;
  jobTitle: string;
}

export const GRAPH_SCOPES = ["User.Read", "Files.Read.All", "Sites.Read.All"];

export const MSAL_CONFIG = {
  clientId: "YOUR_AZURE_CLIENT_ID",
  authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
  redirectUri: window.location.origin,
};

// ─── Session ──────────────────────────────────────────────────────────────────

const SESSION_KEY = "fraudguard_user";

function persistUser(user: MSUser) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function clearUser() {
  sessionStorage.removeItem(SESSION_KEY);
  clearToken();
}

export function getStoredSession(): MSUser | null {
  // Check if we have a token first
  if (!getToken()) return null;
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser(): MSUser | null {
  return getStoredSession();
}

// ─── Demo accounts (these must exist in your DB) ──────────────────────────────
// These are pre-seeded accounts. Password is "Demo@1234" for all.
const DEMO_ACCOUNTS = [
 
  { email: "priya.sharma@company.com", name: "Priya Sharma", role: "Audit Manager",      avatar: "PS" },
  { email: "rahul.verma@company.com",  name: "Rahul Verma",  role: "Finance Controller", avatar: "RV" },
];

const DEMO_PASSWORD = "Demo@1234";

// ─── Auth functions ───────────────────────────────────────────────────────────

/**
 * Login with email + password.
 * Falls back to auto-register if user doesn't exist yet (for demo accounts).
 */
export async function mockLogin(emailHint?: string): Promise<MSUser> {
  const email = emailHint ?? DEMO_ACCOUNTS[0].email;
  const demoAccount = DEMO_ACCOUNTS.find((a) => a.email === email);

  try {
    const res = await api.auth.login(email, DEMO_PASSWORD);
    // ✅ remove saveToken here — apiService.login already does it
    const user = apiUserToMSUser(res.user);
    persistUser(user);
    return user;
  } catch (loginErr: any) {
    // Only auto-register if it's specifically a 401 (user doesn't exist yet)
    // and we have a known demo account
    if (demoAccount && loginErr.message === "Invalid credentials") {
      try {
        const res = await api.auth.register({
          display_name: demoAccount.name,
          email: demoAccount.email,
          password: DEMO_PASSWORD,
          job_title: demoAccount.role,
          tenant_id: "demo-tenant",   // ← ADD THIS, backend requires it
        });
        saveToken(res.access_token);
        const user = apiUserToMSUser(res.user);
        persistUser(user);
        return user;
      } catch (regErr: any) {
        throw new Error(`Registration failed: ${regErr.message}`);
      }
    }
    throw new Error(`Login failed: ${loginErr.message}`);
  }
}

/** Logout */
export async function mockLogout(): Promise<void> {
  api.auth.logout();
  clearUser();
}

/** Get access token (for Graph API calls if needed) */
export async function getAccessToken(): Promise<string> {
  const token = getToken();
  if (!token) throw new Error("Not authenticated");
  return token;
}