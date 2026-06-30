"""Build public experiment detail responses from repository data."""

from __future__ import annotations

from typing import Any

from app.schemas.experiment import ExperimentDetailResponse


def _format_infill_measurements(rows: list[dict]) -> list[dict]:
    return [
        {
            "id": row.get("id"),
            "infill_pct": row.get("infill_pct"),
            "infill_percentage": row.get("infill_pct"),
            "hu_mean": row.get("hu_mean"),
            "hu_value": row.get("hu_mean"),
            "sd_value": row.get("sd_value"),
            "visual_homogeneity": row.get("visual_homogeneity"),
            "pattern_type": row.get("pattern_type"),
            "pattern_type_id": row.get("pattern_type_id"),
            "dimension_a": row.get("dimension_a"),
            "dimension_b": row.get("dimension_b"),
            "regression_r_squared": row.get("regression_r_squared"),
            "image_url": row.get("image_url"),
            "image_urls": row.get("image_urls"),
            "notes": row.get("notes"),
            "created_at": row.get("created_at"),
        }
        for row in rows
    ]


def _format_mechanical(mechanical: dict | None) -> dict | None:
    if not mechanical:
        return None
    return {
        "id": mechanical.get("id"),
        "tensile_modulus_mpa": mechanical.get("tensile_modulus_mpa"),
        "tensile_strength_mpa": mechanical.get("tensile_strength_mpa"),
        "break_deformation_percent": mechanical.get("break_deformation_percent"),
        "impact_charpy_kj_m2": mechanical.get("impact_charpy_kj_m2"),
        "impact_izod": mechanical.get("impact_izod"),
        "hardness_rockwell": mechanical.get("hardness_rockwell"),
        "flexural_modulus_mpa": mechanical.get("flexural_modulus_mpa"),
        "flexural_strength_mpa": mechanical.get("flexural_strength_mpa"),
        "test_condition": mechanical.get("test_condition"),
        "created_at": mechanical.get("created_at"),
    }


def _format_linear_attenuation(rows: list[dict]) -> list[dict]:
    return [
        {
            "id": row.get("id"),
            "thickness": row.get("thickness"),
            "value_lambert_beer": row.get("value_lambert_beer"),
            "created_at": row.get("created_at"),
        }
        for row in rows
    ]


def _format_beam_qualities(beam: dict | None) -> dict | None:
    if not beam:
        return None
    return {
        "id": beam.get("id"),
        "rqr_2": beam.get("rqr_2"),
        "rqr_3": beam.get("rqr_3"),
        "rqr_4": beam.get("rqr_4"),
        "rqr_5": beam.get("rqr_5"),
        "rqr_6": beam.get("rqr_6"),
        "rqr_7": beam.get("rqr_7"),
        "rqr_8": beam.get("rqr_8"),
        "rqr_9": beam.get("rqr_9"),
        "rqr_10": beam.get("rqr_10"),
        "rqt_8": beam.get("rqt_8"),
        "rqt_9": beam.get("rqt_9"),
        "rqt_10": beam.get("rqt_10"),
        "rqr_m1": beam.get("rqr_m1"),
        "rqr_m2": beam.get("rqr_m2"),
        "rqr_m3": beam.get("rqr_m3"),
        "rqr_m4": beam.get("rqr_m4"),
        "created_at": beam.get("created_at"),
    }


def build_experiment_detail_response(
    raw: dict[str, Any],
    *,
    include_contact: bool = True,
) -> ExperimentDetailResponse:
    """Map repository aggregate to the public detail DTO."""
    sample = raw["sample"]
    researcher = raw.get("researcher") or {}
    material = raw.get("material") or {}
    machine = raw.get("machine") or {}
    experiment_id = sample.get("id")

    mechanical_props = (
        raw["mechanical_properties"][0] if raw.get("mechanical_properties") else None
    )
    beam_qualities = raw["beam_qualities"][0] if raw.get("beam_qualities") else None

    return ExperimentDetailResponse(
        experiment_id=experiment_id,
        index_visual=sample.get("index_visual"),
        researcher_id=sample.get("researcher_id"),
        material_id=sample.get("material_id") or "",
        machine_id=sample.get("machine_id") or "",
        status=sample.get("status") or "Submitted",
        created_at=sample.get("created_at"),
        updated_at=sample.get("updated_at"),
        researcher_name=researcher.get("name"),
        researcher_institution=researcher.get("institution"),
        researcher_email=researcher.get("email") if include_contact else None,
        researcher_phone=researcher.get("phone_number") if include_contact else None,
        researcher_instagram=researcher.get("instagram") if include_contact else None,
        material_brand=material.get("brand"),
        material_model=material.get("model"),
        material_color=material.get("color"),
        material_is_composite=material.get("is_composite"),
        material_composite_details=material.get("composite_details"),
        machine_brand=machine.get("brand"),
        machine_model=machine.get("model"),
        machine_technology=machine.get("technology_type"),
        machine_specs=machine.get("other_specs"),
        shape_type=sample.get("shape_type"),
        shape_dimension=sample.get("shape_dimension"),
        circle_roi_area=sample.get("circle_roi_area"),
        pattern_type=sample.get("pattern_type"),
        infill_measurements=_format_infill_measurements(raw.get("infill_measurements", [])),
        mechanical_properties=_format_mechanical(mechanical_props),
        linear_attenuation=_format_linear_attenuation(raw.get("linear_attenuation", [])),
        attenuation_tests=raw.get("attenuation_tests", []),
        beam_qualities=_format_beam_qualities(beam_qualities),
    )
