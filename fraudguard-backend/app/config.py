"""
app/config.py
─────────────────────────────────────────────────────────────────────────────
All environment variables in one place.
Pydantic-settings reads from the .env file automatically.
─────────────────────────────────────────────────────────────────────────────
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Database (asyncpg) ────────────────────────────────────────────────────
    db_host:      str = "db"           # "db" in Docker, "localhost" for local dev
    db_port:      int = 5432
    db_name:      str = "fraudguard"
    db_user:      str = "postgres"
    db_password:  str = "123Yah00"
    db_pool_min:  int = 2
    db_pool_max:  int = 10

    @property
    def database_url(self) -> str:
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )

    # ── Azure OpenAI ──────────────────────────────────────────────────────────
    azure_oai_endpoint:    str = ""
    azure_oai_key:         str = ""
    azure_oai_deployment:  str = "gpt-4o"
    azure_oai_api_version: str = "2024-02-01"

    # ── App security ──────────────────────────────────────────────────────────
    secret_key:    str = "dev-secret-change-in-production"
    algorithm:     str = "HS256"
    access_token_expire_minutes: int = 480   # 8 hours

    # ── CORS ──────────────────────────────────────────────────────────────────
    cors_origins: str = "http://localhost:5173"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",")]

    # ── App ───────────────────────────────────────────────────────────────────
    environment: str = "production"

    @property
    def is_dev(self) -> bool:
        return self.environment == "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()