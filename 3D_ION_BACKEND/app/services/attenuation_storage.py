"""Persistence helpers for attenuation_tests / attenuation_measurements."""

from __future__ import annotations

from typing import Any, Dict, List, Optional

from supabase import Client

from app.services.attenuation_regression_service import (
    build_regression_line,
    compute_attenuation_regression,
)


def _table_missing(exc: Exception) -> bool:
    msg = str(exc).lower()
    return "attenuation_tests" in msg or "does not exist" in msg or "relation" in msg


def fetch_attenuation_tests_for_sample(
    supabase: Client, sample_id: str
) -> List[Dict[str, Any]]:
    try:
        tests_resp = (
            supabase.table("attenuation_tests")
            .select("*")
            .eq("sample_id", sample_id)
            .order("created_at")
            .execute()
        )
        tests = tests_resp.data or []
        if not tests:
            return []

        test_ids = [t["id"] for t in tests]
        meas_resp = (
            supabase.table("attenuation_measurements")
            .select("*")
            .in_("test_id", test_ids)
            .execute()
        )
        by_test: Dict[str, List[Dict]] = {}
        for m in meas_resp.data or []:
            tid = m.get("test_id")
            by_test.setdefault(tid, []).append(m)

        result = []
        for t in tests:
            tid = t["id"]
            measurements = sorted(
                by_test.get(tid, []), key=lambda x: float(x.get("thickness") or 0)
            )
            slope = t.get("regression_slope")
            intercept = t.get("regression_intercept")
            regression_line = []
            if slope is not None and intercept is not None:
                regression_line = build_regression_line(
                    [
                        {
                            "thickness": m.get("thickness"),
                            "ln_relative": m.get("ln_relative"),
                        }
                        for m in measurements
                    ],
                    float(slope),
                    float(intercept),
                )
            result.append(
                {
                    "id": tid,
                    "sample_id": t.get("sample_id"),
                    "rqr_energy": t.get("rqr_energy"),
                    "i0": t.get("i0"),
                    "mu_coefficient": t.get("mu_coefficient"),
                    "regression_slope": slope,
                    "regression_intercept": intercept,
                    "r_squared": t.get("r_squared"),
                    "created_at": t.get("created_at"),
                    "measurements": [
                        {
                            "id": m.get("id"),
                            "thickness": m.get("thickness"),
                            "transmission": m.get("transmission"),
                            "ln_relative": m.get("ln_relative"),
                        }
                        for m in measurements
                    ],
                    "regression_line": regression_line,
                }
            )
        return result
    except Exception as exc:
        if _table_missing(exc):
            return []
        raise


def save_attenuation_tests(
    supabase: Client, sample_id: str, tests: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    saved: List[Dict[str, Any]] = []

    for test in tests:
        rqr = test.get("rqr_energy")
        i0 = float(test.get("i0", 0))
        raw_measurements = test.get("measurements") or []

        mu, processed, stats = compute_attenuation_regression(i0, raw_measurements)

        test_row = {
            "sample_id": sample_id,
            "rqr_energy": rqr,
            "i0": i0,
            "mu_coefficient": mu,
            "regression_slope": stats["regression_slope"] if stats else None,
            "regression_intercept": stats["regression_intercept"] if stats else None,
            "r_squared": stats["r_squared"] if stats else None,
        }

        test_resp = supabase.table("attenuation_tests").insert(test_row).execute()
        if not test_resp.data:
            continue

        test_id = test_resp.data[0]["id"]
        meas_rows = []
        for p in processed:
            meas_rows.append(
                {
                    "test_id": test_id,
                    "thickness": p["thickness"],
                    "transmission": p["transmission"],
                    "ln_relative": p["ln_relative"],
                }
            )

        if meas_rows:
            supabase.table("attenuation_measurements").insert(meas_rows).execute()

        saved.append(
            {
                **test_resp.data[0],
                "measurements": processed,
                "mu_coefficient": mu,
            }
        )

    return saved


def count_attenuation_tests(supabase: Client, sample_ids: List[str]) -> Dict[str, int]:
    if not sample_ids:
        return {}
    try:
        resp = (
            supabase.table("attenuation_tests")
            .select("sample_id, id")
            .in_("sample_id", sample_ids)
            .execute()
        )
        counts: Dict[str, int] = {}
        for row in resp.data or []:
            sid = row.get("sample_id")
            counts[sid] = counts.get(sid, 0) + 1
        return counts
    except Exception as exc:
        if _table_missing(exc):
            return {}
        raise
