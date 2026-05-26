/**
 * graphService.ts
 * -------------------------------------------------
 * MOCK Microsoft Graph API service.
 * Simulates real Graph endpoints:
 *   GET /me/drive/root/children          → OneDrive root
 *   GET /sites/{id}/drive/root/children  → SharePoint site
 *   GET /me/drive/recent                 → Recent files
 *
 * TO REPLACE WITH REAL GRAPH API:
 *   import { Client } from "@microsoft/microsoft-graph-client"
 *   const client = Client.init({ authProvider: (done) =>
 *     getAccessToken().then(t => done(null, t)) })
 *   const files = await client.api("/me/drive/root/children").get()
 * -------------------------------------------------
 */

import { getAccessToken } from "./authService";

export interface DriveItem {
  id: string;
  name: string;
  path: string;
  size: number;          // bytes
  sizeLabel: string;
  lastModified: string;
  type: "folder" | "excel" | "csv" | "pdf" | "other";
  rowCount?: number;
  columns?: string[];
  source: "onedrive" | "sharepoint";
  siteName?: string;
}

export interface RecentActivity {
  id: string;
  fileName: string;
  filePath: string;
  analyzedAt: string;
  analyzedBy: string;
  procedureCount: number;
  flagCount: number;
  highRiskCount: number;
  status: "complete" | "in-progress" | "failed";
  source: "onedrive" | "sharepoint";
}

export interface SharePointSite {
  id: string;
  name: string;
  url: string;
  drives: SharePointDrive[];
}

export interface SharePointDrive {
  id: string;
  name: string;
  items: DriveItem[];
}

// ─── Mock Graph data ──────────────────────────────────────────────────────────

const MOCK_SHAREPOINT_SITES: SharePointSite[] = [
  {
    id: "site-finance",
    name: "Finance Team",
    url: "https://company.sharepoint.com/sites/Finance",
    drives: [
      {
        id: "drive-fy2425",
        name: "FY2024-25",
        items: [
          {
            id: "item-001",
            name: "AP_Transactions_FY2025.xlsx",
            path: "Finance/FY2024-25/AP_Transactions_FY2025.xlsx",
            size: 2516582,
            sizeLabel: "2.4 MB",
            lastModified: "2025-02-18T10:30:00Z",
            type: "excel",
            rowCount: 4821,
            columns: ["Invoice No","Vendor ID","Vendor Name","Amount (₹)","Date","PO Number","GL Code","Approved By","GST No","PAN"],
            source: "sharepoint",
            siteName: "Finance Team",
          },
          {
            id: "item-002",
            name: "Payroll_Dec2024.xlsx",
            path: "Finance/FY2024-25/Payroll_Dec2024.xlsx",
            size: 1153433,
            sizeLabel: "1.1 MB",
            lastModified: "2025-01-05T08:15:00Z",
            type: "excel",
            rowCount: 1243,
            columns: ["Emp ID","Name","Department","Basic","HRA","PF","TDS","Net Pay","Bank Account","IFSC"],
            source: "sharepoint",
            siteName: "Finance Team",
          },
          {
            id: "item-003",
            name: "GL_Adjustments_Nov.xlsx",
            path: "Finance/FY2024-25/GL_Adjustments_Nov.xlsx",
            size: 911360,
            sizeLabel: "890 KB",
            lastModified: "2024-12-01T16:45:00Z",
            type: "excel",
            rowCount: 782,
            columns: ["Journal ID","Date","Account Code","Debit","Credit","Narration","Posted By","Approved By"],
            source: "sharepoint",
            siteName: "Finance Team",
          },
          {
            id: "item-004",
            name: "Fixed_Assets_Register.xlsx",
            path: "Finance/FY2024-25/Fixed_Assets_Register.xlsx",
            size: 654321,
            sizeLabel: "639 KB",
            lastModified: "2025-01-20T11:00:00Z",
            type: "excel",
            rowCount: 312,
            columns: ["Asset ID","Asset Name","Category","Purchase Date","Cost","Depreciation","WDV","Location"],
            source: "sharepoint",
            siteName: "Finance Team",
          },
        ],
      },
      {
        id: "drive-vendors",
        name: "Vendor Management",
        items: [
          {
            id: "item-005",
            name: "Vendor_Master_Q3.csv",
            path: "Finance/Vendor Management/Vendor_Master_Q3.csv",
            size: 348160,
            sizeLabel: "340 KB",
            lastModified: "2024-10-15T09:00:00Z",
            type: "csv",
            rowCount: 892,
            columns: ["Vendor ID","Vendor Name","PAN","GST Number","Bank Name","Account No","IFSC","Status","Created Date"],
            source: "sharepoint",
            siteName: "Finance Team",
          },
          {
            id: "item-006",
            name: "New_Vendors_FY25.csv",
            path: "Finance/Vendor Management/New_Vendors_FY25.csv",
            size: 102400,
            sizeLabel: "100 KB",
            lastModified: "2025-02-10T14:30:00Z",
            type: "csv",
            rowCount: 47,
            columns: ["Vendor ID","Vendor Name","PAN","GST Number","Onboarded Date","First Invoice Date","Amount"],
            source: "sharepoint",
            siteName: "Finance Team",
          },
        ],
      },
    ],
  },
  {
    id: "site-audit",
    name: "Internal Audit",
    url: "https://company.sharepoint.com/sites/InternalAudit",
    drives: [
      {
        id: "drive-workpapers",
        name: "Workpapers FY25",
        items: [
          {
            id: "item-007",
            name: "Bank_Reconciliation_Q3.xlsx",
            path: "InternalAudit/Workpapers FY25/Bank_Reconciliation_Q3.xlsx",
            size: 430080,
            sizeLabel: "420 KB",
            lastModified: "2025-01-28T13:00:00Z",
            type: "excel",
            rowCount: 234,
            columns: ["Date","Transaction ID","Debit","Credit","Balance","Bank Statement","Book Balance","Difference"],
            source: "sharepoint",
            siteName: "Internal Audit",
          },
          {
            id: "item-008",
            name: "Expense_Claims_Q3.xlsx",
            path: "InternalAudit/Workpapers FY25/Expense_Claims_Q3.xlsx",
            size: 225280,
            sizeLabel: "220 KB",
            lastModified: "2025-02-05T10:00:00Z",
            type: "excel",
            rowCount: 541,
            columns: ["Claim ID","Employee","Date","Category","Amount","Receipt","Approved By","Status"],
            source: "sharepoint",
            siteName: "Internal Audit",
          },
        ],
      },
    ],
  },
];

