"""CRUD genérico reutilizado por todos os routers (mantém as rotas enxutas)."""
from typing import Generic, TypeVar
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.base import Base

ModelType = TypeVar("ModelType", bound=Base)


class CRUDBase(Generic[ModelType]):
    def __init__(self, model: type[ModelType]):
        self.model = model

    def get(self, db: Session, id: UUID) -> ModelType | None:
        return db.get(self.model, id)

    def get_multi(self, db: Session, *, skip: int = 0, limit: int = 100) -> list[ModelType]:
        stmt = select(self.model).offset(skip).limit(limit)
        return list(db.scalars(stmt).all())

    def count(self, db: Session) -> int:
        return db.scalar(select(func.count()).select_from(self.model)) or 0

    def create(self, db: Session, data: dict) -> ModelType:
        obj = self.model(**data)
        db.add(obj)
        db.commit()
        db.refresh(obj)
        return obj

    def update(self, db: Session, db_obj: ModelType, data: dict) -> ModelType:
        for field, value in data.items():
            setattr(db_obj, field, value)
        db.commit()
        db.refresh(db_obj)
        return db_obj

    def remove(self, db: Session, db_obj: ModelType) -> None:
        db.delete(db_obj)
        db.commit()
