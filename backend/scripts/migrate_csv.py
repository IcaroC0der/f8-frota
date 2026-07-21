"""Importa os CSVs exportados do Base44 para o PostgreSQL.

Uso:
    python -m scripts.migrate_csv                 # usa ../dados_export_csv
    python -m scripts.migrate_csv /caminho/csvs   # diretório alternativo

Características:
  - Ordem por dependência (lookups → veículos → lançamentos).
  - Preserva o id original do Base44 em `legacy_id` e os timestamps/created_by.
  - Resolve FKs pelos campos denormalizados (placa, nomes), como a API faz.
  - Idempotente: registros já importados (mesmo legacy_id) são pulados.
  - Usa parser CSV real (campos com quebra de linha em `observation`).
"""
from __future__ import annotations

import csv
import sys
from datetime import date, datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

from sqlalchemy import select

from app.core.database import SessionLocal
from app.models.fuel_cost_type import FuelCostType
from app.models.fuel_record import FuelRecord
from app.models.maintenance_classification import MaintenanceClassification
from app.models.maintenance_cost_type import MaintenanceCostType
from app.models.maintenance_record import MaintenanceRecord
from app.models.operational_cost import OperationalCost
from app.models.operational_cost_record import OperationalCostRecord
from app.models.vehicle import Vehicle
from app.models.vehicle_category import VehicleCategory

DEFAULT_DIR = Path(__file__).resolve().parents[2] / "dados_export_csv"


# ─────────────────────────── conversores ─────────────────────────────
def s(v: str | None) -> str | None:
    v = (v or "").strip()
    return v or None


def norm(v: str | None) -> str:
    return (v or "").strip().upper()


def dec(v: str | None) -> Decimal | None:
    v = (v or "").strip()
    if not v:
        return None
    try:
        return Decimal(v)
    except InvalidOperation:
        return None


def intval(v: str | None) -> int | None:
    v = (v or "").strip()
    if not v:
        return None
    try:
        return int(float(v))
    except ValueError:
        return None


def dval(v: str | None) -> date | None:
    v = (v or "").strip()
    if not v:
        return None
    try:
        return date.fromisoformat(v[:10])
    except ValueError:
        return None


def tsval(v: str | None) -> datetime | None:
    v = (v or "").strip()
    if not v:
        return None
    try:
        dt = datetime.fromisoformat(v)
    except ValueError:
        return None
    return dt.replace(tzinfo=timezone.utc) if dt.tzinfo is None else dt


def boolv(v: str | None, default: bool = True) -> bool:
    v = (v or "").strip().lower()
    if v in ("true", "1", "t", "yes"):
        return True
    if v in ("false", "0", "f", "no"):
        return False
    return default


def read_csv(path: Path) -> list[dict]:
    with path.open(encoding="utf-8-sig", newline="") as fh:
        return list(csv.DictReader(fh))


def apply_meta(obj, row: dict) -> None:
    """Copia legacy_id / created_by / timestamps do Base44 para o model."""
    obj.legacy_id = s(row.get("id"))
    obj.created_by = s(row.get("created_by"))
    created = tsval(row.get("created_date"))
    updated = tsval(row.get("updated_date"))
    if created:
        obj.created_at = created
    if updated:
        obj.updated_at = updated