const MOCK_ONEDRIVE_ITEMS: DriveItem[] = [
  {
    id: "od-001",
    name: "Draft_AP_Analysis_Mar.xlsx",
    path: "OneDrive/My Files/Draft_AP_Analysis_Mar.xlsx",
    size: 819200,
    sizeLabel: "800 KB",
    lastModified: "2025-03-01T09:00:00Z",
    type: "excel",
    rowCount: 1102,
    columns: ["Invoice No","Vendor","Amount","Date","Status"],
    source: "onedrive",
  },
  {
    id: "od-002",
    name: "Petty_Cash_Feb2025.csv",
    path: "OneDrive/My Files/Petty_Cash_Feb2025.csv",
    size: 45056,
    sizeLabel: "44 KB",
    lastModified: "2025-02-28T17:00:00Z",
    type: "csv",
    rowCount: 188,
    columns: ["Date","Description","Amount","Category","Approved By"],
    source: "onedrive",
  },
];

const MOCK_RECENT_ACTIVITY: RecentActivity[] = [
  {
    id: "ra-001",
    fileName: "AP_Transactions_FY2025.xlsx",
    filePath: "Finance/FY2024-25/AP_Transactions_FY2025.xlsx",
    analyzedAt: "2025-03-10T14:30:00Z",
    analyzedBy: "Moulya DJ",
    procedureCount: 8,
    flagCount: 10,
    highRiskCount: 4,
    status: "complete",
    source: "sharepoint",
  },
  {
    id: "ra-002",
    fileName: "Payroll_Dec2024.xlsx",
    filePath: "Finance/FY2024-25/Payroll_Dec2024.xlsx",
    analyzedAt: "2025-03-08T11:15:00Z",
    analyzedBy: "Moulya DJ",
    procedureCount: 5,
    flagCount: 3,
    highRiskCount: 1,
    status: "complete",
    source: "sharepoint",
  },
  {
    id: "ra-003",
    fileName: "Vendor_Master_Q3.csv",
    filePath: "Finance/Vendor Management/Vendor_Master_Q3.csv",
    analyzedAt: "2025-03-06T09:00:00Z",
    analyzedBy: "Priya Sharma",
    procedureCount: 3,
    flagCount: 0,
    highRiskCount: 0,
    status: "complete",
    source: "sharepoint",
  },
  {
    id: "ra-004",
    fileName: "GL_Adjustments_Nov.xlsx",
    filePath: "Finance/FY2024-25/GL_Adjustments_Nov.xlsx",
    analyzedAt: "2025-03-04T16:45:00Z",
    analyzedBy: "Moulya DJ",
    procedureCount: 6,
    flagCount: 7,
    highRiskCount: 2,
    status: "complete",
    source: "sharepoint",
  },
  {
    id: "ra-005",
    fileName: "Expense_Claims_Q3.xlsx",
    filePath: "InternalAudit/Workpapers FY25/Expense_Claims_Q3.xlsx",
    analyzedAt: "2025-03-02T10:30:00Z",
    analyzedBy: "Rahul Verma",
    procedureCount: 4,
    flagCount: 2,
    highRiskCount: 0,
    status: "complete",
    source: "sharepoint",
  },
];

// ─── Mock Graph API calls ─────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms));
}

/** GET /sites — fetch all SharePoint sites the user has access to */
export async function fetchSharePointSites(): Promise<SharePointSite[]> {
  await getAccessToken(); // ensures authenticated
  await delay(900);
  return MOCK_SHAREPOINT_SITES;
}

/** GET /me/drive/root/children — fetch OneDrive files */
export async function fetchOneDriveFiles(): Promise<DriveItem[]> {
  await getAccessToken();
  await delay(700);
  return MOCK_ONEDRIVE_ITEMS;
}

/** GET /me/drive/recent — fetch recently accessed files */
export async function fetchRecentActivity(): Promise<RecentActivity[]> {
  await getAccessToken();
  await delay(600);
  return MOCK_RECENT_ACTIVITY;
}

/** Fetch all files from all sources (SharePoint + OneDrive) */
export async function fetchAllFiles(): Promise<{
  sites: SharePointSite[];
  oneDrive: DriveItem[];
}> {
  const [sites, oneDrive] = await Promise.all([
    fetchSharePointSites(),
    fetchOneDriveFiles(),
  ]);
  return { sites, oneDrive };
}

/** Format bytes to human readable */
export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Format ISO date to relative time */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return `${Math.floor(days / 30)}mo ago`;
}