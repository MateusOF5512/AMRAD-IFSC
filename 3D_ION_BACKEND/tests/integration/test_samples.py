#!/usr/bin/env python
"""Test the admin endpoint with samples table"""
import sys
sys.path.insert(0, '.')

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

# Check if samples table has data
print("Verificando tabela samples...\n")

try:
    # Count total samples
    all_samples = supabase.table("samples").select("researcher_id", count="exact").execute()
    print(f"✓ Total de samples na database: {all_samples.count}\n")
    
    # Get unique researchers with samples
    samples_data = supabase.table("samples").select("researcher_id").execute()
    unique_researchers = set(s.get("researcher_id") for s in samples_data.data if s.get("researcher_id"))
    print(f"✓ Número de researchers com samples: {len(unique_researchers)}")
    
    # Count samples per researcher
    print("\nContagem de samples por researcher:")
    researcher_counts = {}
    for sample in samples_data.data:
        rid = sample.get("researcher_id")
        if rid:
            researcher_counts[rid] = researcher_counts.get(rid, 0) + 1
    
    for rid, count in sorted(researcher_counts.items()):
        print(f"  - {rid[:8]}...: {count} samples")
    
    # Test getting researcher data
    print("\nBuscando dados dos researchers...")
    researchers = supabase.table("researchers").select("id, name, status").eq("status", "regular").execute()
    
    print(f"✓ Total de researchers com status='regular': {len(researchers.data)}")
    for r in researchers.data[:3]:
        rid = r.get("id")
        sample_count = researcher_counts.get(rid, 0)
        print(f"  - {r.get('name')}: {sample_count} samples")
        
except Exception as e:
    print(f"✗ Erro: {e}")
    import traceback
    traceback.print_exc()
