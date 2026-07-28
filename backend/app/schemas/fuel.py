import datetime as dt
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import Base44Read

# ─────────────────────────── FuelCostType ────────────────────────────


class FuelCostTypeBase(BaseModel):
    cost_name: str
    cost_type: str
    is_active: bool = True


class FuelCostTypeCreate(FuelCostTypeBase):
    pass


class FuelCostTypeUpdate(BaseModel):
    cost_name: str | None = None
    cost_type: str | None = None
    is_active: bool | None = None


class FuelCostTypeResponse(FuelCostTypeBase, Base44Read):
    pass


# ──────────────────────────── FuelRecord ─────────────────────────────


class FuelRecordBase(BaseModel):
    date: dt.date
    plate: str
    cost_name: str
    cost_type: str
    quantity: Decimal
    total_value: Decimal
    unit: Literal["LT", "UN"] = "LT"
    km: int | None = None
    vehicle_model: str | None = None
    category_name: str | None = None
    supplier: str | None = None
    invoice_number: str | None = None
    observation: str | None = None


class FuelRecordCreate(FuelRecordBase):
    # Resolvidos pelo router a partir de plate / (cost_type, cost_name)
    # se não forem informados explicitamente.
    vehicle_id: UUID | None = None
    fuel_cost_type_id: UUID | None = None


class FuelRecordUpdate(BaseModel):
    date: dt.date | None = None
    plate: str | None = None
    cost_name: str | None = None
    cost_type: str | None = None
    quantity: Decimal | None = None
    total_value: Decimal | None = None
    unit: Literal["LT", "UN"] | None = None
    km: int | None = None
    vehicle_model: str | None = None
    category_name: str | None = None
    supplier: str | None = None
    invoice_number: str | None = None
    observation: str | None = None


class FuelRecordResponse(FuelRecordBase, Base44Read):
    vehicle_id: UUID
    fuel_cost_type_id: UUID


# ─────────────────────── Importação em massa ─────────────────────────


class FuelRecordBulkCreate(BaseModel):
    records: list[FuelRecordCreate]


class FuelRecordBulkError(BaseModel):
    index: int
    plate: str | None = None
    reason: str


class FuelRecordBulkResult(BaseModel):
    created: int
    skipped: int
    errors: list[FuelRecordBulkError]
