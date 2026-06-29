"""Unit tests for Beer-Lambert attenuation regression."""

import math

import pytest

from app.services.attenuation_regression_service import compute_attenuation_regression


def test_compute_mu_known_slope():
    i0 = 100.0
    mu_true = 0.1
    measurements = [
        {"thickness": 0, "transmission": 100.0},
        {"thickness": 5, "transmission": 100.0 * math.exp(-mu_true * 5)},
        {"thickness": 10, "transmission": 100.0 * math.exp(-mu_true * 10)},
    ]
    mu, processed, stats = compute_attenuation_regression(i0, measurements)
    assert mu is not None
    assert len(processed) == 3
    assert abs(mu - mu_true) < 0.01
    assert stats is not None
    assert stats["r_squared"] > 0.99


def test_insufficient_points_returns_none_mu():
    mu, processed, stats = compute_attenuation_regression(
        100.0, [{"thickness": 1, "transmission": 90}]
    )
    assert mu is None
    assert len(processed) == 1
    assert stats is None
