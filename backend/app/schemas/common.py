"""Bases compartilhadas dos schemas Pydantic v2."""
from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class ORMModel(BaseModel):
    """Base para schemas de resposta lidos direto do ORM."""

    model_config = ConfigDict(from_attributes=True)


class Base44Read(ORMModel):
    """Campos comuns a toda entidade migrada do Base44."""

    id: UUID
    legacy_id: str | None = None
    created_by: str | None = None
    created_at: datetime
    updated_at: datetime
