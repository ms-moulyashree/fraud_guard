"""
db/init_db.py
─────────────────────────────────────────────────────────────────────────────
Run this ONCE after starting Docker to create all tables.

Usage (two options):

  Option A — via Docker (recommended):
    docker compose exec backend python db/init_db.py

  Option B — locally (if Python + asyncpg installed):
    DB_HOST=localhost python db/init_db.py

What it does:
  1. Connects to Postgres via asyncpg
  2. Reads db/schema.sql
  3. Executes it (creates schema, tables, indexes, seeds data)
  4. Prints a summary of every table created
─────────────────────────────────────────────────────────────────────────────
"""

import asyncio
import os
import asyncpg
from pathlib import Path
 
 
# ── Connection settings (reads from env, falls back to defaults)
DB_CONFIG = {
    "host":     os.getenv("DB_HOST",     "localhost"),
    "port":     int(os.getenv("DB_PORT", "5432")),
    "database": os.getenv("DB_NAME",     "fraudguard"),
    "user":     os.getenv("DB_USER",     "postgres"),
    "password": os.getenv("DB_PASSWORD", "123Yah00"),
}
 
SCHEMA_FILE = Path(__file__).parent / "schema.sql"
 
 
async def init():
    print(f"\n  Connecting to PostgreSQL at {DB_CONFIG['host']}:{DB_CONFIG['port']}...")
 
    conn = await asyncpg.connect(**DB_CONFIG)
    print("  Connected.\n")
 
    # Read and execute the schema file
    sql = SCHEMA_FILE.read_text(encoding="utf-8")
    print("  Running schema.sql ...")
    await conn.execute(sql)
    print("  schema.sql executed.\n")
 
    # Print a summary of all tables created (public schema)
    rows = await conn.fetch(
        """
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type   = 'BASE TABLE'
        ORDER BY table_name
        """
    )
 
    print("  Tables created:")
    for row in rows:
        print(f"    ✓  {row['table_name']}")
 
    # Count seeded rows
    print()
    for table in ("procedures", "engagements", "users"):
        count = await conn.fetchval(f"SELECT COUNT(*) FROM {table}")
        print(f"  Seeded {table}: {count} rows")
 
    await conn.close()
    print("\n  Database ready!\n")
 
 
if __name__ == "__main__":
    asyncio.run(init())