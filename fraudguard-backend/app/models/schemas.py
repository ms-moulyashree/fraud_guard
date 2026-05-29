"""
app/models/schemas.py
─────────────────────
All Pydantic request/response schemas used across the API.
"""

from __future__ import annotations
from typing import Optional
from datetime import datetime
from pydantic import BaseModel, EmailStr


# ══════════════════════════════════════════════════════════════════════════════
# AUTH
# ══════════════════════════════════════════════════════════════════════════════

class RegisterRequest(BaseModel):
    email: str
    password: str
    display_name: str
    job_title: str = ""
    tenant_id: str = ""


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


class UserOut(BaseModel):
    id: str
    email: str
    display_name: str
    avatar: str
    job_title: str
    tenant_id: str


# ══════════════════════════════════════════════════════════════════════════════
# ENGAGEMENTS
# ══════════════════════════════════════════════════════════════════════════════

class EngagementOut(BaseModel):
    id: str
    name: str
    year: str
    type: str


class CreateEngagementRequest(BaseModel):
    name: str
    year: str
    type: str


# ══════════════════════════════════════════════════════════════════════════════
# PROCEDURES
# ══════════════════════════════════════════════════════════════════════════════

class ProcedureOut(BaseModel):
    id: str
    name: str
    type: str
    category: str
    description: str
    risk: str
    enabled: bool


# ══════════════════════════════════════════════════════════════════════════════
# FILES (SharePoint/local)
# ══════════════════════════════════════════════════════════════════════════════

class FileItemOut(BaseModel):
    id: str
    name: str
    path: str
    source: str = "local"
    file_type: str = ""
    size: Optional[str] = None
    size_label: Optional[str] = None
    modified: Optional[str] = None
    uploaded_at: Optional[str] = None
    row_count: Optional[int] = None
    columns: list[str] = []
    column_names: Optional[list[str]] = None
    site_name: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
# ANALYSES
# ══════════════════════════════════════════════════════════════════════════════

class StartAnalysisRequest(BaseModel):
    file_name: str
    file_path: str
    file_size: Optional[str] = None
    row_count: Optional[int] = None
    columns: list[str] = []
    engagement_id: Optional[str] = None
    procedure_ids: list[str] = []


class ProcedureResultOut(BaseModel):
    id: str
    procedure_id: str
    procedure_name: str
    status: str
    risk_level: Optional[str] = None
    flag_count: int


class AnalysisRunOut(BaseModel):
    id: str
    engagement_id: Optional[str] = None
    file_name: str
    file_path: str
    file_size: Optional[str] = None
    row_count: Optional[int] = None
    columns: list[str] = []
    started_at: str
    completed_at: Optional[str] = None
    status: str
    ai_summary: Optional[str] = None
    procedures: list[ProcedureResultOut] = []


# ══════════════════════════════════════════════════════════════════════════════
# FLAGS
# ══════════════════════════════════════════════════════════════════════════════

class FlagOut(BaseModel):
    id: str
    run_id: str
    procedure_id: str
    procedure_name: str
    row_id: str
    invoice_no: Optional[str] = None
    vendor_id: Optional[str] = None
    amount: Optional[str] = None
    date: Optional[str] = None
    reason: str
    risk_level: str
    document_type: Optional[str] = None
    field: Optional[str] = None
    flagged_value: Optional[str] = None
    detection: Optional[str] = None
    status: str
    auditor_action: str


class UpdateFlagRequest(BaseModel):
    status: Optional[str] = None
    auditor_action: Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

class DashboardStats(BaseModel):
    total_procedures: int
    total_flags: int
    high_risk: int
    files_analysed: int

# ══════════════════════════════════════════════════════════════════════════════
# MICROSOFT AUTH
# ══════════════════════════════════════════════════════════════════════════════

class MicrosoftLoginRequest(BaseModel):
    access_token: str
    email: Optional[str] = None
    display_name: Optional[str] = None
    job_title: Optional[str] = None
    tenant_id: Optional[str] = None