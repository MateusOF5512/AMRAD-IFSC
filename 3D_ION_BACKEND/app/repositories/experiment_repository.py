"""Supabase data access for experiment (sample) aggregates."""

from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status
from supabase import Client

from app.database.supabase import get_supabase_client
from app.services.attenuation_storage import fetch_attenuation_tests_for_sample


def _fetch_one(
    supabase: Client,
    table: str,
    filters: dict[str, Any],
    *,
    columns: str = "*",
) -> dict | None:
    query = supabase.table(table).select(columns)
    for key, value in filters.items():
        query = query.eq(key, value)
    response = query.execute()
    if response.data:
        return response.data[0]
    return None


def _fetch_many(
    supabase: Client,
    table: str,
    filters: dict[str, Any],
    *,
    columns: str = "*",
) -> list[dict]:
    query = supabase.table(table).select(columns)
    for key, value in filters.items():
        query = query.eq(key, value)
    response = query.execute()
    return response.data or []


def fetch_experiment_raw(
    experiment_id: str,
    supabase: Client | None = None,
    *,
    not_found_detail: str = "Experiment not found",
) -> dict[str, Any]:
    """
    Load sample and all related records for an experiment.

    Returns a normalized dict used by public and admin detail endpoints.
    """
    db = supabase or get_supabase_client()

    sample = _fetch_one(db, "samples", {"id": experiment_id})
    if not sample:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=not_found_detail,
        )

    researcher_id = sample.get("researcher_id")
    material_id = sample.get("material_id")
    machine_id = sample.get("machine_id")

    researcher = (
        _fetch_one(
            db,
            "researchers",
            {"id": researcher_id},
            columns="id, name, institution, email, phone_number, instagram",
        )
        if researcher_id
        else None
    )
    material = _fetch_one(db, "materials", {"id": material_id}) if material_id else None
    machine = _fetch_one(db, "machines", {"id": machine_id}) if machine_id else None

    infill_measurements = _fetch_many(
        db, "infill_measurements", {"sample_id": experiment_id}
    )
    mechanical_rows = _fetch_many(
        db, "mechanical_properties", {"sample_id": experiment_id}
    )
    linear_attenuation = _fetch_many(
        db, "linear_attenuation", {"sample_id": experiment_id}
    )
    beam_rows = _fetch_many(db, "beam_qualities", {"sample_id": experiment_id})
    attenuation_tests = fetch_attenuation_tests_for_sample(db, experiment_id)

    return {
        "sample": sample,
        "researcher": researcher,
        "material": material,
        "machine": machine,
        "infill_measurements": infill_measurements,
        "mechanical_properties": mechanical_rows,
        "linear_attenuation": linear_attenuation,
        "beam_qualities": beam_rows,
        "attenuation_tests": attenuation_tests,
    }


def fetch_admin_experiment_details(experiment_id: str) -> dict[str, Any]:
    """Admin detail payload (nested raw records)."""
    raw = fetch_experiment_raw(
        experiment_id,
        not_found_detail="Experimento não encontrado",
    )
    return {
        "sample": raw["sample"],
        "researcher": raw["researcher"],
        "material": raw["material"],
        "machine": raw["machine"],
        "beam_qualities": raw["beam_qualities"],
        "infill_measurements": raw["infill_measurements"],
        "linear_attenuation": raw["linear_attenuation"],
        "mechanical_properties": raw["mechanical_properties"],
    }
