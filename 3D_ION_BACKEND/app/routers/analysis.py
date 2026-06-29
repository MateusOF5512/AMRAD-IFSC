"""
Analysis API router - provides endpoints for regression analysis and data insights
Includes: Infill vs HU regression, filters, and statistical analysis
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Optional, List
import logging

from app.core.security import get_current_user
from app.database.supabase import get_supabase_client
from app.services.infill_hu_regression_service import InfillHURegressionService

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/analysis",
    tags=["analysis"],
    responses={404: {"description": "Not found"}},
)


@router.get("/infill-hu", response_model=dict)
async def get_infill_hu_regression(
    material_id: Optional[str] = Query(None, description="Filter by material ID"),
    pattern_type: Optional[str] = Query(None, description="Filter by pattern type"),
    machine_id: Optional[str] = Query(None, description="Filter by machine ID"),
    group_by: Optional[str] = Query(
        "material,pattern",
        description="Comma-separated list of columns to group by"
    ),
    current_user: dict = Depends(get_current_user),
):
    """
    Get infill vs HU regression analysis with optional filters
    
    **Query Parameters:**
    - `material_id`: UUID of material (optional)
    - `pattern_type`: Pattern type like "Rectilinear", "Grid", etc (optional)
    - `machine_id`: UUID of machine (optional)
    - `group_by`: Comma-separated grouping columns (default: "material,pattern")
    
    **Response:**
    - `groups`: Array of regression groups with points and statistics
    - `overall_regression`: Regression for entire dataset
    - `metadata`: Filter info and axis labels
    
    **Example response:**
    ```json
    {
      "groups": [
        {
          "label": "PLA - Rectilinear",
          "group_values": {"material_model": "PLA", "pattern_type": "Rectilinear"},
          "points": [{"x": 60, "y": -370}, ...],
          "regression": {
            "a": 9.98,
            "b": -972,
            "r2": 0.999,
            "p_value": 0.001,
            "num_points": 10
          },
          "point_count": 10
        }
      ],
      "overall_regression": {...},
      "metadata": {
        "total_points": 50,
        "total_groups": 5,
        "filters": {...}
      }
    }
    ```
    """
    try:
        supabase = get_supabase_client()
        service = InfillHURegressionService(supabase)

        # Parse group_by parameter
        group_by_list = None
        if group_by:
            group_mapping = {
                "material": "material_model",
                "pattern": "pattern_type",
                "machine": "machine_brand",
            }
            group_by_list = [
                group_mapping.get(col.strip(), col.strip())
                for col in group_by.split(",")
            ]

        # Perform analysis
        result = await service.analyze_infill_hu(
            material_id=material_id,
            pattern_type=pattern_type,
            machine_id=machine_id,
            group_by=group_by_list,
        )

        return result

    except Exception as e:
        logger.error(f"Error in infill-hu endpoint: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error performing regression analysis: {str(e)}",
        )


@router.get("/filters", response_model=dict)
async def get_analysis_filters(
    current_user: dict = Depends(get_current_user),
):
    """
    Get available filters for analysis (materials, patterns, machines)
    
    **Response:**
    ```json
    {
      "materials": [
        {"id": "uuid", "label": "PLA - Basic"},
        ...
      ],
      "patterns": ["Rectilinear", "Grid", "Honeycomb"],
      "machines": [
        {"id": "uuid", "label": "Prusa - i3"},
        ...
      ]
    }
    ```
    """
    try:
        supabase = get_supabase_client()
        service = InfillHURegressionService(supabase)

        filters = await service.get_available_filters()
        return filters

    except Exception as e:
        logger.error(f"Error fetching filters: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching filters: {str(e)}",
        )


@router.get("/infill-hu/export", response_model=dict)
async def export_regression_data(
    material_id: Optional[str] = Query(None),
    pattern_type: Optional[str] = Query(None),
    machine_id: Optional[str] = Query(None),
    format: str = Query("json", regex="^(json|csv)$"),
    current_user: dict = Depends(get_current_user),
):
    """
    Export regression analysis data in JSON or CSV format
    
    **Query Parameters:**
    - `format`: "json" or "csv"
    
    **Returns:**
    - CSV: Raw CSV data
    - JSON: Structured analysis data
    """
    try:
        supabase = get_supabase_client()
        service = InfillHURegressionService(supabase)

        # Fetch data
        df = await service.fetch_infill_hu_data(
            material_id=material_id,
            pattern_type=pattern_type,
            machine_id=machine_id,
        )

        if df.empty:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No data found for specified filters",
            )

        if format == "csv":
            # Return as CSV string
            csv_data = df.to_csv(index=False)
            return {
                "format": "csv",
                "data": csv_data,
                "filename": "infill_hu_regression.csv",
            }
        else:
            # Return as JSON
            return {
                "format": "json",
                "data": df.to_dict("records"),
                "record_count": len(df),
            }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error exporting data: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting data: {str(e)}",
        )
