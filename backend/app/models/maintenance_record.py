from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.maintenance_classification import MaintenanceClassification
    from app.models.maintenance_cost_type import MaintenanceCostType
    from app.models.vehicle import Vehicle


class MaintenanceRecord(Base44Mixin, Base):
    __tablename__ = "maintenance_record"

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # FKs deduzidas: veículo e classificação são 100% resolvíveis (NOT NULL);
    # o tipo de custo é best-effort (~91%) → nullable, mantendo as strings.
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("vehicle.id"), nullable=False, index=True
    )
    classification_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("maintenance_classification.id"), nullable=False, index=True
    )
    maintenance_cost_type_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("maintenance_cost_type.id"), nullable=True, index=True
    )

    # Denormalizados mantidos
    plate: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    classification: Mapped[str] = mapped_column(String(120), nullable=False)
    cost_group: Mapped[str] = mapped_column(String(120), nullable=False)
    cost_type: Mapped[str] = mapped_column(String(120), nullable=False)

    supplier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String, nullable=True)
    km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    observation: Mapped[str | None] = mapped_column(String, nullable=True)

    vehicle: Mapped["Vehicle"] = relationship(back_populates="maintenance_records")
    classification_ref: Mapped["MaintenanceClassification"] = relationship(
        back_populates="maintenance_records"
    )
    cost_type_ref: Mapped["MaintenanceCostType | None"] = relationship(
        back_populates="maintenance_records"
    )
