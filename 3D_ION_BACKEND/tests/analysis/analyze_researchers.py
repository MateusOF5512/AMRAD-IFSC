#!/usr/bin/env python
"""Análise detalhada de qual researcher tem quantos samples"""
import sys
sys.path.insert(0, '.')

from app.database.supabase import get_supabase_client

supabase = get_supabase_client()

print("=" * 80)
print("ANÁLISE DETALHADA - Researchers vs Samples")
print("=" * 80)

# Get all researchers and their samples
researchers = supabase.table("researchers").select("id, name, email, status").execute()
samples = supabase.table("samples").select("researcher_id").execute()

# Count samples by researcher_id
sample_counts = {}
for sample in samples.data:
    rid = sample.get("researcher_id")
    sample_counts[rid] = sample_counts.get(rid, 0) + 1

print(f"\nTotal de Researchers: {len(researchers.data)}")
print(f"Total de Samples: {len(samples.data)}\n")

print("RESEARCHERS COM SAMPLES:")
print("-" * 80)

for researcher in researchers.data:
    rid = researcher.get("id")
    count = sample_counts.get(rid, 0)
    
    if count > 0:
        print(f"✓ {researcher.get('name'):<30} | Status: {researcher.get('status'):<10} | Samples: {count}")
        print(f"  Email: {researcher.get('email')}")
        print(f"  ID: {rid}\n")

print("\nRESEARCHERS SEM SAMPLES (0 experimentos):")
print("-" * 80)
for researcher in researchers.data:
    rid = researcher.get("id")
    if rid not in sample_counts:
        print(f"✗ {researcher.get('name'):<30} | Status: {researcher.get('status'):<10} | Samples: 0")
