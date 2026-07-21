import datetime as dt
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import Base44Read

# ─────────────────────────── OperationalCost ─────────────────────────


class OperationalCostBase(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class OperationalCostCreate(OperationalCostBase):
    pass


class OperationalCostUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class OperationalCostResponse(OperationalCostBase, Base44Read):
    pass


# ──────────────────────── OperationalCostRecord ──────────────────────


class OperationalCostRecordBase(BaseModel):
    date: dt.date
    cost_name: str
    total_value: Decimal
    plate: str | None = None
    km: int | None = None
    vehicle_model: str | None = None
    category_name: str | None = None
    supplier: str | None = None
    invoice_number: str | None = None
    attachment_url: str | None = None
    observation: str | None = None


class OperationalCostRecordCreate(OperationalCostRecordBase):
    operational_cost_id: UUID | None = None
    vehicle_id: UUID | None = None


class OperationalCostRecordUpdate(BaseModel):
    date: dt.date | None = None
    cost_name: str | None = None
    total_value: Decimal | None = None
    plate: str | None = None
    km: int | None = None
    vehicle_model: str | None = None
    category_name: str | None = None
    supplier: str | None = None
    invoice_number: str | None = None
    attachment_url: str | None = None
    observation: str | None = None


class OperationalCostRecordResponse(OperationalCostRecordBase, Base44Read):
    operational_cost_id: UUID
    vehicle_id: UUID | None = None
