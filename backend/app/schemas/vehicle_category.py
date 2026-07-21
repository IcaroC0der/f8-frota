from pydantic import BaseModel

from app.schemas.common import Base44Read


class VehicleCategoryBase(BaseModel):
    name: str
    description: str | None = None
    is_active: bool = True


class VehicleCategoryCreate(VehicleCategoryBase):
    pass


class VehicleCategoryUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    is_active: bool | None = None


class VehicleCategoryResponse(VehicleCategoryBase, Base44Read):
    pass
