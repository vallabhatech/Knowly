from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str
    gemini_api_key: str
    storage_bucket: str
    storage_endpoint: str
    storage_access_key: str
    storage_secret_key: str
    cookie_secret: str
    cors_origins: str = "http://localhost:5173"
    env: str = "development"
    frontend_url: str = "http://localhost:5173"
    google_oauth_client_id: str = ""
    google_oauth_client_secret: str = ""
    oauth_redirect_url: str = "http://localhost:8000/auth/callback/google"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
