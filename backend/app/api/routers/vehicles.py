from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.api.resolvers import resolve_category_by_name
from app.core.database import get_db
from app.crud.base import CRUDBase
from app.models.vehicle import Vehicle
from app.models.vehicle_category import VehicleCategory
from app.schemas.vehicle import VehicleCreate, VehicleResponse, VehicleUpdate

router = APIRouter(
    prefix="/vehicles", tags=["vehicles"], dependencies=[Depends(get_current_user)]
)
crud = CRUDBase(Vehicle)


@router.get("", response_model=list[VehicleResponse])
def list_vehicles(skip: int = 0, limit: int = 200, db: Session = Depends(get_db)):
    return crud.get_multi(db, skip=skip, limit=limit)


@router.post("", response_model=VehicleResponse, status_code=status.HTTP_201_CREATED)
def create_vehicle(payload: VehicleCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    category_id = data.pop("category_id", None)
    if category_id:
        category = db.get(VehicleCategory, category_id)
        if not category:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoria não encontrada.")
    else:
        category = resolve_category_by_name(db, data["category_name"])
    data["category_id"] = category.id
    data["category_name"] = category.name  # mantém o denormalizado coerente
    return crud.create(db, data)


@router.get("/{item_id}", response_model=VehicleResponse)
def get_vehicle(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Veículo não encontrado.")
    return obj


@router.put("/{item_id}", response_model=VehicleResponse)
def update_vehicle(item_id: UUID, payload: VehicleUpdate, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Veículo não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    if data.get("category_id"):
        category = db.get(VehicleCategory, data["category_id"])
        if not category:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoria não encontrada.")
        data["category_name"] = category.name
    elif data.get("category_name"):
        category = resolve_category_by_name(db, data["category_name"])
        data["category_id"] = category.id
        data["category_name"] = category.name
    return crud.update(db, obj, data)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_vehicle(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Veículo não encontrado.")
    crud.remove(db, obj)
