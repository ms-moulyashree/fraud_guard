"""
app/main.py
─────────────────────────────────────────────────────────────────────────────
FastAPI application entry point.

• Creates the asyncpg pool on startup, closes it on shutdown
• Mounts all API routers under /api/v1
• Serves the compiled React SPA from /app/static at the root URL
• Exposes /health for Docker HEALTHCHECK
─────────────────────────────────────────────────────────────────────────────
"""

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from app.config import get_settings
from app.database import create_pool, close_pool

# ── Import all routers ────────────────────────────────────────────────────────
from app.routers import (
    auth,
    engagements,
    files,
    procedures,
    analyses,
    flags,
    export,
)



# ── Lifespan: pool created once, closed on shutdown ──────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    print("  Database pool ready")
    yield
    await close_pool()
    print("  Database pool closed")


# ── App ───────────────────────────────────────────────────────────────────────
settings = get_settings()

app = FastAPI(
    title="FraudGuard API",
    version="1.0.0",
    docs_url="/docs" if settings.is_dev else None,   # hide Swagger in prod
    redoc_url=None,
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── API routers ───────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth.router,        prefix=PREFIX)
app.include_router(engagements.router, prefix=PREFIX)
app.include_router(files.router,       prefix=PREFIX)
app.include_router(procedures.router,  prefix=PREFIX)
app.include_router(analyses.router,    prefix=PREFIX)
app.include_router(flags.router,       prefix=PREFIX)
app.include_router(export.router,      prefix=PREFIX)



# ── Health check (used by Docker HEALTHCHECK + load balancers) ────────────────
@app.get("/health", tags=["system"])
async def health():
    return {"status": "ok", "service": "fraudguard-backend"}


# ── Serve React SPA ──────────────────────────────────────────────────────────
# In production the compiled React build lives in /app/static (copied by Docker).
# Any route NOT matched by the API routers above falls through to index.html,
# so React Router handles client-side navigation correctly.
STATIC_DIR = Path("/app/static")

if STATIC_DIR.exists():
    # Serve static assets (JS, CSS, images) from /app/static
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        """Catch-all: return index.html for any non-API route."""
        return FileResponse(STATIC_DIR / "index.html")