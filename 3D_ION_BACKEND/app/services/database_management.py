"""
Admin database management: truncate experimental data and seed scientifically coherent mocks.
"""

from __future__ import annotations

import json
import logging
import math
import random
import re
import uuid
from typing import Any, Dict, List, Optional, Tuple

from supabase import Client

from app.services.attenuation_storage import save_attenuation_tests

logger = logging.getLogger(__name__)

# Tables counted to decide if DB is "empty" for seeding
EXPERIMENTAL_TABLES = [
    "samples",
    "materials",
    "machines",
    "infill_measurements",
    "attenuation_tests",
    "linear_attenuation",
]

# Child-first delete order when RPC is unavailable
DELETE_ORDER = [
    "attenuation_measurements",
    "attenuation_tests",
    "ct_scan_points",
    "infill_measurements",
    "linear_attenuation",
    "mechanical_properties",
    "beam_qualities",
    "sample_status_history",
    "samples",
    "materials",
    "machines",
    "historico",
]

SENTINEL_UUID = "00000000-0000-0000-0000-000000000000"

# Tables whose primary key is bigint (not UUID)
BIGINT_ID_TABLES = frozenset({"sample_status_history", "historico"})

INFILL_PCTS = list(range(15, 101, 5))
THICKNESSES_MM = [1.0, 2.0, 5.0, 10.0]
I0_DEFAULT = 100.0

# HU = hu_slope * infill_pct + hu_intercept (+ noise). Intercepts must keep HU > 0
# at 15–100% infill (app validates hu_mean > 0). Negative intercepts were clamped to 1.0.
SEED_BATCH_SIZE = 5

# Five complete experiment profiles (material + HU/attenuation coefficients)
SEED_EXPERIMENT_PROFILES: List[Dict[str, Any]] = [
    {
        "brand": "Generic",
        "model": "PLA Puro",
        "color": "Natural",
        "is_composite": False,
        "composite_details": None,
        "hu_slope": 3.2,
        "hu_intercept": 95.0,
        "mu_base": 0.12,
        "tensile_modulus_mpa": 3500,
        "tensile_strength_mpa": 55,
    },
    {
        "brand": "Generic",
        "model": "ABS",
        "color": "Black",
        "is_composite": False,
        "composite_details": None,
        "hu_slope": 4.5,
        "hu_intercept": 110.0,
        "mu_base": 0.22,
        "tensile_modulus_mpa": 2100,
        "tensile_strength_mpa": 42,
    },
    {
        "brand": "Generic",
        "model": "PLA+Cu",
        "color": "Bronze",
        "is_composite": True,
        "composite_details": "PLA + 5% Cu powder",
        "hu_slope": 7.0,
        "hu_intercept": 180.0,
        "mu_base": 0.35,
        "tensile_modulus_mpa": 3800,
        "tensile_strength_mpa": 48,
    },
    {
        "brand": "Generic",
        "model": "PETG",
        "color": "Clear",
        "is_composite": False,
        "composite_details": None,
        "hu_slope": 3.8,
        "hu_intercept": 105.0,
        "mu_base": 0.18,
        "tensile_modulus_mpa": 2200,
        "tensile_strength_mpa": 50,
    },
    {
        "brand": "Generic",
        "model": "TPU Flex",
        "color": "Gray",
        "is_composite": False,
        "composite_details": None,
        "hu_slope": 2.9,
        "hu_intercept": 88.0,
        "mu_base": 0.15,
        "tensile_modulus_mpa": 26,
        "tensile_strength_mpa": 39,
    },
]

SEED_RQR_TESTS = [
    ("RQR3", 1.0),
    ("RQR5", 1.15),
    ("RQR8", 1.3),
]


def count_table_rows(supabase: Client, table: str) -> int:
    try:
        resp = supabase.table(table).select("id", count="exact").limit(1).execute()
        return int(resp.count or 0)
    except Exception as exc:
        if _is_missing_table_error(exc):
            return 0
        raise


def is_experimental_database_empty(supabase: Client) -> Tuple[bool, int]:
    total = 0
    for table in EXPERIMENTAL_TABLES:
        n = count_table_rows(supabase, table)
        total += n
        if n > 0:
            return False, total
    return True, total


def _api_error_code(exc: Exception) -> Optional[str]:
    code = getattr(exc, "code", None)
    if code:
        return str(code)
    if exc.args and isinstance(exc.args[0], dict):
        return exc.args[0].get("code")
    return None


def _is_missing_table_error(exc: Exception) -> bool:
    code = _api_error_code(exc)
    if code in ("PGRST205", "PGRST202", "42P01"):
        return True
    msg = str(exc).lower()
    return (
        "does not exist" in msg
        or "could not find the table" in msg
        or "could not find the function" in msg
        or "relation" in msg
        or "404" in msg
    )


