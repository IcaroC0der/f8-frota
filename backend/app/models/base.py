"""Base declarativa do SQLAlchemy 2.0 e mixins reutilizáveis.

Estratégia de chave (definida na migração do Base44):
  - `id`         → nova PK própria em UUID (idiomática no Postgres).
  - `legacy_id`  → guarda o ID original de 24 chars do Base44, apenas para
                   conferência/rastreabilidade pós-migração.
  - created_at / updated_at → timestamps gerenciados pelo servidor.
  - created_by   → e-mail de quem criou o registro (auditoria vinda do Base44).
"""
import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, Uuid, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class UUIDPKMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        Uuid, primary_key=True, default=uuid.uuid4
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


class Base44Mixin(UUIDPKMixin, TimestampMixin):
    """Colunas comuns a toda entidade importada do Base44."""

    legacy_id: Mapped[str | None] = mapped_column(
        String(32), unique=True, index=True, nullable=True
    )
    created_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
