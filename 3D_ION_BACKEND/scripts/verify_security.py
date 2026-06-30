#!/usr/bin/env python3
"""
Security verification for AMRAD Supabase RLS hardening.

Run from AMRAD_BACKEND:
  python scripts/verify_security.py

Requires SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY in env
(root .env or AMRAD_BACKEND/.env).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

# Load env from repo root or backend folder
for env_path in (
    Path(__file__).resolve().parents[2] / ".env",
    Path(__file__).resolve().parents[1] / ".env",
):
    if env_path.exists():
        load_dotenv(env_path)
        break

SENSITIVE_TABLES = [
    "researchers",
    "materials",
    "machines",
    "samples",
    "infill_measurements",
    "mechanical_properties",
    "linear_attenuation",
    "beam_qualities",
    "ct_scan_points",
    "sample_status_history",
    "application_logs",
    "attenuation_tests",
    "attenuation_measurements",
    "user_status_logs",
    "historico",
]

PASS = "PASS"
FAIL = "FAIL"
WARN = "WARN"


def _clients():
    url = os.getenv("SUPABASE_URL")
    anon = os.getenv("SUPABASE_ANON_KEY")
    service = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    missing = [k for k, v in {
        "SUPABASE_URL": url,
        "SUPABASE_ANON_KEY": anon,
        "SUPABASE_SERVICE_ROLE_KEY": service,
    }.items() if not v]
    if missing:
        print(f"{FAIL} Missing env: {', '.join(missing)}")
        sys.exit(1)
    return (
        create_client(url, anon),
        create_client(url, service),
    )


def check_anon_blocked(anon_client) -> list[tuple[str, str, str]]:
    results = []
    for table in SENSITIVE_TABLES:
        try:
            resp = anon_client.table(table).select("*").limit(1).execute()
            if resp.data:
                results.append((FAIL, table, f"anon returned {len(resp.data)} row(s) — LEAK"))
            else:
                results.append((PASS, table, "anon returned 0 rows"))
        except Exception as exc:
            msg = str(exc).lower()
            if any(x in msg for x in ("permission denied", "42501", "not authorized", "jwt")):
                results.append((PASS, table, "anon blocked (permission denied)"))
            else:
                results.append((WARN, table, f"unexpected error: {exc}"))
    return results


def check_service_role_access(service_client) -> list[tuple[str, str, str]]:
    results = []
    for table in SENSITIVE_TABLES:
        try:
            resp = service_client.table(table).select("*").limit(1).execute()
            results.append((PASS, table, f"service_role OK (rows sample: {len(resp.data or [])})"))
        except Exception as exc:
            results.append((FAIL, table, f"service_role failed: {exc}"))
    return results


def check_rpc_locked(anon_client, service_client) -> list[tuple[str, str, str]]:
    results = []
    for fn, args in (
        ("truncate_experimental_data", {}),
        ("current_researcher_id", {}),
    ):
        for label, client in (("anon", anon_client), ("service", service_client)):
            try:
                client.rpc(fn, args).execute()
                if label == "anon":
                    results.append((FAIL, f"rpc/{fn}", f"{label} can execute — CRITICAL"))
                else:
                    results.append((PASS, f"rpc/{fn}", f"{label} can execute (expected)"))
            except Exception as exc:
                msg = str(exc).lower()
                if label == "anon":
                    if any(x in msg for x in ("permission denied", "42501", "not found", "function")):
                        results.append((PASS, f"rpc/{fn}", f"{label} blocked"))
                    else:
                        results.append((WARN, f"rpc/{fn}", f"{label}: {exc}"))
                else:
                    results.append((WARN, f"rpc/{fn}", f"{label}: {exc}"))
    return results


def check_db_invariants(service_client) -> list[tuple[str, str, str]]:
    """SQL checks via service_role raw query if available; fallback skip."""
    results = []
    try:
        # PostgREST doesn't run arbitrary SQL; use table probes instead
        resp = service_client.table("pattern_types").select("id", count="exact").execute()
        count = len(resp.data or [])
        if count >= 13:
            results.append((PASS, "pattern_types", f"seed data present ({count} rows)"))
        else:
            results.append((WARN, "pattern_types", f"expected >=13 rows, got {count}"))
    except Exception as exc:
        results.append((FAIL, "pattern_types", str(exc)))

    try:
        service_client.table("user_status_logs").select("id").limit(1).execute()
        results.append((PASS, "user_status_logs", "table exists"))
    except Exception as exc:
        results.append((FAIL, "user_status_logs", str(exc)))

  # drop_old_infill_measurements must not exist — probe via rpc
    try:
        anon = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_ANON_KEY"))
        anon.rpc("drop_old_infill_measurements", {}).execute()
        results.append((FAIL, "drop_old_infill_measurements", "dangerous function still callable"))
    except Exception as exc:
        msg = str(exc).lower()
        if "could not find" in msg or "not find" in msg or "42883" in msg or "permission" in msg:
            results.append((PASS, "drop_old_infill_measurements", "removed or blocked"))
        else:
            results.append((WARN, "drop_old_infill_measurements", str(exc)))

    return results


def print_section(title: str, rows: list[tuple[str, str, str]]) -> tuple[int, int, int]:
    print(f"\n{'=' * 60}")
    print(title)
    print("=" * 60)
    p = f = w = 0
    for status, name, detail in rows:
        icon = {"PASS": "OK", "FAIL": "XX", "WARN": "!!"}.get(status, "?")
        print(f"  {icon} [{status}] {name}: {detail}")
        if status == PASS:
            p += 1
        elif status == FAIL:
            f += 1
        else:
            w += 1
    return p, f, w


def main() -> int:
    print("AMRAD Security Verification")
    print("-" * 60)

    anon_client, service_client = _clients()

    totals = [0, 0, 0]
    for title, rows in (
        ("1. Anon key — must NOT read sensitive tables", check_anon_blocked(anon_client)),
        ("2. Service role — backend must read all tables", check_service_role_access(service_client)),
        ("3. Dangerous RPC — anon must be blocked", check_rpc_locked(anon_client, service_client)),
        ("4. Schema invariants", check_db_invariants(service_client)),
    ):
        p, f, w = print_section(title, rows)
        totals[0] += p
        totals[1] += f
        totals[2] += w

    print(f"\n{'=' * 60}")
    print(f"SUMMARY: {totals[0]} passed, {totals[1]} failed, {totals[2]} warnings")
    print("=" * 60)

    print("\nManual checks (Dashboard):")
    print("  - Supabase > Database > Advisors > Security (0 critical)")
    print("  - Auth > Email > Leaked password protection > Enable")
    print("  - Settings > API > confirm service_role NEVER in frontend .env")
    print("  - Frontend .env only NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY")

    if totals[1] > 0:
        print(f"\n{FAIL} Security verification FAILED")
        return 1
    print(f"\n{PASS} Security verification PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
