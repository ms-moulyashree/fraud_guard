/**
 * apiService.ts  (FIXED)
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects FraudGuard frontend to the FastAPI backend.
 * Base URL proxied via Vite → http://localhost:8000/api/v1
 *
 * FIXES applied vs original:
 *  1. ApiFlag.run_id (not analysis_id) — matches backend FlagOut schema
 *  2. ApiFlag query param: run_id (not analysis_id)
 *  3. apiFlagToDetail now maps ALL fields ExtendedFlag needs
 *  4. ApiFlag.auditor_note removed (not in backend schema; use auditor_action)
 *  5. ApiProcedure.risk (not risk_level) — matches backend ProcedureOut schema
 * ─────────────────────────────────────────────────────────────────────────────
 */


const BASE_URL = "/api/v1";

// ─── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = "fraudguard_token";

export class AuthError extends Error {
  status: number;

  constructor(message = "Not authenticated", status = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ─── 401 handler hook ─────────────────────────────────────────────────────────
// Register a callback in App.tsx to redirect to login when any authenticated
// request returns 401. This replaces the tryAutoLogin /auth/me verification —
// we no longer pre-check the token on boot; we react if it's expired on the
// first real API call instead.

type UnauthorizedHandler = () => void;
let _onUnauthorized: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler) {
  _onUnauthorized = fn;
}

// ─── Core fetch helper ────────────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const token = getToken();

  const headers: Record<string, string> = {};

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (body && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
      ? JSON.stringify(body)
      : undefined,
  });

  // ─── AUTH FAILURE ─────────────────────────────────────────────
  if (res.status === 401) {
    // Remove stale token immediately
    clearToken();

    // Redirect app to login screen
    if (_onUnauthorized) {
      _onUnauthorized();
    }

    // Throw special auth error
    throw new AuthError("Session expired or unauthorized", 401);
  }

  // ─── OTHER ERRORS ─────────────────────────────────────────────
  if (!res.ok) {
    const err = await res
      .json()
      .catch(() => ({ detail: res.statusText }));

    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  // ─── NO CONTENT ───────────────────────────────────────────────
  if (res.status === 204) {
    return undefined as T;
  }

  return res.json();
}

// ─── Types (mirrors backend schemas) ─────────────────────────────────────────

export interface ApiUser {
  id: string;
  display_name: string;
  email: string;
  avatar: string;
  tenant_id: string;
  job_title: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: ApiUser;
}

export interface ApiEngagement {
  id: string;
  name: string;
  year: string;
  type: string;
}

export interface ApiFile {
  id: string;
  name: string;
  path: string;
  source: string;
  file_type: string;
  row_count: number | null;
  column_names: string[] | null;
  size_label: string | null;
  site_name: string | null;
  uploaded_at: string;
}

export interface ApiProcedure {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  /** Backend field is "risk" (not "risk_level") — matches ProcedureOut schema */
  risk: string;
  enabled: boolean;
}

export interface ApiProcedureResult {
  id: string;
  procedure_id: string;
  procedure_name: string;
  status: string;
  risk_level: string | null;
  flag_count: number;
}

export interface ApiAnalysis {
  id: string;
  engagement_id: string | null;
  file_name: string;
  file_path: string;
  file_size: string | null;
  row_count: number | null;
  columns: string[];
  started_at: string;
  completed_at: string | null;
  status: string;
  ai_summary: string | null;
  procedures: ApiProcedureResult[];
}

export interface ApiFlag {
  id: string;
  /** Backend uses run_id (not analysis_id) */
  run_id: string;
  procedure_id: string;
  procedure_name: string;
  row_id: string;
  invoice_no: string | null;
  vendor_id: string | null;
  amount: string | null;
  /** Backend field is "date" (not transaction_date) */
  date: string | null;
  reason: string;
  risk_level: string;
  document_type: string | null;
  /** Backend field is "field" (not field_name) */
  field: string | null;
  flagged_value: string | null;
  detection: string | null;
  status: string;
  auditor_action: string;
}

