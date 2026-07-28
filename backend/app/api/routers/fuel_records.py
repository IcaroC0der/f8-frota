from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.api.resolvers import resolve_fuel_cost_type, resolve_vehicle_by_plate
from app.core.database import get_db
from app.crud.base import CRUDBase
from app.models.fuel_cost_type import FuelCostType
from app.models.fuel_record import FuelRecord
from app.models.vehicle import Vehicle
from app.schemas.fuel import (
    FuelRecordBulkCreate,
    FuelRecordBulkResult,
    FuelRecordCreate,
    FuelRecordResponse,
    FuelRecordUpdate,
)

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


@router.post("/bulk", response_model=FuelRecordBulkResult, status_code=status.HTTP_201_CREATED)
def bulk_create(payload: FuelRecordBulkCreate, db: Session = Depends(get_db)):
    """Importação em massa. Por linha: resolve a placa (pula e reporta se o
    veículo não estiver cadastrado) e cria o tipo de combustível se não existir.
    Cada linha usa um savepoint, então uma falha não derruba o lote inteiro."""
    created = 0
    errors: list[dict] = []
    for i, item in enumerate(payload.records):
        data = item.model_dump()
        plate = (data.get("plate") or "").strip()
        try:
            with db.begin_nested():
                vehicle = db.scalar(
                    select(Vehicle).where(func.upper(Vehicle.plate) == plate.upper())
                )
                if not vehicle:
                    raise ValueError("Placa não cadastrada")
                fct = db.scalar(
                    select(FuelCostType).where(
                        func.upper(FuelCostType.cost_type) == (data.get("cost_type") or "").strip().upper(),
                        func.upper(FuelCostType.cost_name) == (data.get("cost_name") or "").strip().upper(),
                    )
                )
                if not fct:
                    fct = FuelCostType(cost_type=data["cost_type"], cost_name=data["cost_name"], is_active=True)
                    db.add(fct)
                    db.flush()
                data["vehicle_id"] = vehicle.id
                data["fuel_cost_type_id"] = fct.id
                data["vehicle_model"] = data.get("vehicle_model") or vehicle.vehicle_model
                data["category_name"] = data.get("category_name") or vehicle.category_name
                db.add(FuelRecord(**data))
            created += 1
        except Exception as e:  # noqa: BLE001
            errors.append({"index": i, "plate": plate, "reason": str(e)[:200]})
    db.commit()
    return {"created": created, "skipped": len(errors), "errors": errors[:300]}


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
