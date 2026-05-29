"""
app/routers/files.py
─────────────────────────────────────────────────────────────────────────────
File endpoints:
  POST /api/v1/files/upload      → upload a .xlsx or .csv file
                                   returns file metadata (columns, row count)
  GET  /api/v1/files/recent      → last 10 uploaded files for this user
─────────────────────────────────────────────────────────────────────────────
The router does NOT run analysis — it only parses and stores file metadata.
Analysis is triggered separately via POST /api/v1/analyses.
─────────────────────────────────────────────────────────────────────────────
"""

import io
import uuid
from typing import Optional

import asyncpg
import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.database import get_db
from app.models.schemas import FileItemOut, UserOut
from app.routers.auth import get_current_user

from pydantic import BaseModel

class RegisterFileRequest(BaseModel):
    name: str
    path: str
    source: str = "onedrive"
    file_type: str = ""
    size_label: Optional[str] = None
    row_count: Optional[int] = None
    column_names: list[str] = []
    site_name: Optional[str] = None
    engagement_id: Optional[str] = None

router = APIRouter(prefix="/files", tags=["files"])

# Max upload size: 50 MB
MAX_BYTES = 50 * 1024 * 1024

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".csv"}


# ── Helpers ───────────────────────────────────────────────────────────────────

def _human_size(n_bytes: int) -> str:
    if n_bytes < 1024:
        return f"{n_bytes} B"
    if n_bytes < 1024 ** 2:
        return f"{n_bytes / 1024:.1f} KB"
    return f"{n_bytes / 1024 ** 2:.1f} MB"


def _parse_file(contents: bytes, filename: str) -> tuple[list[str], int]:
    """Return (columns, row_count) from raw file bytes."""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    try:
        if ext == ".csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        return df.columns.tolist(), len(df)
    except Exception as exc:
        raise HTTPException(
            status_code=422,
            detail=f"Could not parse file: {exc}",
        )


# ── Upload ────────────────────────────────────────────────────────────────────

@router.post("/upload", response_model=FileItemOut, status_code=201)
async def upload_file(
    file: UploadFile = File(...),
    engagement_id: Optional[str] = Form(None),
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    filename = file.filename or "upload"
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    contents = await file.read()

    if len(contents) > MAX_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({_human_size(len(contents))}). Max allowed: {_human_size(MAX_BYTES)}",
        )

    columns, row_count = _parse_file(contents, filename)
    file_id = uuid.uuid4()
    size_label = _human_size(len(contents))

    # Store file metadata in DB
    await db.execute(
        """INSERT INTO uploaded_files
               (id, name, path, size, row_count, columns, uploaded_by, engagement_id,
                source, file_type, site_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)""",
        file_id, filename, f"uploads/{file_id}/{filename}",
        size_label, row_count, columns,
        uuid.UUID(current_user.id),
        uuid.UUID(engagement_id) if engagement_id else None,
        "local", ext.lstrip("."), None,
    )

    return FileItemOut(
        id=str(file_id), name=filename,
        path=f"uploads/{file_id}/{filename}",
        source="local", file_type=ext.lstrip("."),
        size=size_label, size_label=size_label,
        row_count=row_count, columns=columns, column_names=columns,
    )


# ── Recent files ──────────────────────────────────────────────────────────────

@router.get("/recent", response_model=list[FileItemOut])
async def recent_files(
    engagement_id: Optional[str] = None,
    limit: int = 10,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    try:
        if engagement_id:
            rows = await db.fetch(
                """SELECT id, name, path, size, row_count, columns, source, file_type, site_name, created_at AS modified
                   FROM uploaded_files
                   WHERE uploaded_by = $1
                     AND engagement_id = $2
                   ORDER BY created_at DESC
                   LIMIT $3""",
                uuid.UUID(current_user.id),
                uuid.UUID(engagement_id),
                limit,
            )
        else:
            rows = await db.fetch(
                """SELECT id, name, path, size, row_count, columns, source, file_type, site_name, created_at AS modified
                   FROM uploaded_files
                   WHERE uploaded_by = $1
                   ORDER BY created_at DESC
                   LIMIT $2""",
                uuid.UUID(current_user.id),
                limit,
            )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    try:
        return [
            FileItemOut(
                id=str(r["id"]), name=r["name"], path=r["path"],
                source=r["source"] or "local",
                file_type=r["file_type"] or "",
                size=r["size"], size_label=r["size"],
                row_count=r["row_count"],
                columns=r["columns"] or [],
                column_names=r["columns"] or [],
                modified=str(r["modified"]) if r["modified"] else None,
                uploaded_at=str(r["modified"]) if r["modified"] else None,
                site_name=r["site_name"] if "site_name" in r.keys() else None,
            )
            for r in rows
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Serialization error: {str(e)}")


# ── Register (OneDrive / SharePoint picker) ───────────────────────────────────

@router.post("/register", response_model=FileItemOut, status_code=201)
async def register_file(
    body: RegisterFileRequest,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    file_id = uuid.uuid4()
    await db.execute(
        """INSERT INTO uploaded_files
               (id, name, path, size, row_count, columns, uploaded_by, engagement_id,
                source, file_type, site_name)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)""",
        file_id, body.name, body.path, body.size_label,
        body.row_count, body.column_names,
        uuid.UUID(current_user.id),
        uuid.UUID(body.engagement_id) if body.engagement_id else None,
        body.source, body.file_type, body.site_name,
    )
    return FileItemOut(
        id=str(file_id), name=body.name, path=body.path,
        source=body.source, file_type=body.file_type,
        size=body.size_label, size_label=body.size_label,
        row_count=body.row_count,
        columns=body.column_names, column_names=body.column_names,
        site_name=body.site_name,
    )