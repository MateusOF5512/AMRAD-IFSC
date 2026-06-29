#!/usr/bin/env python3
"""Check if historico table exists."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from load_env import load_project_env

load_project_env()

from app.core.config import settings
from supabase import create_client

SUPABASE_URL = settings.SUPABASE_URL
SUPABASE_KEY = settings.SUPABASE_SERVICE_ROLE_KEY

if not SUPABASE_URL or not SUPABASE_KEY:
    print("SUPABASE settings not configured")
    exit(1)

try:
    supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    print("Connected to Supabase")

    tables_to_check = ["historico", "sample_status_history", "application_logs"]
    for table in tables_to_check:
        try:
            response = supabase.table(table).select("id").limit(1).execute()
            print(f"  {table}: OK ({len(response.data or [])} sample row)")
        except Exception as e:
            print(f"  {table}: ERROR - {e}")

except Exception as e:
    print(f"Connection failed: {e}")
