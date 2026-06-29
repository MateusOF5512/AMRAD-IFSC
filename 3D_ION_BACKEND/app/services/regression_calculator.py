"""
Module para calcular regressão linear (coeficientes A e B) para infill measurements.
Implementa a fórmula: HU_Mean = A * Infill_Pct + B
"""

from typing import Optional, Tuple, Dict, List
import numpy as np
from scipy import stats
import logging

logger = logging.getLogger(__name__)

class RegressionCalculator:
    """
    Calcula coeficientes de regressão linear para dados de infill.
    A = slope (coeficiente angular)
    B = intercept (coeficiente linear)
    """
    
    @staticmethod
    def calculate_linear_regression(
        infill_data: List[Dict]
    ) -> Tuple[Optional[float], Optional[float], Optional[Dict]]:
        """
        Calcula A (slope) e B (intercept) usando regressão linear.
        
        Args:
            infill_data: Lista de medições de infill com 'infill_pct' e 'hu_mean'
            
        Returns:
            (A, B, stats_dict) or (None, None, None) se dados insuficientes
        """
        try:
            # Extrair valores válidos
            x_values = []  # infill_pct
            y_values = []  # hu_mean
            
            for item in infill_data:
                try:
                    x = float(item.get('infill_pct', 0))
                    y = float(item.get('hu_mean', 0))
                    
                    # Validar que ambos os valores são números válidos e não são zero
                    if x is not None and y is not None and not np.isnan(x) and not np.isnan(y):
                        x_values.append(x)
                        y_values.append(y)
                except (ValueError, TypeError):
                    continue
            
            # Precisamos de pelo menos 2 pontos para calcular regressão
            if len(x_values) < 2:
                logger.warning(f"Insuficientes pontos válidos para regressão: {len(x_values)}")
                return None, None, None
            
            x_array = np.array(x_values)
            y_array = np.array(y_values)
            
            # Calcular regressão linear
            slope, intercept, r_value, p_value, std_err = stats.linregress(x_array, y_array)
            
            stats_dict = {
                'r_squared': r_value ** 2,
                'p_value': p_value,
                'std_err': std_err,
                'num_points': len(x_values),
                'x_min': float(x_array.min()),
                'x_max': float(x_array.max()),
                'y_min': float(y_array.min()),
                'y_max': float(y_array.max()),
            }
            
            logger.info(
                f"Regressão calculada: A={slope:.6f}, B={intercept:.6f}, R²={r_value**2:.4f}"
            )
            
            return slope, intercept, stats_dict
            
        except Exception as e:
            logger.error(f"Erro ao calcular regressão: {str(e)}")
            return None, None, None
    
    @staticmethod
    def calculate_for_pattern_sample(
        infill_data: List[Dict],
        sample_id: str,
        pattern_type: str
    ) -> Dict:
        """
        Calcula A e B para um específico sample_id + pattern_type.
        
        Args:
            infill_data: Todas as medições de infill
            sample_id: ID da amostra
            pattern_type: Tipo de padrão (ex: "Rectilinear", "Grid")
            
        Returns:
            Dict com 'dimension_a', 'dimension_b', 'stats'
        """
        # Filtrar dados para este sample_id e pattern_type
        filtered = [
            item for item in infill_data
            if item.get('sample_id') == sample_id 
            and item.get('pattern_type') == pattern_type
        ]
        
        if not filtered:
            logger.warning(f"Nenhum dado encontrado para {sample_id} + {pattern_type}")
            return {
                'dimension_a': None,
                'dimension_b': None,
                'stats': None,
                'reason': 'No data found'
            }
        
        A, B, stats = RegressionCalculator.calculate_linear_regression(filtered)
        
        return {
            'dimension_a': A,
            'dimension_b': B,
            'stats': stats,
            'num_items': len(filtered)
        }
    
    @staticmethod
    def get_coefficients_for_update(A: Optional[float], B: Optional[float]) -> Dict:
        """
        Formato de retorno para atualizar no banco.
        Se A ou B forem None, retorna dicionário vazio (sem atualizar esses campos).
        """
        update_dict = {}
        
        if A is not None:
            update_dict['dimension_a'] = round(A, 6)  # 6 casas decimais
        if B is not None:
            update_dict['dimension_b'] = round(B, 6)
        
        return update_dict
