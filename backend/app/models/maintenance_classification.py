from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.maintenance_record import MaintenanceRecord


class MaintenanceClassification(Base44Mixin, Base):
    __tablename__ = "maintenance_classification"

    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    maintenance_records: Mapped[list["MaintenanceRecord"]] = relationship(
        back_populates="classification_ref"
    )
