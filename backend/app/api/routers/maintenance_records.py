from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.api.resolvers import (
    resolve_classification,
    resolve_maintenance_cost_type,
    resolve_vehicle_by_plate,
)
from app.core.database import get_db
from app.crud.base import CRUDBase
from app.models.maintenance_record import MaintenanceRecord
from app.schemas.maintenance import (
    MaintenanceRecordCreate,
    MaintenanceRecordResponse,
    MaintenanceRecordUpdate,
)

router = APIRouter(
    prefix="/maintenance-records",
    tags=["maintenance-records"],
    dependencies=[Depends(get_current_user)],
)
crud = CRUDBase(MaintenanceRecord)


def _resolve_fks(db: Session, data: dict) -> None:
    if not data.get("vehicle_id") and data.get("plate"):
        data["vehicle_id"] = resolve_vehicle_by_plate(db, data["plate"]).id
    if not data.get("classification_id") and data.get("classification"):
        data["classification_id"] = resolve_classification(db, data["classification"]).id
    # Tipo de custo é best-effort: se não achar a combinação exata, fica nulo.
    if (
        not data.get("maintenance_cost_type_id")
        and data.get("classification")
        and data.get("cost_group")
        and data.get("cost_type")
    ):
        match = resolve_maintenance_cost_type(
            db, data["classification"], data["cost_group"], data["cost_type"]
        )
        if match:
            data["maintenance_cost_type_id"] = match.id


@router.get("", response_model=list[MaintenanceRecordResponse])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_multi(db, skip=skip, limit=limit)


@router.post(
    "", response_model=MaintenanceRecordResponse, status_code=status.HTTP_201_CREATED
)
def create_item(payload: MaintenanceRecordCreate, db: Session = Depends(get_db)):
    data = payload.model_dump()
    _resolve_fks(db, data)
    return crud.create(db, data)


@router.get("/{item_id}", response_model=MaintenanceRecordResponse)
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Manutenção não encontrada.")
    return obj


@router.put("/{item_id}", response_model=MaintenanceRecordResponse)
def update_item(
    item_id: UUID, payload: MaintenanceRecordUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Manutenção não encontrada.")
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
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Manutenção não encontrada.")
    crud.remove(db, obj)
