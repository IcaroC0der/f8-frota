from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.maintenance_record import MaintenanceRecord


class MaintenanceCostType(Base44Mixin, Base):
    __tablename__ = "maintenance_cost_type"

    classification: Mapped[str] = mapped_column(String(120), nullable=False)
    cost_group: Mapped[str] = mapped_column(String(120), nullable=False)
    cost_type: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    maintenance_records: Mapped[list["MaintenanceRecord"]] = relationship(
        back_populates="cost_type_ref"
    )
