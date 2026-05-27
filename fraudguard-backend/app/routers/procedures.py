"""
app/routers/procedures.py
─────────────────────────────────────────────────────────────────────────────
Procedure endpoints:
  GET  /api/v1/procedures        → list all procedures
  GET  /api/v1/procedures/{id}   → get single procedure
─────────────────────────────────────────────────────────────────────────────
"""

from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.schemas import ProcedureOut, UserOut

router = APIRouter(prefix="/procedures", tags=["procedures"])


# ── List all ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[ProcedureOut])
async def list_procedures(
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        """SELECT id, name, type, category, description, risk, enabled
           FROM procedures
           ORDER BY category, name"""
    )
    return [ProcedureOut(**dict(r)) for r in rows]


# ── Get single ────────────────────────────────────────────────────────────────

@router.get("/{procedure_id}", response_model=ProcedureOut)
async def get_procedure(
    procedure_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        """SELECT id, name, type, category, description, risk, enabled
           FROM procedures WHERE id = $1""",
        procedure_id,
    )
    if not row:
        raise HTTPException(status_code=404, detail="Procedure not found")

    return ProcedureOut(**dict(row))