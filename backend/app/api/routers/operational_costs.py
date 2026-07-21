from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin
from app.core.database import get_db
from app.crud.base import CRUDBase
from app.models.operational_cost import OperationalCost
from app.schemas.operational import (
    OperationalCostCreate,
    OperationalCostResponse,
    OperationalCostUpdate,
)

router = APIRouter(
    prefix="/operational-costs",
    tags=["operational-costs"],
    dependencies=[Depends(get_current_user)],
)
crud = CRUDBase(OperationalCost)


@router.get("", response_model=list[OperationalCostResponse])
def list_items(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_multi(db, skip=skip, limit=limit)


@router.post("", response_model=OperationalCostResponse, status_code=status.HTTP_201_CREATED)
def create_item(payload: OperationalCostCreate, db: Session = Depends(get_db)):
    return crud.create(db, payload.model_dump())


@router.get("/{item_id}", response_model=OperationalCostResponse)
def get_item(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Custo operacional não encontrado.")
    return obj


@router.put("/{item_id}", response_model=OperationalCostResponse)
def update_item(
    item_id: UUID, payload: OperationalCostUpdate, db: Session = Depends(get_db)
):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Custo operacional não encontrado.")
    return crud.update(db, obj, payload.model_dump(exclude_unset=True))


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_admin)],
)
def delete_item(item_id: UUID, db: Session = Depends(get_db)):
    obj = crud.get(db, item_id)
    if not obj:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Custo operacional não encontrado.")
    crud.remove(db, obj)