export interface ApiDashboardStats {
  /** Backend field is total_procedures (not total_procedures_run) */
  total_procedures: number;
  /** Backend field is total_flags (not flags_raised) */
  total_flags: number;
  /** Backend field is high_risk (not high_risk_items) */
  high_risk: number;
  files_analysed: number;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    register: (data: {
      display_name: string;
      email: string;
      password: string;
      job_title?: string;
      tenant_id?: string;
    }) => request<LoginResponse>("POST", "/auth/register", data),

    login: async (email: string, password: string): Promise<LoginResponse> => {
      const form = new FormData();
      form.append("username", email);
      form.append("password", password);
      const res = await request<LoginResponse>("POST", "/auth/login", form, true);
      saveToken(res.access_token);
      return res;
    },

    /**
     * Exchange a Microsoft Graph access token (from MSAL redirect) for a
     * FraudGuard backend JWT.
     *
     * Expects the backend to expose: POST /api/v1/auth/ms365
     * Body: { access_token: string }
     * Returns: LoginResponse (same shape as /auth/login)
     *
     * saveToken() is called here so the JWT is stored immediately,
     * consistent with how api.auth.login works.
     */
    ms365Login: async (graphAccessToken: string): Promise<LoginResponse> => {
      const res = await request<LoginResponse>("POST", "/auth/ms365", {
        access_token: graphAccessToken,
      });
      saveToken(res.access_token);
      return res;
    },

    me: () => request<ApiUser>("GET", "/auth/me"),

