from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.crud.base import CRUDBase
from app.models.vehicle_category import VehicleCategory
from app.schemas.vehicle_category import (
    VehicleCategoryCreate,
    VehicleCategoryResponse,
    VehicleCategoryUpdate,
)

router = APIRouter(
    prefix="/vehicle-categories",
    tags=["vehicle-categories"],
    dependencies=[Depends(get_current_user)],
)
crud = CRUDBase(VehicleCategory)


@router.get("", response_model=list[VehicleCategoryResponse])
def list_categories(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_multi(db, skip=skip, limit=limit)


@router.post("", response_model=VehicleCategoryResponse, status_code=status.HTTP_201_CREATED)
def create_category(payload: VehicleCategoryCreate, db: Session = Depends(get_db)):
    return crud.create(db, payload.model_dump())


@router.get("/{item_id}", response_model=VehicleCategoryResponse)
def get_category(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoria não encontrada.")
    return obj


@router.put("/{item_id}", response_model=VehicleCategoryResponse)
def update_category(
    item_id: UUID, payload: VehicleCategoryUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoria não encontrada.")
    return crud.update(db, obj, payload.model_dump(exclude_unset=True))


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_category(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Categoria não encontrada.")
    crud.remove(db, obj)
