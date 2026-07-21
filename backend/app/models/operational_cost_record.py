from __future__ import annotations

import uuid
from datetime import date
from decimal import Decimal
from typing import TYPE_CHECKING

from sqlalchemy import Date, ForeignKey, Integer, Numeric, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.operational_cost import OperationalCost
    from app.models.vehicle import Vehicle


class OperationalCostRecord(Base44Mixin, Base):
    __tablename__ = "operational_cost_record"

    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # cost_name é 100% resolvível (NOT NULL). Placa é opcional no schema →
    # vehicle_id nullable.
    operational_cost_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("operational_cost.id"), nullable=False, index=True
    )
    vehicle_id: Mapped[uuid.UUID | None] = mapped_column(
        Uuid, ForeignKey("vehicle.id"), nullable=True, index=True
    )

    # Denormalizados mantidos
    cost_name: Mapped[str] = mapped_column(String(120), nullable=False)
    plate: Mapped[str | None] = mapped_column(String(20), nullable=True, index=True)
    vehicle_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category_name: Mapped[str | None] = mapped_column(String(120), nullable=True)

    supplier: Mapped[str | None] = mapped_column(String(255), nullable=True)
    invoice_number: Mapped[str | None] = mapped_column(String(60), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String, nullable=True)
    km: Mapped[int | None] = mapped_column(Integer, nullable=True)
    total_value: Mapped[Decimal] = mapped_column(Numeric(14, 2), nullable=False)
    observation: Mapped[str | None] = mapped_column(String, nullable=True)

    operational_cost: Mapped["OperationalCost"] = relationship(back_populates="records")
    vehicle: Mapped["Vehicle | None"] = relationship(
        back_populates="operational_cost_records"
    )
