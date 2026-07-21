"""Configuração central da aplicação (lida de variáveis de ambiente / .env)."""
from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    # Banco
    DATABASE_URL: str = "postgresql+psycopg://frota:frota@localhost:5432/frota_f8"

    # JWT
    SECRET_KEY: str = "dev-secret-change-me"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480
    ALGORITHM: str = "HS256"

    # CORS — string separada por vírgula no .env
    BACKEND_CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # Admin inicial (scripts/seed_admin.py). Use um e-mail com domínio válido:
    # o EmailStr rejeita domínios reservados como ".local" no login.
    FIRST_ADMIN_EMAIL: str = "admin@frota.com.br"
    FIRST_ADMIN_PASSWORD: str = "admin"
    FIRST_ADMIN_NAME: str = "Administrador"

    API_V1_PREFIX: str = "/api/v1"
    PROJECT_NAME: str = "Frota F8 API"

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.BACKEND_CORS_ORIGINS.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
