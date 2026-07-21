from uuid import UUID

from pydantic import BaseModel

from app.schemas.common import Base44Read


class VehicleBase(BaseModel):
    plate: str
    category_name: str
    vehicle_model: str | None = None
    chassis: str | None = None
    renavan: str | None = None
    year: str | None = None
    company: str | None = None
    driver: str | None = None
    tracker: bool = False
    is_active: bool = True


class VehicleCreate(VehicleBase):
    # Opcional: se omitido, o router resolve pela category_name.
    category_id: UUID | None = None


class VehicleUpdate(BaseModel):
    plate: str | None = None
    category_id: UUID | None = None
    category_name: str | None = None
    vehicle_model: str | None = None
    chassis: str | None = None
    renavan: str | None = None
    year: str | None = None
    company: str | None = None
    driver: str | None = None
    tracker: bool | None = None
    is_active: bool | None = None


class VehicleResponse(VehicleBase, Base44Read):
    category_id: UUID
