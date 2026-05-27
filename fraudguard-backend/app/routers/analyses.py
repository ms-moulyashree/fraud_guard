"""
app/routers/analyses.py
─────────────────────────────────────────────────────────────────────────────
Analysis endpoints:
  POST /api/v1/analyses              → start analysis (JSON metadata)
  POST /api/v1/analyses/upload       → upload file + start analysis
  GET  /api/v1/analyses              → list all runs (filter by engagement)
  GET  /api/v1/analyses/{id}         → get single run + poll status
  GET  /api/v1/dashboard/stats       → KPI totals
  GET  /api/v1/dashboard/recent      → last N runs with counts
─────────────────────────────────────────────────────────────────────────────
"""

from __future__ import annotations

import asyncio
import io
import json
import uuid
from typing import Optional

import asyncpg
import pandas as pd
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.database import get_db, get_pool
from app.models.schemas import (
    AnalysisRunOut,
    ProcedureResultOut,
    StartAnalysisRequest,
    UserOut,
    DashboardStats,
)
from app.routers.auth import get_current_user
from app.services.analysis_engine import run_analysis

router = APIRouter(tags=["analyses"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _human_size(n: int) -> str:
    if n < 1024:
        return f"{n} B"
    if n < 1024 ** 2:
        return f"{n / 1024:.1f} KB"
    return f"{n / 1024 ** 2:.1f} MB"


async def _build_run_out(
    r: asyncpg.Record, db: asyncpg.Connection
) -> AnalysisRunOut:
    """Fetch procedure results for a run and assemble the response model."""
    proc_rows = await db.fetch(
        """SELECT id, procedure_id, procedure_name, status, risk_level, flag_count
           FROM procedure_results
           WHERE run_id = $1
           ORDER BY created_at""",
        r["id"],
    )

    cols = r["columns"]
    if isinstance(cols, str):
        cols = json.loads(cols)

    return AnalysisRunOut(
        id=str(r["id"]),
        engagement_id=str(r["engagement_id"]) if r["engagement_id"] else None,
        file_name=r["file_name"],
        file_path=r["file_path"],
        file_size=r["file_size"],
        row_count=r["row_count"],
        columns=cols or [],
        started_at=r["started_at"].isoformat(),
        completed_at=r["completed_at"].isoformat() if r["completed_at"] else None,
        status=r["status"],
        ai_summary=r["ai_summary"],
        procedures=[
            ProcedureResultOut(
                id=str(p["id"]),
                procedure_id=p["procedure_id"],
                procedure_name=p["procedure_name"],
                status=p["status"],
                risk_level=p["risk_level"],
                flag_count=p["flag_count"],
            )
            for p in proc_rows
        ],
    )


# ══════════════════════════════════════════════════════════════════════════════
# ANALYSES
# ══════════════════════════════════════════════════════════════════════════════

# ── List ──────────────────────────────────────────────────────────────────────

@router.get("/analyses", response_model=list[AnalysisRunOut])
async def list_analyses(
    engagement_id: Optional[str] = None,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    if engagement_id:
        rows = await db.fetch(
            """SELECT id, engagement_id, file_name, file_path, file_size,
                      row_count, columns, started_at, completed_at, status, ai_summary
               FROM analysis_runs
               WHERE engagement_id = $1
               ORDER BY started_at DESC""",
            uuid.UUID(engagement_id),
        )
    else:
        rows = await db.fetch(
            """SELECT id, engagement_id, file_name, file_path, file_size,
                      row_count, columns, started_at, completed_at, status, ai_summary
               FROM analysis_runs
               ORDER BY started_at DESC"""
        )

    return [await _build_run_out(r, db) for r in rows]


# ── Get single / poll ─────────────────────────────────────────────────────────

@router.get("/analyses/{run_id}", response_model=AnalysisRunOut)
async def get_analysis(
    run_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        """SELECT id, engagement_id, file_name, file_path, file_size,
                  row_count, columns, started_at, completed_at, status, ai_summary
           FROM analysis_runs WHERE id = $1""",
        uuid.UUID(run_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Analysis run not found")

    return await _build_run_out(row, db)


# ── Start (JSON metadata — no file upload) ────────────────────────────────────

@router.post("/analyses", status_code=202)
async def start_analysis(
    body: StartAnalysisRequest,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    """
    Kick off an analysis run.
    Returns {run_id} immediately; frontend polls GET /analyses/{run_id}.
    """
    run_id = uuid.uuid4()

    await db.execute(
        """INSERT INTO analysis_runs
               (id, engagement_id, file_name, file_path, file_size,
                row_count, columns, status, started_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'running',$8)""",
        run_id,
        uuid.UUID(body.engagement_id) if body.engagement_id else None,
        body.file_name,
        body.file_path,
        body.file_size,
        body.row_count,
        json.dumps(body.columns),
        uuid.UUID(current_user.id),
    )

    # Fire-and-forget — pool is used inside the task (not the request connection)
    asyncio.create_task(
        run_analysis(
            run_id=str(run_id),
            procedure_ids=body.procedure_ids,
            columns=body.columns,
            file_name=body.file_name,
            dataframe=None,
        )
    )

    return {"run_id": str(run_id)}


# ── Upload file + start analysis ──────────────────────────────────────────────

@router.post("/analyses/upload", status_code=202)
async def upload_and_analyse(
    file: UploadFile = File(...),
    engagement_id: Optional[str] = Form(None),
    procedure_ids: str = Form("[]"),        # JSON-encoded list of procedure IDs
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    filename = file.filename or "upload"
    contents = await file.read()
    proc_ids: list[str] = json.loads(procedure_ids)

    # Parse to extract columns + row count
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    try:
        if ext == "csv":
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        columns = df.columns.tolist()
        row_count = len(df)
    except Exception as exc:
        raise HTTPException(status_code=422, detail=f"Cannot parse file: {exc}")

    run_id = uuid.uuid4()
    size_label = _human_size(len(contents))

    await db.execute(
        """INSERT INTO analysis_runs
               (id, engagement_id, file_name, file_path, file_size,
                row_count, columns, status, started_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,'running',$8)""",
        run_id,
        uuid.UUID(engagement_id) if engagement_id else None,
        filename,
        f"uploads/{run_id}/{filename}",
        size_label,
        row_count,
        json.dumps(columns),
        uuid.UUID(current_user.id),
    )

    asyncio.create_task(
        run_analysis(
            run_id=str(run_id),
            procedure_ids=proc_ids,
            columns=columns,
            file_name=filename,
            dataframe=df,
        )
    )

    return {"run_id": str(run_id)}


# ══════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/dashboard/stats", response_model=DashboardStats)
async def dashboard_stats(
    engagement_id: Optional[str] = None,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    if engagement_id:
        row = await db.fetchrow(
            """SELECT
                COUNT(DISTINCT pr.id)                                          AS total_procedures,
                COUNT(DISTINCT fi.id)                                          AS total_flags,
                COUNT(DISTINCT fi.id) FILTER (WHERE fi.risk_level = 'High')   AS high_risk,
                COUNT(DISTINCT r.id)                                           AS files_analysed
               FROM analysis_runs r
               LEFT JOIN procedure_results pr ON pr.run_id = r.id
               LEFT JOIN flagged_items fi      ON fi.run_id = r.id
               WHERE r.engagement_id = $1""",
            uuid.UUID(engagement_id),
        )
    else:
        row = await db.fetchrow(
            """SELECT
                COUNT(DISTINCT pr.id)                                          AS total_procedures,
                COUNT(DISTINCT fi.id)                                          AS total_flags,
                COUNT(DISTINCT fi.id) FILTER (WHERE fi.risk_level = 'High')   AS high_risk,
                COUNT(DISTINCT r.id)                                           AS files_analysed
               FROM analysis_runs r
               LEFT JOIN procedure_results pr ON pr.run_id = r.id
               LEFT JOIN flagged_items fi      ON fi.run_id = r.id"""
        )

    return DashboardStats(
        total_procedures=row["total_procedures"] or 0,
        total_flags=row["total_flags"] or 0,
        high_risk=row["high_risk"] or 0,
        files_analysed=row["files_analysed"] or 0,
    )


@router.get("/dashboard/recent")
async def recent_analyses(
    engagement_id: Optional[str] = None,
    limit: int = 10,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    if engagement_id:
        rows = await db.fetch(
            """SELECT r.id, r.file_name, r.status, r.started_at,
                      COUNT(DISTINCT pr.id)                                        AS procedure_count,
                      COUNT(DISTINCT fi.id)                                        AS flag_count,
                      COUNT(DISTINCT fi.id) FILTER (WHERE fi.risk_level = 'High') AS high_risk_count
               FROM analysis_runs r
               LEFT JOIN procedure_results pr ON pr.run_id = r.id
               LEFT JOIN flagged_items fi      ON fi.run_id = r.id
               WHERE r.engagement_id = $1
               GROUP BY r.id
               ORDER BY r.started_at DESC
               LIMIT $2""",
            uuid.UUID(engagement_id),
            limit,
        )
    else:
        rows = await db.fetch(
            """SELECT r.id, r.file_name, r.status, r.started_at,
                      COUNT(DISTINCT pr.id)                                        AS procedure_count,
                      COUNT(DISTINCT fi.id)                                        AS flag_count,
                      COUNT(DISTINCT fi.id) FILTER (WHERE fi.risk_level = 'High') AS high_risk_count
               FROM analysis_runs r
               LEFT JOIN procedure_results pr ON pr.run_id = r.id
               LEFT JOIN flagged_items fi      ON fi.run_id = r.id
               GROUP BY r.id
               ORDER BY r.started_at DESC
               LIMIT $1""",
            limit,
        )

    return [
        {
            "id": str(r["id"]),
            "file_name": r["file_name"],
            "status": r["status"],
            "started_at": r["started_at"].isoformat(),
            "procedure_count": r["procedure_count"],
            "flag_count": r["flag_count"],
            "high_risk_count": r["high_risk_count"],
        }
        for r in rows
    ]