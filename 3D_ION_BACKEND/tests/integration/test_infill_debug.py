#!/usr/bin/env python
"""
Debug script to check infill_measurements table
"""
import os
from supabase import create_client, Client
import json

from load_env import load_project_env

load_project_env()

# Initialize Supabase
supabase_url = os.getenv("SUPABASE_URL")
supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_service_key:
    print("❌ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set")
    exit(1)

supabase: Client = create_client(supabase_url, supabase_service_key)

print("=" * 60)
print("1. Checking if infill_measurements table exists")
print("=" * 60)

try:
    # Try to get count of records
    response = supabase.table("infill_measurements").select("id", count="exact").limit(1).execute()
    print(f"✓ Table exists. Total records: {response.count}")
    
    if response.data:
        print(f"✓ Sample record: {json.dumps(response.data[0], indent=2)}")
    else:
        print("⚠ No data in infill_measurements table")
        
except Exception as e:
    print(f"❌ Error accessing infill_measurements: {str(e)}")

print("\n" + "=" * 60)
print("2. Checking a specific sample's infill data")
print("=" * 60)

try:
    # Get first sample
    samples_response = supabase.table("samples").select("id").limit(1).execute()
    if samples_response.data:
        sample_id = samples_response.data[0]["id"]
        print(f"✓ Sample ID: {sample_id}")
        
        # Try to get infill data for this sample
        infill_response = supabase.table("infill_measurements").select("id, hu_value, sample_id").eq("sample_id", sample_id).execute()
        print(f"✓ Infill records for sample {sample_id}: {infill_response.count}")
        
        if infill_response.data:
            print(f"✓ Sample records:")
            for record in infill_response.data[:3]:
                print(f"  - {json.dumps(record, indent=4)}")
        else:
            print("⚠ No infill data for this sample")
    else:
        print("⚠ No samples in database")
        
except Exception as e:
    print(f"❌ Error: {str(e)}")

print("\n" + "=" * 60)
print("3. Checking field names in infill_measurements")
print("=" * 60)

try:
    # Get full record to see all fields
    response = supabase.table("infill_measurements").select("*").limit(1).execute()
    if response.data:
        first_record = response.data[0]
        print(f"✓ Available fields: {json.dumps(list(first_record.keys()), indent=2)}")
        print(f"\n✓ Full record: {json.dumps(first_record, indent=2)}")
    else:
        print("⚠ No records to inspect")
except Exception as e:
    print(f"❌ Error: {str(e)}")
