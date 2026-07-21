from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, Base44Mixin

if TYPE_CHECKING:
    from app.models.operational_cost_record import OperationalCostRecord


class OperationalCost(Base44Mixin, Base):
    __tablename__ = "operational_cost"

    name: Mapped[str] = mapped_column(String(120), nullable=False, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    records: Mapped[list["OperationalCostRecord"]] = relationship(
        back_populates="operational_cost"
    )