def _missing_column_from_error(exc: Exception) -> Optional[str]:
    """Extract column name from PostgREST PGRST204 (column not in schema)."""
    if _api_error_code(exc) != "PGRST204":
        return None
    msg = str(exc)
    if exc.args and isinstance(exc.args[0], dict):
        msg = exc.args[0].get("message", msg)
    match = re.search(r"'([^']+)'\s+column", msg)
    return match.group(1) if match else None


def _strip_nulls(row: Dict[str, Any]) -> Dict[str, Any]:
    return {k: v for k, v in row.items() if v is not None}


def _insert_row(supabase: Client, table: str, row: Dict[str, Any]) -> Dict[str, Any]:
    """Insert one row, dropping columns absent from the live Supabase schema."""
    payload = _strip_nulls(dict(row))
    for _ in range(12):
        try:
            resp = supabase.table(table).insert(payload).execute()
            if not resp.data:
                raise RuntimeError(f"Insert em '{table}' não retornou dados")
            return resp.data[0]
        except Exception as exc:
            col = _missing_column_from_error(exc)
            if col and col in payload:
                logger.warning("[seed] Removendo coluna ausente %s.%s", table, col)
                payload.pop(col)
                continue
            raise
    raise RuntimeError(f"Não foi possível inserir em '{table}' após ajustar colunas")


