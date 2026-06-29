"""
Script de teste para validar a implementação de regressão linear
Testa a classe RegressionCalculator com dados de exemplo
"""

from app.services.regression_calculator import RegressionCalculator
import json

print("\n" + "="*80)
print("🧪 TESTE DE REGRESSÃO LINEAR - RegressionCalculator")
print("="*80 + "\n")

# Dados de teste 1: Amostra simples com 4 pontos
test_data_1 = [
    {"infill_pct": 40.0, "hu_mean": 212121.0},
    {"infill_pct": 60.0, "hu_mean": 21212.0},
    {"infill_pct": 80.0, "hu_mean": 21212121.0},
    {"infill_pct": 100.0, "hu_mean": 121212.0}
]

print("📊 Teste 1: Regressão Linear com 4 pontos")
print("-" * 80)
print("Dados:")
for item in test_data_1:
    print(f"  Infill: {item['infill_pct']:6.1f}% → HU: {item['hu_mean']:10.0f}")

A, B, stats = RegressionCalculator.calculate_linear_regression(test_data_1)
print("\n✅ Resultados:")
print(f"  A (slope/inclinação):  {A:15.6f}")
print(f"  B (intercept/base):    {B:15.6f}")
if stats:
    print(f"  R²:                    {stats.get('r_squared'):15.6f}")
    print(f"  p-valor:               {stats.get('p_value'):15.6e}")
    print(f"  Desvio padrão:         {stats.get('std_err'):15.6f}")
    print(f"  Pontos usados:         {stats.get('num_points')}")

# Teste 2: Dados com padrão e amostra
print("\n" + "="*80)
print("📊 Teste 2: Regressão por Padrão e Amostra")
print("-" * 80)

test_data_2 = [
    {
        "id": "123",
        "sample_id": "sample_a",
        "pattern_type": "Rectilinear",
        "infill_pct": 40.0,
        "hu_mean": 100.0
    },
    {
        "id": "124",
        "sample_id": "sample_a",
        "pattern_type": "Rectilinear",
        "infill_pct": 60.0,
        "hu_mean": 200.0
    },
    {
        "id": "125",
        "sample_id": "sample_a",
        "pattern_type": "Rectilinear",
        "infill_pct": 80.0,
        "hu_mean": 300.0
    },
    {
        "id": "126",
        "sample_id": "sample_a",
        "pattern_type": "Rectilinear",
        "infill_pct": 100.0,
        "hu_mean": 400.0
    }
]

result = RegressionCalculator.calculate_for_pattern_sample(
    test_data_2, 
    sample_id="sample_a", 
    pattern_type="Rectilinear"
)

print("✅ Resultados para (sample_a, Rectilinear):")
print(f"  dimension_a: {result.get('dimension_a')}")
print(f"  dimension_b: {result.get('dimension_b')}")
print(f"  R²: {result.get('stats', {}).get('r_squared'):.6f}")
print(f"  Pontos: {result.get('stats', {}).get('num_points')}")

# Teste 3: Verificar formato de atualização
print("\n" + "="*80)
print("📊 Teste 3: Formato de Atualização para Banco de Dados")
print("-" * 80)

update_format = RegressionCalculator.get_coefficients_for_update(A, B)
print("✅ JSON para banco de dados:")
print(json.dumps(update_format, indent=2, ensure_ascii=False))

print("\n" + "="*80)
print("✅ Todos os testes completados com sucesso!")
print("="*80 + "\n")