# ─────────────────────────────── main ────────────────────────────────
def main(data_dir: Path) -> None:
    if not data_dir.exists():
        raise SystemExit(f"Diretório de CSVs não encontrado: {data_dir}")

    db = SessionLocal()
    report: list[str] = []

    def existing_legacy_ids(model) -> set[str]:
        return set(db.scalars(select(model.legacy_id)).all())

    try:
        # 1) VehicleCategory ------------------------------------------------
        seen = existing_legacy_ids(VehicleCategory)
        added = 0
        for row in read_csv(data_dir / "VehicleCategory_export.csv"):
            if row["id"] in seen:
                continue
            obj = VehicleCategory(
                name=s(row["name"]) or "",
                description=s(row.get("description")),
                is_active=boolv(row.get("is_active")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        cat_by_name = {norm(c.name): c for c in db.scalars(select(VehicleCategory))}
        cat_by_legacy = {c.legacy_id: c for c in cat_by_name.values()}
        report.append(f"VehicleCategory: +{added} (total {len(cat_by_name)})")

        # 2) FuelCostType ---------------------------------------------------
        seen = existing_legacy_ids(FuelCostType)
        added = 0
        for row in read_csv(data_dir / "FuelCostType_export.csv"):
            if row["id"] in seen:
                continue
            obj = FuelCostType(
                cost_name=s(row["cost_name"]) or "",
                cost_type=s(row["cost_type"]) or "",
                is_active=boolv(row.get("is_active")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        fct_by_key = {
            (norm(x.cost_type), norm(x.cost_name)): x
            for x in db.scalars(select(FuelCostType))
        }
        report.append(f"FuelCostType: +{added} (total {len(fct_by_key)})")

        # 3) MaintenanceClassification -------------------------------------
        seen = existing_legacy_ids(MaintenanceClassification)
        added = 0
        for row in read_csv(data_dir / "MaintenanceClassification_export.csv"):
            if row["id"] in seen:
                continue
            obj = MaintenanceClassification(
                name=s(row["name"]) or "",
                is_active=boolv(row.get("is_active")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        cls_by_name = {
            norm(x.name): x for x in db.scalars(select(MaintenanceClassification))
        }
        report.append(f"MaintenanceClassification: +{added} (total {len(cls_by_name)})")

        # 4) MaintenanceCostType -------------------------------------------
        seen = existing_legacy_ids(MaintenanceCostType)
        added = 0
        for row in read_csv(data_dir / "MaintenanceCostType_export.csv"):
            if row["id"] in seen:
                continue
            obj = MaintenanceCostType(
                classification=s(row["classification"]) or "",
                cost_group=s(row["cost_group"]) or "",
                cost_type=s(row["cost_type"]) or "",
                is_active=boolv(row.get("is_active")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        mct_by_key = {
            (norm(x.classification), norm(x.cost_group), norm(x.cost_type)): x
            for x in db.scalars(select(MaintenanceCostType))
        }
        report.append(f"MaintenanceCostType: +{added} (total {len(mct_by_key)})")

        # 5) OperationalCost -----------------------------------------------
        seen = existing_legacy_ids(OperationalCost)
        added = 0
        for row in read_csv(data_dir / "OperationalCost_export.csv"):
            if row["id"] in seen:
                continue
            obj = OperationalCost(
                name=s(row["name"]) or "",
                description=s(row.get("description")),
                is_active=boolv(row.get("is_active")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        oc_by_name = {norm(x.name): x for x in db.scalars(select(OperationalCost))}
        report.append(f"OperationalCost: +{added} (total {len(oc_by_name)})")

        # 6) Vehicle --------------------------------------------------------
        seen = existing_legacy_ids(Vehicle)
        added = skipped = 0
        for row in read_csv(data_dir / "Vehicle_export.csv"):
            if row["id"] in seen:
                continue
            category = cat_by_legacy.get(row.get("category_id")) or cat_by_name.get(
                norm(row.get("category_name"))
            )
            if not category:
                skipped += 1
                continue
            obj = Vehicle(
                plate=s(row["plate"]) or "",
                category_id=category.id,
                category_name=category.name,
                vehicle_model=s(row.get("vehicle_model")),
                chassis=s(row.get("chassis")),
                renavan=s(row.get("renavan")),
                year=s(row.get("year")),
                company=s(row.get("company")),
                driver=s(row.get("driver")),
                tracker=boolv(row.get("tracker"), default=False),
                is_active=boolv(row.get("is_active")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        veh_by_plate = {norm(v.plate): v for v in db.scalars(select(Vehicle))}
        report.append(f"Vehicle: +{added} (total {len(veh_by_plate)}) skip={skipped}")

        # 7) FuelRecord -----------------------------------------------------
        seen = existing_legacy_ids(FuelRecord)
        added = skipped = 0
        for row in read_csv(data_dir / "FuelRecord_export.csv"):
            if row["id"] in seen:
                continue
            vehicle = veh_by_plate.get(norm(row.get("plate")))
            fct = fct_by_key.get((norm(row.get("cost_type")), norm(row.get("cost_name"))))
            if not vehicle or not fct:
                skipped += 1
                continue
            obj = FuelRecord(
                date=dval(row["date"]),
                vehicle_id=vehicle.id,
                fuel_cost_type_id=fct.id,
                plate=s(row["plate"]) or "",
                vehicle_model=s(row.get("vehicle_model")),
                category_name=s(row.get("category_name")),
                cost_name=s(row["cost_name"]) or "",
                cost_type=s(row["cost_type"]) or "",
                invoice_number=s(row.get("invoice_number")),
                supplier=s(row.get("supplier")),
                unit=s(row.get("unit")) or "LT",
                km=intval(row.get("km")),
                quantity=dec(row.get("quantity")) or Decimal(0),
                total_value=dec(row.get("total_value")) or Decimal(0),
                observation=s(row.get("observation")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        report.append(f"FuelRecord: +{added} skip={skipped}")

        # 8) MaintenanceRecord ---------------------------------------------
        seen = existing_legacy_ids(MaintenanceRecord)
        added = skipped = no_cost_type = 0
        for row in read_csv(data_dir / "MaintenanceRecord_export.csv"):
            if row["id"] in seen:
                continue
            vehicle = veh_by_plate.get(norm(row.get("plate")))
            classification = cls_by_name.get(norm(row.get("classification")))
            if not vehicle or not classification:
                skipped += 1
                continue
            mct = mct_by_key.get(
                (norm(row.get("classification")), norm(row.get("cost_group")), norm(row.get("cost_type")))
            )
            if not mct:
                no_cost_type += 1
            obj = MaintenanceRecord(
                date=dval(row["date"]),
                vehicle_id=vehicle.id,
                classification_id=classification.id,
                maintenance_cost_type_id=mct.id if mct else None,
                plate=s(row["plate"]) or "",
                vehicle_model=s(row.get("vehicle_model")),
                category_name=s(row.get("category_name")),
                classification=s(row["classification"]) or "",
                cost_group=s(row["cost_group"]) or "",
                cost_type=s(row["cost_type"]) or "",
                supplier=s(row.get("supplier")),
                invoice_number=s(row.get("invoice_number")),
                attachment_url=s(row.get("attachment_url")),
                km=intval(row.get("km")),
                total_value=dec(row.get("total_value")) or Decimal(0),
                observation=s(row.get("observation")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        report.append(
            f"MaintenanceRecord: +{added} skip={skipped} (sem_cost_type_fk={no_cost_type})"
        )

        # 9) OperationalCostRecord -----------------------------------------
        seen = existing_legacy_ids(OperationalCostRecord)
        added = skipped = 0
        for row in read_csv(data_dir / "OperationalCostRecord_export.csv"):
            if row["id"] in seen:
                continue
            oc = oc_by_name.get(norm(row.get("cost_name")))
            if not oc:
                skipped += 1
                continue
            vehicle = veh_by_plate.get(norm(row.get("plate"))) if s(row.get("plate")) else None
            obj = OperationalCostRecord(
                date=dval(row["date"]),
                operational_cost_id=oc.id,
                vehicle_id=vehicle.id if vehicle else None,
                cost_name=s(row["cost_name"]) or "",
                plate=s(row.get("plate")),
                vehicle_model=s(row.get("vehicle_model")),
                category_name=s(row.get("category_name")),
                supplier=s(row.get("supplier")),
                invoice_number=s(row.get("invoice_number")),
                attachment_url=s(row.get("attachment_url")),
                km=intval(row.get("km")),
                total_value=dec(row.get("total_value")) or Decimal(0),
                observation=s(row.get("observation")),
            )
            apply_meta(obj, row)
            db.add(obj)
            added += 1
        db.commit()
        report.append(f"OperationalCostRecord: +{added} skip={skipped}")

    except Exception:
        db.rollback()
        raise
    finally:
        db.close()

    print("\n=== IMPORTAÇÃO CONCLUÍDA ===")
    for line in report:
        print("  " + line)


if __name__ == "__main__":
    directory = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_DIR
    main(directory)
