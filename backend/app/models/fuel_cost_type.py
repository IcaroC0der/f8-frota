from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.fuel_record import FuelRecord


class FuelCostType(Base44Mixin, Base):
    __tablename__ = "fuel_cost_type"

    cost_name: Mapped[str] = mapped_column(String(120), nullable=False)
    cost_type: Mapped[str] = mapped_column(String(120), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    fuel_records: Mapped[list["FuelRecord"]] = relationship(back_populates="fuel_cost_type")