def _insert_rows(supabase: Client, table: str, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Batch insert with the same column fallback as _insert_row."""
    if not rows:
        return []
    payload = [_strip_nulls(dict(r)) for r in rows]
    for _ in range(12):
        try:
            resp = supabase.table(table).insert(payload).execute()
            return resp.data or []
        except Exception as exc:
            col = _missing_column_from_error(exc)
            if col:
                logger.warning("[seed] Removendo coluna ausente %s.%s (lote)", table, col)
                for row in payload:
                    row.pop(col, None)
                continue
            raise
    raise RuntimeError(f"Não foi possível inserir lote em '{table}' após ajustar colunas")


def _delete_all_rows(supabase: Client, table: str) -> None:
    try:
        if table in BIGINT_ID_TABLES:
            supabase.table(table).delete().gte("id", 0).execute()
        else:
            supabase.table(table).delete().neq("id", SENTINEL_UUID).execute()
    except Exception as exc:
        if _is_missing_table_error(exc):
            logger.warning("[truncate] Skipping missing table %s", table)
            return
        raise


def truncate_experimental_data(supabase: Client) -> None:
    """Clear experimental tables; prefer RPC TRUNCATE CASCADE, fallback to ordered deletes."""
    try:
        supabase.rpc("truncate_experimental_data").execute()
        logger.info("[truncate] Completed via RPC truncate_experimental_data")
        return
    except Exception as rpc_exc:
        if not _is_missing_table_error(rpc_exc):
            logger.warning(
                "[truncate] RPC failed (%s), using ordered DELETE fallback",
                rpc_exc,
            )
        else:
            logger.info("[truncate] RPC not deployed, using ordered DELETE fallback")

    errors: List[str] = []
    for table in DELETE_ORDER:
        try:
            _delete_all_rows(supabase, table)
        except Exception as exc:
            if _is_missing_table_error(exc):
                logger.warning("[truncate] Skipping missing table %s", table)
                continue
            errors.append(f"{table}: {exc}")

    if errors:
        raise RuntimeError("; ".join(errors))


def _gaussian_noise(scale: float) -> float:
    return random.gauss(0.0, scale)


def _transmission_noisy(i0: float, mu: float, thickness_mm: float) -> float:
    ideal = i0 * math.exp(-mu * thickness_mm)
    noisy = ideal * (1.0 + random.uniform(-0.02, 0.02))
    return max(noisy, 0.01)


def _hu_for_infill(slope: float, intercept: float, infill_pct: int) -> float:
    """Linear HU model with lab noise; floor > 0 matches API validation."""
    theoretical = slope * infill_pct + intercept
    noisy = theoretical + _gaussian_noise(8.0)
    return max(noisy, 1.01)


def _get_or_create_seed_machine(supabase: Client, researcher_id: str) -> str:
    """Reuse an existing machine when appending seed batches."""
    try:
        existing = (
            supabase.table("machines")
            .select("id")
            .eq("researcher_id", researcher_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]["id"]
    except Exception as exc:
        logger.warning("[seed] Could not query machines: %s", exc)

    machine = _insert_row(
        supabase,
        "machines",
        {
            "researcher_id": researcher_id,
            "brand": "Creality",
            "model": "Ender 3",
            "technology_type": "FDM",
            "other_specs": "Seed machine for AMRAD chart validation",
        },
    )
    return machine["id"]


def _create_complete_experiment(
    supabase: Client,
    researcher_id: str,
    machine_id: str,
    profile: Dict[str, Any],
    batch_tag: str,
) -> str:
    """Create one approved sample with infill, attenuation, beam and mechanical data."""
    model_label = f"{profile['model']} [{batch_tag}]"
    material = _insert_row(
        supabase,
        "materials",
        {
            "researcher_id": researcher_id,
            "brand": profile["brand"],
            "model": model_label,
            "color": profile["color"],
            "is_composite": profile["is_composite"],
            "composite_details": profile.get("composite_details"),
        },
    )
    material_id = material["id"]
    patterns_json = json.dumps(["Rectilinear"])

    sample = _insert_row(
        supabase,
        "samples",
        {
            "researcher_id": researcher_id,
            "material_id": material_id,
            "machine_id": machine_id,
            "shape_type": "Cube",
            "pattern_type": patterns_json,
            "shape_dimension": 20.0,
            "status": "Approved",
        },
    )
    sample_id = sample["id"]

    infill_rows = []
    for pct in INFILL_PCTS:
        hu = _hu_for_infill(profile["hu_slope"], profile["hu_intercept"], pct)
        infill_rows.append(
            {
                "sample_id": sample_id,
                "infill_pct": pct,
                "hu_mean": round(hu, 2),
                "pattern_type": "Rectilinear",
                "notes": "Dado sintético (seed admin)",
                "sd_value": round(abs(_gaussian_noise(3.0)), 2),
                "visual_homogeneity": False,
            }
        )
    _insert_rows(supabase, "infill_measurements", infill_rows)

    attenuation_payload = []
    for rqr_energy, mu_factor in SEED_RQR_TESTS:
        mu = profile["mu_base"] * mu_factor
        measurements = [
            {
                "thickness": t,
                "transmission": round(_transmission_noisy(I0_DEFAULT, mu, t), 4),
            }
            for t in THICKNESSES_MM
        ]
        attenuation_payload.append(
            {"rqr_energy": rqr_energy, "i0": I0_DEFAULT, "measurements": measurements}
        )
    try:
        save_attenuation_tests(supabase, sample_id, attenuation_payload)
    except Exception as att_exc:
        if not _is_missing_table_error(att_exc):
            raise
        logger.warning(
            "[seed] attenuation_tests tables unavailable, using linear_attenuation fallback"
        )
        legacy_rows = []
        for test in attenuation_payload:
            for m in test["measurements"]:
                legacy_rows.append(
                    {
                        "sample_id": sample_id,
                        "thickness": m["thickness"],
                        "value_lambert_beer": m["transmission"],
                    }
                )
        if legacy_rows:
            _insert_rows(supabase, "linear_attenuation", legacy_rows)

    _insert_row(
        supabase,
        "beam_qualities",
        {
            "sample_id": sample_id,
            "rqr_3": profile["mu_base"] * 1.0,
            "rqr_5": profile["mu_base"] * 1.15,
            "rqr_8": profile["mu_base"] * 1.3,
        },
    )

    try:
        _insert_row(
            supabase,
            "mechanical_properties",
            {
                "sample_id": sample_id,
                "tensile_modulus_mpa": profile.get("tensile_modulus_mpa"),
                "tensile_strength_mpa": profile.get("tensile_strength_mpa"),
                "break_deformation_percent": round(8 + random.uniform(0, 6), 2),
                "flexural_modulus_mpa": profile.get("tensile_modulus_mpa", 2000) * 0.9,
                "flexural_strength_mpa": profile.get("tensile_strength_mpa", 40) * 0.85,
                "test_condition": "Seed sintético — ambiente de testes",
            },
        )
    except Exception as mech_exc:
        if not _is_missing_table_error(mech_exc):
            col = _missing_column_from_error(mech_exc)
            if col:
                logger.warning("[seed] mechanical_properties: coluna %s ausente, ignorando", col)
            else:
                raise

    return sample_id


def seed_experimental_data(supabase: Client, researcher_id: str) -> Dict[str, Any]:
    """
    Append SEED_BATCH_SIZE complete approved experiments (material, sample, infill,
    attenuation, beam qualities, mechanical). Safe to run multiple times.
    """
    batch_tag = uuid.uuid4().hex[:6]
    machine_id = _get_or_create_seed_machine(supabase, researcher_id)
    profiles = SEED_EXPERIMENT_PROFILES[:SEED_BATCH_SIZE]

    sample_ids: List[str] = []
    for profile in profiles:
        sample_ids.append(
            _create_complete_experiment(
                supabase, researcher_id, machine_id, profile, batch_tag
            )
        )

    return {
        "batch_tag": batch_tag,
        "materials_created": len(profiles),
        "machine_id": machine_id,
        "samples_created": len(sample_ids),
        "sample_ids": sample_ids,
        "infill_points_per_sample": len(INFILL_PCTS),
        "attenuation_tests_per_sample": len(SEED_RQR_TESTS),
    }
