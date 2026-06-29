"""
Script para analisar e calcular regressão linear (A e B) para dados de infill
Calcula coeficientes de regressão linear: y = A*x + B
onde x = infill_pct e y = hu_mean
"""

import pandas as pd
import numpy as np
from scipy import stats
from supabase import create_client, Client
import os
from load_env import load_project_env

load_project_env()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY não estão definidos no .env")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_infill_data():
    """Fetch all infill measurements from database"""
    try:
        response = supabase.table("infill_measurements").select("*").execute()
        return response.data if response.data else []
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []

def analyze_missing_values(data):
    """Analyze missing values in infill data"""
    df = pd.DataFrame(data)
    
    print("\n" + "="*80)
    print("ANÁLISE DE VALORES AUSENTES - INFILL MEASUREMENTS")
    print("="*80)
    
    print(f"\nTotal de registros: {len(df)}")
    print("\nValores ausentes por coluna:")
    print("-"*80)
    
    missing_cols = {
        'dimension_a': 'Regressão A',
        'dimension_b': 'Regressão B',
        'sd_value': 'Desvio Padrão',
        'image_url': 'URL da Imagem',
        'notes': 'Notas',
        'infill_pct': 'Percentual de Infill',
        'hu_mean': 'Valor HU Médio',
        'pattern_type': 'Tipo de Padrão'
    }
    
    for col, desc in missing_cols.items():
        if col in df.columns:
            missing = df[col].isna().sum() + (df[col] == '').sum() + (df[col] == None).sum()
            pct = (missing / len(df)) * 100
            print(f"{desc:25} ({col:20}): {missing:3} ({pct:5.1f}%)")
    
    print("\n" + "="*80)
    print("ANÁLISE POR TIPO DE PADRÃO")
    print("="*80)
    
    for pattern in df['pattern_type'].unique():
        if pd.isna(pattern) or pattern == '':
            continue
            
        pattern_data = df[df['pattern_type'] == pattern]
        missing_a = pattern_data['dimension_a'].isna().sum() + (pattern_data['dimension_a'] == '').sum()
        missing_b = pattern_data['dimension_b'].isna().sum() + (pattern_data['dimension_b'] == '').sum()
        
        print(f"\nPadrão: {pattern}")
        print(f"  - Total: {len(pattern_data)} registros")
        print(f"  - Faltam A: {missing_a} ({(missing_a/len(pattern_data)*100):.1f}%)")
        print(f"  - Faltam B: {missing_b} ({(missing_b/len(pattern_data)*100):.1f}%)")

def calculate_regression_by_pattern_sample(data):
    """
    Calculate linear regression A and B for each pattern+sample combination
    A = slope, B = intercept
    Linear regression: y = A*x + B
    where x = infill_pct, y = hu_mean
    """
    df = pd.DataFrame(data)
    results = []
    
    print("\n" + "="*80)
    print("CÁLCULO DE REGRESSÃO LINEAR (A e B)")
    print("="*80)
    print("\nFórmula: HU_Mean = A * Infill_Pct + B")
    print("-"*80)
    
    # Group by sample_id and pattern_type
    for (sample_id, pattern_type), group in df.groupby(['sample_id', 'pattern_type']):
        # Clean data
        group_clean = group.copy()
        
        # Convert to numeric, handling empty strings and None
        group_clean['infill_pct'] = pd.to_numeric(
            group_clean['infill_pct'].replace('', np.nan), 
            errors='coerce'
        )
        group_clean['hu_mean'] = pd.to_numeric(
            group_clean['hu_mean'].replace('', np.nan), 
            errors='coerce'
        )
        
        # Filter valid values (remove NaN)
        valid = group_clean.dropna(subset=['infill_pct', 'hu_mean'])
        
        if len(valid) >= 2:  # Need at least 2 points for regression
            x = valid['infill_pct'].values
            y = valid['hu_mean'].values
            
            # Calculate linear regression
            slope, intercept, r_value, p_value, std_err = stats.linregress(x, y)
            
            result = {
                'sample_id': sample_id,
                'pattern_type': pattern_type,
                'dimension_a': slope,
                'dimension_b': intercept,
                'r_squared': r_value ** 2,
                'p_value': p_value,
                'num_points': len(valid),
                'min_infill': x.min(),
                'max_infill': x.max(),
                'min_hu': y.min(),
                'max_hu': y.max()
            }
            
            results.append(result)
            
            print(f"\nAmostra: {sample_id[:8]}... | Padrão: {pattern_type}")
            print(f"  A (inclinação): {slope:12.6f}")
            print(f"  B (intercepto): {intercept:12.6f}")
            print(f"  R²: {result['r_squared']:.4f} | p-valor: {p_value:.4e}")
            print(f"  Pontos: {len(valid)} | Infill: {x.min():.0f}%-{x.max():.0f}% | HU: {y.min():.0f}-{y.max():.0f}")
        else:
            print(f"\nAmostra: {sample_id[:8]}... | Padrão: {pattern_type}")
            print(f"  ⚠️  Insuficientes pontos válidos ({len(valid)})")
    
    return results

def display_summary_statistics(data):
    """Display summary statistics about the data"""
    df = pd.DataFrame(data)
    
    print("\n" + "="*80)
    print("ESTATÍSTICAS DESCRITIVAS")
    print("="*80)
    
    numeric_cols = ['infill_pct', 'hu_mean', 'sd_value']
    
    for col in numeric_cols:
        if col in df.columns:
            values = pd.to_numeric(df[col].replace('', np.nan), errors='coerce')
            valid = values.dropna()
            
            if len(valid) > 0:
                print(f"\n{col}:")
                print(f"  Média:    {valid.mean():12.2f}")
                print(f"  Mediana:  {valid.median():12.2f}")
                print(f"  Desvio P: {valid.std():12.2f}")
                print(f"  Mín:      {valid.min():12.2f}")
                print(f"  Máx:      {valid.max():12.2f}")

if __name__ == "__main__":
    print("\n🔍 Analisando base de dados de infill...")
    
    # Fetch data
    data = fetch_infill_data()
    
    if not data:
        print("❌ Erro ao buscar dados")
        exit(1)
    
    # Run analyses
    analyze_missing_values(data)
    display_summary_statistics(data)
    results = calculate_regression_by_pattern_sample(data)
    
    print("\n" + "="*80)
    print(f"✅ Análise completa! {len(results)} combinações amostra+padrão calculadas")
    print("="*80)
