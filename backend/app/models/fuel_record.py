from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.fuel_cost_type import FuelCostType
    from app.models.vehicle import Vehicle


class FuelRecord(Base44Mixin, Base):
    __tablename__ = "fuel_record"

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # FKs deduzidas (placa 100% válida; cost_type+cost_name 100% resolvível)
    vehicle_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("vehicle.id"), nullable=False, index=True
    )
    fuel_cost_type_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("fuel_cost_type.id"), nullable=False, index=True
    )

    # Denormalizados mantidos (snapshot do Base44 / conveniência do frontend)
    plate: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cost_name: Mapped[str] = mapped_column(String(120), nullable=False)
    cost_type: Mapped[str] = mapped_column(String(120), nullable=False)

    invoice_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    supplier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    unit: Mapped[str] = mapped_column(String(4), nullable=False, default="LT")
    km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quantity: Mapped[Decimal] = mapped_column(Numeric(14, 3), nullable=False)
    total_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    observation: Mapped[str | None] = mapped_column(String, nullable=True)

    vehicle: Mapped["Vehicle"] = relationship(back_populates="fuel_records")
    fuel_cost_type: Mapped["FuelCostType"] = relationship(back_populates="fuel_records")
