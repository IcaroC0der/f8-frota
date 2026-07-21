"""Resolvedores de FK a partir dos campos denormalizados (placa, nomes, etc).

O Base44 ligava registros por string; aqui traduzimos esses valores para as
FKs reais na hora de criar/atualizar via API. Espelha a lógica do importador.
"""
from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.fuel_cost_type import FuelCostType
from app.models.maintenance_classification import MaintenanceClassification
from app.models.maintenance_cost_type import MaintenanceCostType
from app.models.operational_cost import OperationalCost
from app.models.vehicle import Vehicle
from app.models.vehicle_category import VehicleCategory


def _norm(value: str | None) -> str:
    return (value or "").strip().upper()


def resolve_vehicle_by_plate(db: Session, plate: str) -> Vehicle:
    vehicle = db.scalar(
        select(Vehicle).where(func.upper(Vehicle.plate) == _norm(plate))
    )
    if not vehicle:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Veículo com placa '{plate}' não encontrado."
        )
    return vehicle


def resolve_category_by_name(db: Session, name: str) -> VehicleCategory:
    category = db.scalar(
        select(VehicleCategory).where(func.upper(VehicleCategory.name) == _norm(name))
    )
    if not category:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Categoria '{name}' não encontrada."
        )
    return category


def resolve_fuel_cost_type(db: Session, cost_type: str, cost_name: str) -> FuelCostType:
    fct = db.scalar(
        select(FuelCostType).where(
            func.upper(FuelCostType.cost_type) == _norm(cost_type),
            func.upper(FuelCostType.cost_name) == _norm(cost_name),
        )
    )
    if not fct:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"Tipo de custo de combustível '{cost_type}/{cost_name}' não encontrado.",
        )
    return fct


def resolve_classification(db: Session, name: str) -> MaintenanceClassification:
    cls = db.scalar(
        select(MaintenanceClassification).where(
            func.upper(MaintenanceClassification.name) == _norm(name)
        )
    )
    if not cls:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Classificação '{name}' não encontrada."
        )
    return cls


def resolve_maintenance_cost_type(
    db: Session, classification: str, cost_group: str, cost_type: str
) -> MaintenanceCostType | None:
    """Best-effort: nem todo registro tem combinação exata no lookup (~91%).
    Retorna None em vez de erro quando não há match."""
    return db.scalar(
        select(MaintenanceCostType).where(
            func.upper(MaintenanceCostType.classification) == _norm(classification),
            func.upper(MaintenanceCostType.cost_group) == _norm(cost_group),
            func.upper(MaintenanceCostType.cost_type) == _norm(cost_type),
        )
    )


def resolve_operational_cost(db: Session, name: str) -> OperationalCost:
    oc = db.scalar(
        select(OperationalCost).where(func.upper(OperationalCost.name) == _norm(name))
    )
    if not oc:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, f"Custo operacional '{name}' não encontrado."
        )
    return oc
