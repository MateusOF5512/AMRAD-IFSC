"""
Beer-Lambert linearization: ln(I) = ln(I0) - μ·x
Regression on ln(I/I0) vs thickness yields slope = -μ.
"""

from __future__ import annotations

import math
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from scipy import stats


def compute_attenuation_regression(
    i0: float,
    measurements: List[Dict[str, Any]],
) -> Tuple[Optional[float], List[Dict[str, Any]], Optional[Dict[str, Any]]]:
    """
    Calculate μ and processed points from raw thickness/transmission data.

    Returns:
        (mu, processed_measurements, regression_stats)
        mu is None if insufficient valid points.
    """
    if i0 <= 0:
        return None, [], None

    processed: List[Dict[str, Any]] = []
    x_vals: List[float] = []
    y_vals: List[float] = []

    for m in measurements:
        thickness = m.get("thickness")
        transmission = m.get("transmission")
        if thickness is None or transmission is None:
            continue
        try:
            x = float(thickness)
            i_val = float(transmission)
        except (TypeError, ValueError):
            continue
        if x < 0 or i_val <= 0:
            continue

        ln_relative = math.log(i_val / i0)
        processed.append(
            {
                "thickness": x,
                "transmission": i_val,
                "ln_relative": ln_relative,
            }
        )
        x_vals.append(x)
        y_vals.append(ln_relative)

    if len(x_vals) < 2:
        return None, processed, None

    x_array = np.array(x_vals, dtype=float)
    y_array = np.array(y_vals, dtype=float)
    slope, intercept, r_value, p_value, std_err = stats.linregress(x_array, y_array)
    mu = -float(slope)

    stats_dict = {
        "regression_slope": float(slope),
        "regression_intercept": float(intercept),
        "r_squared": float(r_value**2),
        "p_value": float(p_value),
        "std_err": float(std_err),
        "num_points": len(x_vals),
    }

    return mu, processed, stats_dict


def build_regression_line(
    processed: List[Dict[str, Any]],
    slope: float,
    intercept: float,
) -> List[Dict[str, float]]:
    """Points for trend line overlay on ln(I/I0) vs thickness chart."""
    if not processed:
        return []
    thicknesses = sorted({float(p["thickness"]) for p in processed})
    if len(thicknesses) < 2:
        t0 = thicknesses[0]
        return [
            {"thickness": t0, "ln_relative_fit": intercept + slope * t0},
        ]
    t_min, t_max = thicknesses[0], thicknesses[-1]
    return [
        {"thickness": t_min, "ln_relative_fit": intercept + slope * t_min},
        {"thickness": t_max, "ln_relative_fit": intercept + slope * t_max},
    ]
