/**
 * authService.ts
 * -------------------------------------------------
 * MOCK implementation — mirrors real MSAL.js API so
 * swapping to real auth is just replacing this file.
 *
 * TO REPLACE WITH REAL MSAL:
 *   npm install @azure/msal-browser @azure/msal-react
 *   Replace mockLogin / mockLogout with:
 *     msalInstance.loginPopup({ scopes: GRAPH_SCOPES })
 *     msalInstance.logoutPopup()
 *   Replace getAccessToken with:
 *     msalInstance.acquireTokenSilent({ scopes: GRAPH_SCOPES })
 * -------------------------------------------------
 */

export interface MSUser {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  tenantId: string;
  jobTitle: string;
}

// Real scopes you'll need when switching to MSAL
export const GRAPH_SCOPES = [
  "User.Read",
  "Files.Read.All",
  "Sites.Read.All",
];

// Azure App Registration details (fill in when going live)
export const MSAL_CONFIG = {
  clientId: "YOUR_AZURE_CLIENT_ID",
  authority: "https://login.microsoftonline.com/YOUR_TENANT_ID",
  redirectUri: window.location.origin,
};

// ─── Mock users (simulate different Microsoft accounts) ───────────────────────
const MOCK_USERS: MSUser[] = [
  {
    id: "usr-001",
    displayName: "Moulya DJ",
    email: "moulya.dj@company.com",
    avatar: "MD",
    tenantId: "tenant-abc-123",
    jobTitle: "Developer",
  },
  {
    id: "usr-002",
    displayName: "Priya Sharma",
    email: "priya.sharma@company.com",
    avatar: "PS",
    tenantId: "tenant-abc-123",
    jobTitle: "Audit Manager",
  },
  {
    id: "usr-003",
    displayName: "Rahul Verma",
    email: "rahul.verma@company.com",
    avatar: "RV",
    tenantId: "tenant-abc-123",
    jobTitle: "Finance Controller",
  },
];

// ─── In-memory session storage (replace with MSAL token cache) ───────────────
let _currentUser: MSUser | null = null;
let _accessToken: string | null = null;

const SESSION_KEY = "auditiq_mock_session";

export function getStoredSession(): MSUser | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      _currentUser = parsed.user;
      _accessToken = parsed.token;
      return _currentUser;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function persistSession(user: MSUser, token: string) {
  _currentUser = user;
  _accessToken = token;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({ user, token }));
}

function clearSession() {
  _currentUser = null;
  _accessToken = null;
  sessionStorage.removeItem(SESSION_KEY);
}

// ─── Auth API (mirrors MSAL interface) ────────────────────────────────────────

/** Simulates Microsoft loginPopup — returns authenticated user */
export async function mockLogin(emailHint?: string): Promise<MSUser> {
  await delay(1400); // simulate OAuth round-trip

  const user =
    MOCK_USERS.find((u) => u.email === emailHint) ?? MOCK_USERS[0];

  const fakeToken = `mock_token_${Math.random().toString(36).slice(2)}`;
  persistSession(user, fakeToken);
  return user;
}

/** Simulates MSAL logoutPopup */
export async function mockLogout(): Promise<void> {
  await delay(400);
  clearSession();
}

/** Simulates acquireTokenSilent */
export async function getAccessToken(): Promise<string> {
  if (!_accessToken) throw new Error("Not authenticated");
  return _accessToken;
}

export function getCurrentUser(): MSUser | null {
  return _currentUser;
}

// ─── Helper ───────────────────────────────────────────────────────────────────
function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}