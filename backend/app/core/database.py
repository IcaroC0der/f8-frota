"""Engine, Session e dependência get_db do SQLAlchemy 2.0."""
from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,   # evita conexões mortas em pools ociosos
    future=True,
)

SessionLocal = sessionmaker(
    bind=engine, autoflush=False, autocommit=False, expire_on_commit=False
)


def get_db() -> Generator[Session, None, None]:
    """Dependência do FastAPI: abre uma sessão por request e garante o fechamento."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
