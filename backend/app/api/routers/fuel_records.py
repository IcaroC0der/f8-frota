from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.api.resolvers import resolve_fuel_cost_type, resolve_vehicle_by_plate
from app.core.database import get_db
from app.crud.base import CRUDBase
from app.models.fuel_record import FuelRecord
from app.schemas.fuel import FuelRecordCreate, FuelRecordResponse, FuelRecordUpdate

router = APIRouter(
    prefix="/fuel-records",
    tags=["fuel-records"],
    dependencies=[Depends(get_current_user)],
)
crud = CRUDBase(FuelRecord)


def _resolve_fks(db: Session, data: dict) -> None:
    """Preenche vehicle_id / fuel_cost_type_id a partir de placa e tipo de custo."""
    if not data.get("vehicle_id") and data.get("plate"):
        data["vehicle_id"] = resolve_vehicle_by_plate(db, data["plate"]).id
    if not data.get("fuel_cost_type_id") and data.get("cost_type") and data.get("cost_name"):
        data["fuel_cost_type_id"] = resolve_fuel_cost_type(
            db, data["cost_type"], data["cost_name"]
        ).id


@router.get("", response_model=list[FuelRecordResponse])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_multi(db, skip=skip, limit=limit)


@router.post("", response_model=FuelRecordResponse, status_code=status.HTTP_201_CREATED)
def create_item(payload: FuelRecordCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    _resolve_fks(db, data)
    return crud.create(db, data)


@router.get("/{item_id}", response_model=FuelRecordResponse)
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Abastecimento não encontrado.")
    return obj


@router.put("/{item_id}", response_model=FuelRecordResponse)
def update_item(item_id: UUID, payload: FuelRecordUpdate, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Abastecimento não encontrado.")
    data = payload.model_dump(exclude_unset=True)
    _resolve_fks(db, data)
    return crud.update(db, obj, data)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_item(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Abastecimento não encontrado.")
    crud.remove(db, obj)
