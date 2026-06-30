#!/usr/bin/env python
"""
Test script para validar a feature de mudança de status de experimentos.
Simula o fluxo completo: GET experiments → PATCH status → verify update
"""

import requests
import json
from typing import Dict, Any

# Configuration
API_URL = "http://localhost:8000/api/v1"
TEST_TOKEN = "test-admin-token"  # Será substituído pelo token real

ADMIN_HEADERS = {
    "Authorization": f"Bearer {TEST_TOKEN}",
    "Content-Type": "application/json"
}

# ANSI colors for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_header(text: str):
    print(f"\n{Colors.HEADER}{Colors.BOLD}{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}{Colors.ENDC}\n")

def print_success(text: str):
    print(f"{Colors.OKGREEN}✓ {text}{Colors.ENDC}")

def print_error(text: str):
    print(f"{Colors.FAIL}✗ {text}{Colors.ENDC}")

def print_info(text: str):
    print(f"{Colors.OKCYAN}ℹ {text}{Colors.ENDC}")

def print_warning(text: str):
    print(f"{Colors.WARNING}⚠ {text}{Colors.ENDC}")

def test_get_experiments() -> Dict[str, Any]:
    """Test 1: GET /admin/experiments"""
    print_info("Testando GET /admin/experiments...")
    
    try:
        response = requests.get(
            f"{API_URL}/admin/experiments",
            headers=ADMIN_HEADERS,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Resposta recebida com status 200")
            print_info(f"  • Experimentos Aprovados: {data.get('total_approved', 0)}")
            print_info(f"  • Experimentos em Análise: {data.get('total_in_analysis', 0)}")
            
            # Get first in-analysis experiment for testing status change
            in_analysis = data.get('in_analysis', [])
            if in_analysis:
                exp = in_analysis[0]
                print_success(f"Experimento selecionado para teste:")
                print_info(f"  • ID: {exp.get('id')}")
                print_info(f"  • Pesquisador: {exp.get('researcher_name')}")
                print_info(f"  • Status Atual: {exp.get('status')}")
                print_info(f"  • Material: {exp.get('material_brand')} {exp.get('material_model')}")
                print_info(f"  • Máquina: {exp.get('machine_brand')} {exp.get('machine_model')}")
                print_info(f"  • Infill (HU): {exp.get('infill_hu_mean')}")
                print_info(f"  • Dados: Mec={exp.get('mechanical_data_count')}, Atn={exp.get('attenuation_data_count')}, Beam={exp.get('beam_qualities_exists')}")
                
                return {"success": True, "data": data, "selected_experiment": exp}
            else:
                print_warning("Nenhum experimento em análise encontrado para teste")
                approved = data.get('approved', [])
                if approved:
                    exp = approved[0]
                    print_info(f"Usando experimento aprovado: {exp.get('id')}")
                    return {"success": True, "data": data, "selected_experiment": exp}
                else:
                    print_error("Nenhum experimento encontrado no sistema")
                    return {"success": False, "data": data}
        else:
            print_error(f"Status {response.status_code}: {response.text}")
            return {"success": False}
            
    except requests.exceptions.ConnectionError:
        print_error(f"Não foi possível conectar a {API_URL}")
        print_warning("Certifique-se de que o servidor está rodando:")
        print_warning("  cd AMRAD_BACKEND && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000")
        return {"success": False}
    except Exception as e:
        print_error(f"Erro: {str(e)}")
        return {"success": False}

def test_update_status(experiment_id: str, current_status: str) -> Dict[str, Any]:
    """Test 2: PATCH /admin/experiments/{id}/status"""
    
    # Determine new status (cycle through statuses)
    status_map = {
        "Submitted": "Revisions",
        "Revisions": "Review",
        "Review": "Approved",
        "Approved": "Revisions",
    }
    
    new_status = status_map.get(current_status, "Revisions")
    
    print_info(f"Testando mudança de status: {current_status} → {new_status}...")
    
    try:
        response = requests.patch(
            f"{API_URL}/admin/experiments/{experiment_id}/status",
            headers=ADMIN_HEADERS,
            json={"status": new_status},
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            print_success(f"Status atualizado com sucesso!")
            print_info(f"  • Experimento ID: {data.get('experiment_id')}")
            print_info(f"  • Novo Status: {data.get('new_status')}")
            print_info(f"  • Mensagem: {data.get('message')}")
            
            return {
                "success": True,
                "experiment_id": experiment_id,
                "new_status": new_status,
                "response": data
            }
        else:
            print_error(f"Status {response.status_code}")
            print_info(f"Resposta: {response.text}")
            return {"success": False}
            
    except Exception as e:
        print_error(f"Erro ao atualizar status: {str(e)}")
        return {"success": False}

def test_verify_update(experiment_id: str, expected_status: str) -> Dict[str, Any]:
    """Test 3: GET /admin/experiments (verify update took effect)"""
    
    print_info(f"Verificando se o status foi atualizado para '{expected_status}'...")
    
    try:
        response = requests.get(
            f"{API_URL}/admin/experiments",
            headers=ADMIN_HEADERS,
            timeout=5
        )
        
        if response.status_code == 200:
            data = response.json()
            
            # Search for the experiment in both lists
            all_experiments = data.get('approved', []) + data.get('in_analysis', [])
            experiment = next((e for e in all_experiments if e.get('id') == experiment_id), None)
            
            if experiment:
                actual_status = experiment.get('status')
                if actual_status == expected_status:
                    print_success(f"✓ Status verificado: {actual_status}")
                    return {"success": True, "actual_status": actual_status}
                else:
                    print_error(f"Status não corresponde. Esperado: {expected_status}, Recebido: {actual_status}")
                    return {"success": False, "actual_status": actual_status, "expected_status": expected_status}
            else:
                print_warning(f"Experimento not encontrado na segunda consulta")
                return {"success": False}
        else:
            print_error(f"Status {response.status_code} ao verificar")
            return {"success": False}
            
    except Exception as e:
        print_error(f"Erro ao verificar: {str(e)}")
        return {"success": False}

def run_all_tests():
    """Run complete test flow"""
    print_header("TESTE COMPLETO: Feature de Mudança de Status de Experimentos")
    
    test_results = {
        "test_get_experiments": None,
        "test_update_status": None,
        "test_verify_update": None,
        "overall": "FAILED"
    }
    
    # Test 1: Get experiments
    print_header("TEST 1: Buscar Experimentos")
    result1 = test_get_experiments()
    test_results["test_get_experiments"] = result1.get("success", False)
    
    if not result1.get("success"):
        print_error("\nTestes abortados: GET /admin/experiments falhou")
        return test_results
    
    selected_exp = result1.get("selected_experiment")
    if not selected_exp:
        print_error("\nTestes abortados: Nenhum experimento disponível")
        return test_results
    
    # Test 2: Update status
    print_header("TEST 2: Atualizar Status do Experimento")
    result2 = test_update_status(selected_exp.get('id'), selected_exp.get('status'))
    test_results["test_update_status"] = result2.get("success", False)
    
    if not result2.get("success"):
        print_error("\nTestes abortados: PATCH /admin/experiments/{id}/status falhou")
        return test_results
    
    # Test 3: Verify update
    print_header("TEST 3: Verificar Atualização")
    result3 = test_verify_update(selected_exp.get('id'), result2.get('new_status'))
    test_results["test_verify_update"] = result3.get("success", False)
    
    # Final summary
    print_header("RESUMO DOS TESTES")
    
    all_passed = all([
        test_results["test_get_experiments"],
        test_results["test_update_status"],
        test_results["test_verify_update"]
    ])
    
    print(f"\n{Colors.BOLD}Resultados:{Colors.ENDC}")
    print(f"  1. GET /admin/experiments: {'✓ PASSOU' if test_results['test_get_experiments'] else '✗ FALHOU'}")
    print(f"  2. PATCH /experiments/{{id}}/status: {'✓ PASSOU' if test_results['test_update_status'] else '✗ FALHOU'}")
    print(f"  3. Verificação de update: {'✓ PASSOU' if test_results['test_verify_update'] else '✗ FALHOU'}")
    
    if all_passed:
        print_success(f"\n{'='*60}")
        print_success("TODOS OS TESTES PASSARAM! ✓ Feature funcionando corretamente!")
        print_success(f"{'='*60}")
        test_results["overall"] = "PASSED"
    else:
        print_error(f"\n{'='*60}")
        print_error("ALGUNS TESTES FALHARAM ✗")
        print_error(f"{'='*60}")
    
    return test_results

if __name__ == "__main__":
    import sys
    
    try:
        results = run_all_tests()
        sys.exit(0 if results["overall"] == "PASSED" else 1)
    except KeyboardInterrupt:
        print("\n\n⚠ Testes interrompidos pelo usuário")
        sys.exit(2)
    except Exception as e:
        print(f"\n{Colors.FAIL}Erro fatal: {str(e)}{Colors.ENDC}")
        sys.exit(3)
