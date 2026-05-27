/**
 * apiService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real API service — connects FraudGuard frontend to the FastAPI backend.
 * Base URL: http://localhost:8000/api/v1
 *
 * Usage: import { api } from "./apiService"
 * ─────────────────────────────────────────────────────────────────────────────
 */

const BASE_URL = "/api/v1";

// ─── Token storage ────────────────────────────────────────────────────────────

const TOKEN_KEY = "fraudguard_token";

export function saveToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
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
  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (body && !isFormData) headers["Content-Type"] = "application/json";

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: isFormData
      ? (body as FormData)
      : body
      ? JSON.stringify(body)
      : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;

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
  risk_level: string;
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
  analysis_id: string;
  procedure_id: string;
  procedure_name: string;
  detection_method: string;
  row_id: string;
  invoice_no: string | null;
  vendor_id: string | null;
  amount: string | null;
  transaction_date: string | null;
  reason: string;
  risk_level: string;
  document_type: string | null;
  field_name: string | null;
  flagged_value: string | null;
  status: string;
  auditor_action: string;
  auditor_note: string | null;
  created_at: string;
}

export interface ApiDashboardStats {
  total_procedures_run: number;
  flags_raised: number;
  high_risk_items: number;
  files_analysed: number;
}

// ─── AUTH ─────────────────────────────────────────────────────────────────────

export const api = {
  auth: {
    /** Register a new user */
    register: (data: {
  display_name: string;
  email: string;
  password: string;
  job_title?: string;
  tenant_id?: string;   // ← add this line
}) => request<LoginResponse>("POST", "/auth/register", data),

    /** Login — returns token + user */
    login: async (email: string, password: string): Promise<LoginResponse> => {
      // Backend uses OAuth2 form data for login
      const form = new FormData();
      form.append("username", email);
      form.append("password", password);
      const res = await request<LoginResponse>("POST", "/auth/login", form, true);
      saveToken(res.access_token);
      return res;
    },

    /** Get current user from token */
    me: () => request<ApiUser>("GET", "/auth/me"),

    /** Logout — just clears local token */
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
    /** Upload a file (CSV or Excel) */
    upload: async (file: File, engagementId?: string): Promise<ApiFile> => {
      const form = new FormData();
      form.append("file", file);
      if (engagementId) form.append("engagement_id", engagementId);
      return request<ApiFile>("POST", "/files/upload", form, true);
    },

    /** Get recently uploaded files */
    recent: () => request<ApiFile[]>("GET", "/files/recent"),
  },

  // ─── PROCEDURES ────────────────────────────────────────────────────────────

  procedures: {
    list: () => request<ApiProcedure[]>("GET", "/procedures"),

    get: (id: string) => request<ApiProcedure>("GET", `/procedures/${id}`),
  },

  // ─── ANALYSES ──────────────────────────────────────────────────────────────

  analyses: {
    /** Start analysis with an already-uploaded file */
    start: (data: {
      file_name: string;
      file_path: string;
      file_size?: string;
      row_count?: number;
      columns: string[];
      procedure_ids: string[];
      engagement_id?: string;
    }) => request<{ run_id: string }>("POST", "/analyses", data),

    /** Upload file AND start analysis in one call */
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

    /** Get a single analysis run (use for polling) */
    get: (runId: string) => request<ApiAnalysis>("GET", `/analyses/${runId}`),

    /** List all analyses (optionally filter by engagement) */
    list: (engagementId?: string) => {
      const qs = engagementId ? `?engagement_id=${engagementId}` : "";
      return request<ApiAnalysis[]>("GET", `/analyses${qs}`);
    },

    /** Poll until analysis is complete or failed */
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
    /** List all flags, optionally filtered */
    list: (params?: { analysis_id?: string; risk_level?: string; status?: string }) => {
      const qs = params
        ? "?" + new URLSearchParams(
            Object.entries(params).filter(([, v]) => v != null) as [string, string][]
          ).toString()
        : "";
      return request<ApiFlag[]>("GET", `/flags${qs}`);
    },

    /** Get single flag */
    get: (flagId: string) => request<ApiFlag>("GET", `/flags/${flagId}`),

    /** Update a flag (auditor action / status / note) */
    update: (
      flagId: string,
      data: { auditor_action?: string; status?: string; auditor_note?: string }
    ) => request<ApiFlag>("PATCH", `/flags/${flagId}`, data),

    /** Bulk update multiple flags */
    bulkUpdate: (
      flagIds: string[],
      data: { auditor_action?: string; status?: string }
    ) =>
      request<{ updated: number }>("PATCH", `/flags`, { flag_ids: flagIds, ...data }),
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
    /** Download analysis as Excel — returns a Blob */
    run: async (runId: string): Promise<Blob> => {
      const token = getToken();
      const res = await fetch(`${BASE_URL}/export/run/${runId}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error(`Export failed: ${res.statusText}`);
      return res.blob();
    },

    /** Trigger browser download of the Excel file */
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

/** Convert API user → MSUser (used by existing App.tsx) */
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

/** Convert API analysis → AnalysisRun (used by existing App.tsx) */
export function apiAnalysisToRun(a: ApiAnalysis): AnalysisRun {
  return {
    id: a.id,
    fileName: a.file_name,
    startedAt: new Date(a.started_at).toLocaleTimeString(),
    status: a.status === "complete" ? "complete" : a.status === "failed" ? "failed" : "running",
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

/** Convert API flag → FlagDetail (used by FlaggedItems.tsx) */
export function apiFlagToDetail(f: ApiFlag): FlagDetail {
  return {
    rowId: f.row_id,
    invoiceNo: f.invoice_no ?? "",
    vendorId: f.vendor_id ?? "",
    amount: f.amount ?? "",
    date: f.transaction_date ?? "",
    reason: f.reason,
    riskLevel: f.risk_level as FlagDetail["riskLevel"],
    documentType: f.document_type ?? "AP Invoice",
    status: f.status as FlagDetail["status"],
  };
}