    logout: () => {
      clearToken();
    },
  },

  // ─── ENGAGEMENTS ───────────────────────────────────────────────────────────

  engagements: {
    list: () => request<ApiEngagement[]>("GET", "/engagements"),
    get: (id: string) => request<ApiEngagement>("GET", `/engagements/${id}`),
    create: (data: { name: string; year: string; type: string }) =>
      request<ApiEngagement>("POST", "/engagements", data),
  },

  // ─── FILES ─────────────────────────────────────────────────────────────────

  files: {
    upload: async (file: File, engagementId?: string): Promise<ApiFile> => {
      const form = new FormData();
      form.append("file", file);
      if (engagementId) form.append("engagement_id", engagementId);
      return request<ApiFile>("POST", "/files/upload", form, true);
    },
    recent: () => request<ApiFile[]>("GET", "/files/recent"),
  },

  // ─── PROCEDURES ────────────────────────────────────────────────────────────

  procedures: {
    list: () => request<ApiProcedure[]>("GET", "/procedures"),
    get: (id: string) => request<ApiProcedure>("GET", `/procedures/${id}`),
  },

  // ─── ANALYSES ──────────────────────────────────────────────────────────────

  analyses: {
    start: (data: {
      file_name: string;
      file_path: string;
      file_size?: string;
      row_count?: number;
      columns: string[];
      procedure_ids: string[];
      engagement_id?: string;
    }) => request<{ run_id: string }>("POST", "/analyses", data),

    uploadAndRun: async (
      file: File,
      procedureIds: string[],
      engagementId?: string
    ): Promise<{ run_id: string }> => {
      const form = new FormData();
      form.append("file", file);
      form.append("procedure_ids", JSON.stringify(procedureIds));
      if (engagementId) form.append("engagement_id", engagementId);
      return request<{ run_id: string }>("POST", "/analyses/upload", form, true);
    },

    get: (runId: string) => request<ApiAnalysis>("GET", `/analyses/${runId}`),

    list: (engagementId?: string) => {
      const qs = engagementId ? `?engagement_id=${engagementId}` : "";
      return request<ApiAnalysis[]>("GET", `/analyses${qs}`);
    },

    poll: async (
      runId: string,
      onUpdate: (run: ApiAnalysis) => void,
      intervalMs = 2000
    ): Promise<ApiAnalysis> => {
      return new Promise((resolve, reject) => {
        const iv = setInterval(async () => {
          try {
            const run = await api.analyses.get(runId);
            onUpdate(run);
            if (run.status === "complete" || run.status === "failed") {
              clearInterval(iv);
              resolve(run);
            }
          } catch (err) {
            clearInterval(iv);
            reject(err);
          }
        }, intervalMs);
      });
    },
  },

  // ─── FLAGS ─────────────────────────────────────────────────────────────────

  flags: {
    /** List flags — use run_id to filter by analysis (backend param is run_id) */
    list: (params?: { run_id?: string; risk_level?: string; status?: string; engagement_id?: string }) => {
      const qs = params
        ? "?" + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v != null) as [string, string][]
          ).toString()
        : "";
      return request<ApiFlag[]>("GET", `/flags${qs}`);
    },

    get: (flagId: string) => request<ApiFlag>("GET", `/flags/${flagId}`),

    update: (
      flagId: string,
      data: { auditor_action?: string; status?: string }
    ) => request<ApiFlag>("PATCH", `/flags/${flagId}`, data),
  },

  // ─── DASHBOARD ─────────────────────────────────────────────────────────────

  dashboard: {
    stats: (engagementId?: string) => {
      const qs = engagementId ? `?engagement_id=${engagementId}` : "";
      return request<ApiDashboardStats>("GET", `/dashboard/stats${qs}`);
    },

    recent: (engagementId?: string, limit = 10) => {
      const params = new URLSearchParams({ limit: String(limit) });
      if (engagementId) params.set("engagement_id", engagementId);
      return request<ApiAnalysis[]>("GET", `/dashboard/recent?${params}`);
    },
  },

  // ─── EXPORT ────────────────────────────────────────────────────────────────

  export: {
    run: async (runId: string): Promise<Blob> => {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/export/run/${runId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
      return res.blob();
    },

    download: async (runId: string, fileName = "fraudguard_export.xlsx") => {
      const blob = await api.export.run(runId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
    },
  },
};

// ─── Helpers to convert API types → App types ─────────────────────────────────

import type { AnalysisRun, ProcedureResult, FlagDetail } from "../App";
import type { MSUser } from "./authService";

export function apiUserToMSUser(u: ApiUser): MSUser {
  return {
    id: u.id,
    displayName: u.display_name,
    email: u.email,
    avatar: u.avatar,
    tenantId: u.tenant_id,
    jobTitle: u.job_title ?? "",
  };
}

export function apiAnalysisToRun(a: ApiAnalysis): AnalysisRun {
  return {
    id: a.id,
    fileName: a.file_name,
    startedAt: new Date(a.started_at).toLocaleTimeString(),
    status:
      a.status === "complete"
        ? "complete"
        : a.status === "failed"
        ? "failed"
        : "running",
    aiSummary: a.ai_summary ?? "",
    procedures: a.procedures.map(
      (p): ProcedureResult => ({
        id: p.procedure_id,
        name: p.procedure_name,
        status: p.status as ProcedureResult["status"],
        riskLevel: (p.risk_level as ProcedureResult["riskLevel"]) ?? null,
        flagCount: p.flag_count,
      })
    ),
  };
}

/**
 * apiFlagToDetail — maps ALL fields expected by FlaggedItems.tsx (ExtendedFlag).
 * Backend returns: id, run_id, procedure_id, procedure_name, row_id,
 *   invoice_no, vendor_id, amount, date, reason, risk_level, document_type,
 *   field, flagged_value, detection, status, auditor_action
 */
export function apiFlagToDetail(
  f: ApiFlag
): FlagDetail & {
  id: string;
  procedure: string;
  field: string;
  flaggedValue: string;
  detection: string;
  auditorAction: string;
} {
  return {
    // FlagDetail base
    rowId: f.row_id,
    invoiceNo: f.invoice_no ?? "",
    vendorId: f.vendor_id ?? "",
    amount: f.amount ?? "",
    date: f.date ?? "",
    reason: f.reason,
    riskLevel: f.risk_level as FlagDetail["riskLevel"],
    documentType: f.document_type ?? "AP Invoice",
    status: f.status as FlagDetail["status"],
    // ExtendedFlag extras
    id: f.id,
    procedure: f.procedure_name,
    field: f.field ?? "",
    flaggedValue: f.flagged_value ?? "",
    detection: f.detection ?? "Rule-based",
    auditorAction: f.auditor_action ?? "Unreviewed",
  };
}