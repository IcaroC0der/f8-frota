"""Importa todos os models para que fiquem registrados na Base.metadata
(usado pelo Alembic autogenerate e pela resolução de relationships)."""
from app.models.base import Base
from app.models.fuel_cost_type import FuelCostType
from app.models.fuel_record import FuelRecord
from app.models.maintenance_classification import MaintenanceClassification
from app.models.maintenance_cost_type import MaintenanceCostType
from app.models.maintenance_record import MaintenanceRecord
from app.models.operational_cost import OperationalCost
from app.models.operational_cost_record import OperationalCostRecord
from app.models.user import User
from app.models.vehicle import Vehicle
from app.models.vehicle_category import VehicleCategory

__all__ = [
    "Base",
    "FuelCostType",
    "FuelRecord",
    "MaintenanceClassification",
    "MaintenanceCostType",
    "MaintenanceRecord",
    "OperationalCost",
    "OperationalCostRecord",
    "User",
    "Vehicle",
    "VehicleCategory",
]
