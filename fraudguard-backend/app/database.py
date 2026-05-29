"""
app/database.py
─────────────────────────────────────────────────────────────────────────────
asyncpg connection pool.
The pool is created once on startup and shared across all requests.
─────────────────────────────────────────────────────────────────────────────
"""

import asyncpg
from app.config import get_settings

# Module-level pool (set by lifespan in main.py)
_pool: asyncpg.Pool | None = None


async def create_pool() -> asyncpg.Pool:
    """Create the connection pool. Called once on app startup."""
    settings = get_settings()
    global _pool
    _pool = await asyncpg.create_pool(
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
        user=settings.db_user,
        password=settings.db_password,
        min_size=settings.db_pool_min,
        max_size=settings.db_pool_max,
        # Tell asyncpg which search_path to use so every query
        # automatically looks in the fraudguard schema first
        server_settings={"search_path": "public"},

    )
    return _pool


async def close_pool():
    """Close the pool on shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    """Return the active pool. Raises if called before startup."""
    if _pool is None:
        raise RuntimeError("Database pool is not initialised")
    return _pool


async def get_db():
    """
    FastAPI dependency — yields a single connection from the pool.

    Usage in a router:
        from app.database import get_db
        import asyncpg

        @router.get("/something")
        async def handler(db: asyncpg.Connection = Depends(get_db)):
            row = await db.fetchrow("SELECT ...")
    """
    pool = get_pool()
    async with pool.acquire() as conn:
        yield conn