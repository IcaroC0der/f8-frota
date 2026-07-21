import datetime as dt
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import Base44Read

# ─────────────────────── MaintenanceClassification ───────────────────


class MaintenanceClassificationBase(BaseModel):
    name: str
    is_active: bool = True


class MaintenanceClassificationCreate(MaintenanceClassificationBase):
    pass


class MaintenanceClassificationUpdate(BaseModel):
    name: str | None = None
    is_active: bool | None = None


class MaintenanceClassificationResponse(MaintenanceClassificationBase, Base44Read):
    pass


# ─────────────────────────── MaintenanceCostType ─────────────────────


class MaintenanceCostTypeBase(BaseModel):
    classification: str
    cost_group: str
    cost_type: str
    is_active: bool = True


class MaintenanceCostTypeCreate(MaintenanceCostTypeBase):
    pass


class MaintenanceCostTypeUpdate(BaseModel):
    classification: str | None = None
    cost_group: str | None = None
    cost_type: str | None = None
    is_active: bool | None = None


class MaintenanceCostTypeResponse(MaintenanceCostTypeBase, Base44Read):
    pass


# ──────────────────────────── MaintenanceRecord ──────────────────────


class MaintenanceRecordBase(BaseModel):
    date: dt.date
    plate: str
    classification: str
    cost_group: str
    cost_type: str
    total_value: Decimal
    km: int | None = None
    vehicle_model: str | None = None
    category_name: str | None = None
    supplier: str | None = None
    invoice_number: str | None = None
    attachment_url: str | None = None
    observation: str | None = None


class MaintenanceRecordCreate(MaintenanceRecordBase):
    vehicle_id: UUID | None = None
    classification_id: UUID | None = None
    maintenance_cost_type_id: UUID | None = None


class MaintenanceRecordUpdate(BaseModel):
    date: dt.date | None = None
    plate: str | None = None
    classification: str | None = None
    cost_group: str | None = None
    cost_type: str | None = None
    total_value: Decimal | None = None
    km: int | None = None
    vehicle_model: str | None = None
    category_name: str | None = None
    supplier: str | None = None
    invoice_number: str | None = None
    attachment_url: str | None = None
    observation: str | None = None


class MaintenanceRecordResponse(MaintenanceRecordBase, Base44Read):
    vehicle_id: UUID
    classification_id: UUID
    maintenance_cost_type_id: UUID | None = None
