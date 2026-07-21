"""Agrega todos os routers sob o prefixo da API."""
from fastapi import APIRouter

from app.api.routers import (
    auth,
    fuel_cost_types,
    fuel_records,
    maintenance_classifications,
    maintenance_cost_types,
    maintenance_records,
    operational_cost_records,
    operational_costs,
    users,
    vehicle_categories,
    vehicles,
)

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(vehicle_categories.router)
api_router.include_router(vehicles.router)
api_router.include_router(fuel_cost_types.router)
api_router.include_router(fuel_records.router)
api_router.include_router(maintenance_classifications.router)
api_router.include_router(maintenance_cost_types.router)
api_router.include_router(maintenance_records.router)
api_router.include_router(operational_costs.router)
api_router.include_router(operational_cost_records.router)
