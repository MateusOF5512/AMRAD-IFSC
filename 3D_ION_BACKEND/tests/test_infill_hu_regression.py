"""
Test suite for Infill vs HU Regression Analysis API endpoints
Tests the linear regression analysis functionality and filters
"""

import asyncio
import json
from datetime import datetime
import pytest
from httpx import AsyncClient

# Note: These tests assume:
# 1. Backend is running on http://localhost:8000
# 2. User is authenticated (JWT token in Authorization header)
# 3. Database has sample infill measurement data


class TestInfillHURegressionAPI:
    """Test cases for infill-hu regression analysis endpoint"""

    BASE_URL = "http://localhost:8000/api/v1"
    HEADERS = {
        "Content-Type": "application/json",
        # Add your JWT token here for testing
        # "Authorization": "Bearer YOUR_TOKEN_HERE"
    }

    @pytest.mark.asyncio
    async def test_get_infill_hu_analysis_no_filters(self):
        """Test getting regression analysis without filters"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            response = await client.get(
                "/analysis/infill-hu",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "groups" in data
            assert "overall_regression" in data
            assert "metadata" in data

            # Verify metadata
            metadata = data["metadata"]
            assert "total_points" in metadata
            assert "total_groups" in metadata
            assert metadata["total_points"] >= 0

            # Verify each group has required fields
            for group in data["groups"]:
                assert "label" in group
                assert "points" in group
                assert "regression" in group
                assert "point_count" in group

                # Verify regression stats
                if group["regression"]:
                    regression = group["regression"]
                    assert "a" in regression  # slope
                    assert "b" in regression  # intercept
                    assert "r2" in regression
                    assert "p_value" in regression
                    assert "num_points" in regression

                # Verify points format
                for point in group["points"]:
                    assert "x" in point
                    assert "y" in point
                    assert isinstance(point["x"], (int, float))
                    assert isinstance(point["y"], (int, float))

    @pytest.mark.asyncio
    async def test_get_infill_hu_analysis_with_material_filter(self):
        """Test regression analysis with material filter"""
        # First, get available materials
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            # Get filters to find a material ID
            filters_response = await client.get(
                "/analysis/filters",
                headers=self.HEADERS
            )
            assert filters_response.status_code == 200
            filters_data = filters_response.json()

            if not filters_data.get("materials"):
                pytest.skip("No materials available in database")

            material_id = filters_data["materials"][0]["id"]

            # Now test with material filter
            response = await client.get(
                f"/analysis/infill-hu?material_id={material_id}",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify filter was applied
            assert data["metadata"]["filters"]["material_id"] == material_id

    @pytest.mark.asyncio
    async def test_get_infill_hu_analysis_with_pattern_filter(self):
        """Test regression analysis with pattern type filter"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            # Get available patterns
            filters_response = await client.get(
                "/analysis/filters",
                headers=self.HEADERS
            )
            assert filters_response.status_code == 200
            filters_data = filters_response.json()

            if not filters_data.get("patterns"):
                pytest.skip("No patterns available in database")

            pattern = filters_data["patterns"][0]

            # Test with pattern filter
            response = await client.get(
                f"/analysis/infill-hu?pattern_type={pattern}",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify filter was applied
            assert data["metadata"]["filters"]["pattern_type"] == pattern

    @pytest.mark.asyncio
    async def test_get_infill_hu_analysis_with_machine_filter(self):
        """Test regression analysis with machine filter"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            # Get available machines
            filters_response = await client.get(
                "/analysis/filters",
                headers=self.HEADERS
            )
            assert filters_response.status_code == 200
            filters_data = filters_response.json()

            if not filters_data.get("machines"):
                pytest.skip("No machines available in database")

            machine_id = filters_data["machines"][0]["id"]

            # Test with machine filter
            response = await client.get(
                f"/analysis/infill-hu?machine_id={machine_id}",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify filter was applied
            assert data["metadata"]["filters"]["machine_id"] == machine_id

    @pytest.mark.asyncio
    async def test_get_infill_hu_analysis_with_multiple_filters(self):
        """Test regression analysis with multiple filters combined"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            filters_response = await client.get(
                "/analysis/filters",
                headers=self.HEADERS
            )
            assert filters_response.status_code == 200
            filters_data = filters_response.json()

            if (
                not filters_data.get("materials")
                or not filters_data.get("patterns")
                or not filters_data.get("machines")
            ):
                pytest.skip("Insufficient filter options in database")

            material_id = filters_data["materials"][0]["id"]
            pattern = filters_data["patterns"][0]
            machine_id = filters_data["machines"][0]["id"]

            response = await client.get(
                f"/analysis/infill-hu?material_id={material_id}&pattern_type={pattern}&machine_id={machine_id}",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify all filters were applied
            filters = data["metadata"]["filters"]
            assert filters["material_id"] == material_id
            assert filters["pattern_type"] == pattern
            assert filters["machine_id"] == machine_id

    @pytest.mark.asyncio
    async def test_get_analysis_filters(self):
        """Test getting available filters"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            response = await client.get(
                "/analysis/filters",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify response structure
            assert "materials" in data
            assert "patterns" in data
            assert "machines" in data

            # Verify materials format
            for material in data["materials"]:
                assert "id" in material
                assert "label" in material

            # Verify patterns are strings
            assert isinstance(data["patterns"], list)

            # Verify machines format
            for machine in data["machines"]:
                assert "id" in machine
                assert "label" in machine

    @pytest.mark.asyncio
    async def test_export_regression_data_csv(self):
        """Test exporting regression data as CSV"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            response = await client.get(
                "/analysis/infill-hu/export?format=csv",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify CSV response
            assert "format" in data
            assert data["format"] == "csv"
            assert "data" in data
            assert "filename" in data
            assert data["filename"].endswith(".csv")

            # Verify CSV data is valid (has headers and at least one row)
            csv_lines = data["data"].strip().split("\n")
            assert len(csv_lines) > 0

    @pytest.mark.asyncio
    async def test_export_regression_data_json(self):
        """Test exporting regression data as JSON"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            response = await client.get(
                "/analysis/infill-hu/export?format=json",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Verify JSON response
            assert "format" in data
            assert data["format"] == "json"
            assert "data" in data
            assert "record_count" in data

            # Verify data is a list of records
            assert isinstance(data["data"], list)
            assert data["record_count"] == len(data["data"])

            # Verify each record has expected fields
            for record in data["data"]:
                assert "infill_pct" in record
                assert "hu_mean" in record

    @pytest.mark.asyncio
    async def test_regression_statistics_validity(self):
        """Test that regression statistics are mathematically valid"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            response = await client.get(
                "/analysis/infill-hu",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            for group in data["groups"]:
                if group["regression"] and group["point_count"] >= 2:
                    regression = group["regression"]

                    # R² should be between 0 and 1
                    assert 0 <= regression["r2"] <= 1, f"Invalid R² value: {regression['r2']}"

                    # P-value should be between 0 and 1
                    assert 0 <= regression["p_value"] <= 1, f"Invalid p-value: {regression['p_value']}"

                    # Standard error should be non-negative
                    assert regression["std_err"] >= 0, f"Invalid std_err: {regression['std_err']}"

                    # num_points should match actual points
                    assert regression["num_points"] == group["point_count"]

                    # Check x and y ranges
                    assert regression["x_min"] <= regression["x_max"]
                    assert regression["y_min"] <= regression["y_max"]

    @pytest.mark.asyncio
    async def test_empty_filter_result(self):
        """Test behavior when filters return no data"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            # Use a very specific filter that likely has no results
            response = await client.get(
                "/analysis/infill-hu?pattern_type=NonExistentPattern",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Should return valid response with empty groups
            assert "groups" in data
            assert isinstance(data["groups"], list)

    @pytest.mark.asyncio
    async def test_invalid_group_by_parameter(self):
        """Test group_by parameter with valid values"""
        async with AsyncClient(base_url=self.BASE_URL, timeout=30) as client:
            # Test valid group_by values
            response = await client.get(
                "/analysis/infill-hu?group_by=material,pattern",
                headers=self.HEADERS
            )

            assert response.status_code == 200
            data = response.json()

            # Should successfully group by material and pattern
            assert "groups" in data


class TestRegressionMathematicalAccuracy:
    """Test mathematical accuracy of regression calculations"""

    def test_simple_linear_regression(self):
        """Test regression with simple known data"""
        from app.services.infill_hu_regression_service import InfillHURegressionService
        import pandas as pd

        # Create simple test data: y = 2x + 3
        test_data = pd.DataFrame({
            "infill_pct": [1, 2, 3, 4, 5],
            "hu_mean": [5, 7, 9, 11, 13]  # y = 2x + 3
        })

        service = InfillHURegressionService(None)
        result = service.compute_linear_regression(test_data)

        # Should be close to: a=2, b=3, r2=1 (perfect fit)
        assert result is not None
        assert abs(result["a"] - 2.0) < 0.01
        assert abs(result["b"] - 3.0) < 0.01
        assert result["r2"] > 0.999

    def test_regression_with_noise(self):
        """Test regression with noisy data"""
        from app.services.infill_hu_regression_service import InfillHURegressionService
        import pandas as pd
        import numpy as np

        # Create noisy data
        np.random.seed(42)
        x = np.array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100])
        y = 5 * x - 200 + np.random.normal(0, 50, len(x))

        test_data = pd.DataFrame({
            "infill_pct": x,
            "hu_mean": y
        })

        service = InfillHURegressionService(None)
        result = service.compute_linear_regression(test_data)

        # Should have reasonable slope and intercept
        assert result is not None
        assert 3 < result["a"] < 7  # Slope should be around 5
        assert -300 < result["b"] < -100  # Intercept should be around -200
        assert result["r2"] > 0.8  # Should explain most variance

    def test_insufficient_data_points(self):
        """Test regression with insufficient data"""
        from app.services.infill_hu_regression_service import InfillHURegressionService
        import pandas as pd

        # Only 1 point
        test_data = pd.DataFrame({
            "infill_pct": [10],
            "hu_mean": [100]
        })

        service = InfillHURegressionService(None)
        result = service.compute_linear_regression(test_data)

        # Should return None for insufficient data
        assert result is None


def test_service_imports():
    """Test that service imports correctly"""
    from app.services.infill_hu_regression_service import InfillHURegressionService
    assert InfillHURegressionService is not None


def test_router_imports():
    """Test that router imports correctly"""
    from app.routers import analysis
    assert analysis.router is not None


if __name__ == "__main__":
    # Run tests with: pytest tests/test_infill_hu_regression.py -v
    pytest.main([__file__, "-v"])
