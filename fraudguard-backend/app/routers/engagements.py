"""
app/routers/engagements.py
─────────────────────────────────────────────────────────────────────────────
Engagement endpoints:
  GET  /api/v1/engagements        → list all engagements
  POST /api/v1/engagements        → create new engagement
  GET  /api/v1/engagements/{id}   → get single engagement
─────────────────────────────────────────────────────────────────────────────
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException
import asyncpg

from app.database import get_db
from app.routers.auth import get_current_user
from app.models.schemas import EngagementOut, CreateEngagementRequest, UserOut

router = APIRouter(prefix="/engagements", tags=["engagements"])


# ── List all ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[EngagementOut])
async def list_engagements(
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    rows = await db.fetch(
        """SELECT id, name, year, type
           FROM engagements
           ORDER BY created_at DESC"""
    )
    return [
        EngagementOut(
            id=str(r["id"]),
            name=r["name"],
            year=r["year"],
            type=r["type"],
        )
        for r in rows
    ]


# ── Get single ────────────────────────────────────────────────────────────────

@router.get("/{engagement_id}", response_model=EngagementOut)
async def get_engagement(
    engagement_id: str,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    row = await db.fetchrow(
        "SELECT id, name, year, type FROM engagements WHERE id = $1",
        uuid.UUID(engagement_id),
    )
    if not row:
        raise HTTPException(status_code=404, detail="Engagement not found")

    return EngagementOut(
        id=str(row["id"]),
        name=row["name"],
        year=row["year"],
        type=row["type"],
    )


# ── Create ────────────────────────────────────────────────────────────────────

@router.post("", response_model=EngagementOut, status_code=201)
async def create_engagement(
    body: CreateEngagementRequest,
    current_user: UserOut = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
):
    eid = uuid.uuid4()
    await db.execute(
        """INSERT INTO engagements (id, name, year, type, created_by)
           VALUES ($1, $2, $3, $4, $5)""",
        eid,
        body.name,
        body.year,
        body.type,
        uuid.UUID(current_user.id),
    )
    return EngagementOut(
        id=str(eid),
        name=body.name,
        year=body.year,
        type=body.type,
    )