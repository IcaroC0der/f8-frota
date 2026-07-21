from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.fuel_record import FuelRecord
    from app.models.maintenance_record import MaintenanceRecord
    from app.models.operational_cost_record import OperationalCostRecord
    from app.models.vehicle_category import VehicleCategory


class Vehicle(Base44Mixin, Base):
    __tablename__ = "vehicle"

    plate: Mapped[str] = mapped_column(String(20), nullable=False, unique=True, index=True)

    # FK real (deduzida) + nome denormalizado mantido para o frontend
    category_id: Mapped[uuid.UUID] = mapped_column(
        Uuid, ForeignKey("vehicle_category.id"), nullable=False, index=True
    )
    category_name: Mapped[str] = mapped_column(String(120), nullable=False)

    vehicle_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    chassis: Mapped[str | None] = mapped_column(String(60), nullable=True)
    renavan: Mapped[str | None] = mapped_column(String(60), nullable=True)
    year: Mapped[str | None] = mapped_column(String(10), nullable=True)
    company: Mapped[str | None] = mapped_column(String(255), nullable=True)
    driver: Mapped[str | None] = mapped_column(String(255), nullable=True)
    tracker: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    category: Mapped["VehicleCategory"] = relationship(back_populates="vehicles")
    fuel_records: Mapped[list["FuelRecord"]] = relationship(back_populates="vehicle")
    maintenance_records: Mapped[list["MaintenanceRecord"]] = relationship(
        back_populates="vehicle"
    )
    operational_cost_records: Mapped[list["OperationalCostRecord"]] = relationship(
        back_populates="vehicle"
    )
