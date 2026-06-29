"""
Service para análise de regressão linear: Infill (%) vs Hounsfield Units (HU)
Permite comparação entre materiais, padrões e máquinas
"""

from typing import Optional, List, Dict, Any
import pandas as pd
import numpy as np
from scipy import stats
import logging
from supabase import Client

logger = logging.getLogger(__name__)


class InfillHURegressionService:
    """
    Serviço para análise de regressão linear: Infill vs HU
    Agrupa dados por material e padrão, calculando regressão para cada grupo
    """

    def __init__(self, supabase_client: Client):
        """
        Initialize service with Supabase client
        
        Args:
            supabase_client: Supabase client with service role key
        """
        self.supabase = supabase_client

    async def fetch_infill_hu_data(
        self,
        material_id: Optional[str] = None,
        pattern_type: Optional[str] = None,
        machine_id: Optional[str] = None,
    ) -> pd.DataFrame:
        """
        Fetch infill measurements with related material, machine, and pattern data
        
        Args:
            material_id: Filter by material ID (optional)
            pattern_type: Filter by pattern type (optional)
            machine_id: Filter by machine ID (optional)
            
        Returns:
            DataFrame with columns: infill_pct, hu_mean, material_model, pattern_type, 
                                   machine_brand, sample_id, pattern_type_id
        """
        try:
            # Build the query with proper joins
            query = self.supabase.table("infill_measurements").select(
                """
                id,
                sample_id,
                infill_pct,
                hu_mean,
                sd_value,
                pattern_type,
                samples!inner(
                    id,
                    material_id,
                    machine_id,
                    materials!inner(id, brand, model),
                    machines!inner(id, brand, model)
                )
                """
            )

            # Apply filters
            if material_id:
                query = query.eq("samples.material_id", material_id)
            if pattern_type:
                query = query.eq("pattern_type", pattern_type)
            if machine_id:
                query = query.eq("samples.machine_id", machine_id)

            response = query.execute()

            if not response.data:
                logger.warning(
                    f"No data found for filters: "
                    f"material_id={material_id}, pattern_type={pattern_type}, machine_id={machine_id}"
                )
                return pd.DataFrame()

            # Transform nested data into flat DataFrame
            rows = []
            for item in response.data:
                sample = item.get("samples", {})
                if not sample:
                    continue

                material = sample.get("materials", {})
                machine = sample.get("machines", {})

                rows.append(
                    {
                        "measurement_id": item.get("id"),
                        "sample_id": item.get("sample_id"),
                        "infill_pct": float(item.get("infill_pct", 0)),
                        "hu_mean": float(item.get("hu_mean", 0)),
                        "sd_value": float(item.get("sd_value") or 0),
                        "pattern_type": item.get("pattern_type", "Unknown"),
                        "material_brand": material.get("brand", "Unknown"),
                        "material_model": material.get("model", "Unknown"),
                        "machine_brand": machine.get("brand", "Unknown"),
                        "machine_model": machine.get("model", "Unknown"),
                    }
                )

            df = pd.DataFrame(rows)
            logger.info(f"Fetched {len(df)} measurements for regression analysis")
            return df

        except Exception as e:
            logger.error(f"Error fetching infill HU data: {str(e)}")
            return pd.DataFrame()

    @staticmethod
    def compute_linear_regression(df: pd.DataFrame) -> Dict[str, Any]:
        """
        Compute linear regression (A, B, R²) for a dataset
        Formula: HU = A * Infill_pct + B
        
        Args:
            df: DataFrame with 'infill_pct' and 'hu_mean' columns
            
        Returns:
            Dict with keys: a, b, r2, p_value, std_err, num_points, x_min, x_max, y_min, y_max
            Returns None if insufficient data
        """
        if len(df) < 2:
            logger.warning(f"Insufficient points for regression: {len(df)}")
            return None

        try:
            x = df["infill_pct"].values
            y = df["hu_mean"].values

            # Remove NaN values
            mask = ~(np.isnan(x) | np.isnan(y))
            x = x[mask]
            y = y[mask]

            if len(x) < 2:
                return None

            # Calculate linear regression
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)

            return {
                "a": float(slope),
                "b": float(intercept),
                "r2": float(r_value**2),
                "p_value": float(p_value),
                "std_err": float(std_err),
                "num_points": int(len(x)),
                "x_min": float(x.min()),
                "x_max": float(x.max()),
                "y_min": float(y.min()),
                "y_max": float(y.max()),
            }

        except Exception as e:
            logger.error(f"Error computing regression: {str(e)}")
            return None

    def group_and_compute_regressions(
        self, df: pd.DataFrame, group_by: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Group data by specified columns and compute regression for each group
        
        Args:
            df: DataFrame with infill and HU data
            group_by: List of column names to group by (default: ['material_model', 'pattern_type'])
            
        Returns:
            List of dicts with: label, points, regression (a, b, r2, etc.)
        """
        if group_by is None:
            group_by = ["material_model", "pattern_type"]

        if df.empty:
            return []

        results = []

        try:
            # Group by specified columns
            for group_values, group_df in df.groupby(group_by, dropna=False):
                # Handle single grouping column
                if len(group_by) == 1:
                    label = str(group_values)
                else:
                    # Create label from group values
                    label = " - ".join(str(v) for v in group_values)

                # Compute regression for this group
                regression = self.compute_linear_regression(group_df)

                if regression is None:
                    logger.warning(f"Could not compute regression for group: {label}")
                    continue

                # Prepare points for frontend
                points = [
                    {"x": float(row["infill_pct"]), "y": float(row["hu_mean"])}
                    for _, row in group_df.iterrows()
                ]

                results.append(
                    {
                        "label": label,
                        "group_values": {
                            col: group_values[i] if len(group_by) > 1 else group_values
                            for i, col in enumerate(group_by)
                        },
                        "points": points,
                        "regression": regression,
                        "point_count": len(points),
                    }
                )

            logger.info(f"Computed {len(results)} regression groups")
            return results

        except Exception as e:
            logger.error(f"Error grouping and computing regressions: {str(e)}")
            return []

    async def analyze_infill_hu(
        self,
        material_id: Optional[str] = None,
        pattern_type: Optional[str] = None,
        machine_id: Optional[str] = None,
        group_by: List[str] = None,
    ) -> Dict[str, Any]:
        """
        Complete analysis pipeline: fetch data → group → compute regressions
        
        Args:
            material_id: Filter by material ID
            pattern_type: Filter by pattern type
            machine_id: Filter by machine ID
            group_by: Columns to group by (default: material_model + pattern_type)
            
        Returns:
            Dict with structure: {groups: [...], metadata: {...}}
        """
        try:
            # Fetch data
            df = await self.fetch_infill_hu_data(
                material_id=material_id,
                pattern_type=pattern_type,
                machine_id=machine_id,
            )

            if df.empty:
                return {
                    "groups": [],
                    "metadata": {
                        "total_points": 0,
                        "total_groups": 0,
                        "filters": {
                            "material_id": material_id,
                            "pattern_type": pattern_type,
                            "machine_id": machine_id,
                        },
                    },
                }

            # Group and compute regressions
            groups = self.group_and_compute_regressions(df, group_by=group_by)

            # Compute overall statistics
            overall_regression = self.compute_linear_regression(df)

            return {
                "groups": groups,
                "overall_regression": overall_regression,
                "metadata": {
                    "total_points": len(df),
                    "total_groups": len(groups),
                    "filters": {
                        "material_id": material_id,
                        "pattern_type": pattern_type,
                        "machine_id": machine_id,
                    },
                    "x_axis_label": "Infill (%)",
                    "y_axis_label": "HU Médio",
                },
            }

        except Exception as e:
            logger.error(f"Error in analyze_infill_hu: {str(e)}")
            return {"groups": [], "metadata": {"error": str(e)}}

    async def get_available_filters(self) -> Dict[str, List[str]]:
        """
        Get available materials, patterns, and machines for filter UI
        
        Returns:
            Dict with lists of available filter options
        """
        try:
            # Get unique materials
            materials_response = self.supabase.table("materials").select(
                "id, brand, model"
            ).execute()

            materials = [
                {
                    "id": m["id"],
                    "label": f"{m['brand']} - {m['model']}",
                }
                for m in materials_response.data
            ]

            # Get unique patterns from infill_measurements
            patterns_response = self.supabase.table("infill_measurements").select(
                "pattern_type"
            ).execute()

            patterns = sorted(
                list(set(p["pattern_type"] for p in patterns_response.data if p["pattern_type"]))
            )

            # Get unique machines
            machines_response = self.supabase.table("machines").select(
                "id, brand, model"
            ).execute()

            machines = [
                {
                    "id": m["id"],
                    "label": f"{m['brand']} - {m['model']}",
                }
                for m in machines_response.data
            ]

            return {
                "materials": materials,
                "patterns": patterns,
                "machines": machines,
            }

        except Exception as e:
            logger.error(f"Error fetching available filters: {str(e)}")
            return {"materials": [], "patterns": [], "machines": []}
