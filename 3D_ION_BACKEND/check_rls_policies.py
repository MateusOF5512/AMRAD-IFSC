"""
Script para verificar RLS policies na tabela sample_status_history
"""

from app.database.supabase import get_supabase_client

def check_rls_policies():
    try:
        supabase = get_supabase_client()
        
        print("[RLS Check] Conectando ao Supabase...")
        
        # Tentar buscar dados da tabela
        print("[RLS Check] Tentando buscar dados da tabela sample_status_history...")
        response = supabase.table("sample_status_history").select("*").execute()
        
        print(f"[RLS Check] Sucesso! Registros encontrados: {len(response.data) if response.data else 0}")
        
        if response.data:
            print(f"[RLS Check] Primeiro registro: {response.data[0]}")
        
        return True
        
    except Exception as e:
        print(f"[RLS Check] ERRO: {str(e)}")
        print(f"[RLS Check] Type: {type(e).__name__}")
        return False

if __name__ == "__main__":
    check_rls_policies()
