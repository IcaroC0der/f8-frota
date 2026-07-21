from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.api.resolvers import resolve_operational_cost, resolve_vehicle_by_plate
from app.core.database import get_db
from app.crud.base import CRUDBase
from app.models.operational_cost_record import OperationalCostRecord
from app.schemas.operational import (
    OperationalCostRecordCreate,
    OperationalCostRecordResponse,
    OperationalCostRecordUpdate,
)

router = APIRouter(
    prefix="/operational-cost-records",
    tags=["operational-cost-records"],
    dependencies=[Depends(get_current_user)],
)
crud = CRUDBase(OperationalCostRecord)


def _resolve_fks(db: Session, data: dict) -> None:
    if not data.get("operational_cost_id") and data.get("cost_name"):
        data["operational_cost_id"] = resolve_operational_cost(db, data["cost_name"]).id
    # Placa é opcional neste lançamento; só resolve se veio preenchida.
    if not data.get("vehicle_id") and data.get("plate"):
        data["vehicle_id"] = resolve_vehicle_by_plate(db, data["plate"]).id


@router.get("", response_model=list[OperationalCostRecordResponse])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_multi(db, skip=skip, limit=limit)


@router.post(
    "", response_model=OperationalCostRecordResponse, status_code=status.HTTP_201_CREATED
)
def create_item(payload: OperationalCostRecordCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    _resolve_fks(db, data)
    return crud.create(db, data)


@router.get("/{item_id}", response_model=OperationalCostRecordResponse)
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lançamento não encontrado.")
    return obj


@router.put("/{item_id}", response_model=OperationalCostRecordResponse)
def update_item(
    item_id: UUID, payload: OperationalCostRecordUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lançamento não encontrado.")
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
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Lançamento não encontrado.")
    crud.remove(db, obj)
