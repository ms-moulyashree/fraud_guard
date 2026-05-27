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
               (id, name, path, size, row_count, columns, uploaded_by, engagement_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)""",
        file_id,
        filename,
        f"uploads/{file_id}/{filename}",
        size_label,
        row_count,
        columns,                        # asyncpg stores list[str] as text[]
        uuid.UUID(current_user.id),
        uuid.UUID(engagement_id) if engagement_id else None,
    )

    return FileItemOut(
        id=str(file_id),
        name=filename,
        path=f"uploads/{file_id}/{filename}",
        size=size_label,
        row_count=row_count,
        columns=columns,
    )


# ── Recent files ──────────────────────────────────────────────────────────────

@router.get("/recent", response_model=list[FileItemOut])
async def recent_files(
    engagement_id: Optional[str] = None,
    limit: int = 10,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    if engagement_id:
        rows = await db.fetch(
            """SELECT id, name, path, size, row_count, columns, modified
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
            """SELECT id, name, path, size, row_count, columns, modified
               FROM uploaded_files
               WHERE uploaded_by = $1
               ORDER BY created_at DESC
               LIMIT $2""",
            uuid.UUID(current_user.id),
            limit,
        )

    return [
        FileItemOut(
            id=str(r["id"]),
            name=r["name"],
            path=r["path"],
            size=r["size"],
            row_count=r["row_count"],
            columns=r["columns"] or [],
            modified=str(r["modified"]) if r["modified"] else None,
        )
        for r in rows
    ]