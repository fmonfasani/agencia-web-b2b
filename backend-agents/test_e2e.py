"""
TEST END-TO-END - webshooks.com
================================
Prueba TODOS los endpoints de backend-saas:8000 y backend-agents:8001

Ejecutar:
  python test_e2e.py

Requiere:
  pip install requests
"""

import requests
import json
import time
from pathlib import Path
from typing import Optional

# ============================================================================
# CONFIG
# ============================================================================

SAAS_URL = "http://localhost:8000"
AGENTS_URL = "http://localhost:8001"

# API Key para pruebas (debe existir en la DB - creada por seed script)
TEST_API_KEY = "wh_ea843322b20871ff43a5d7557d255573"

# Tenant para pruebas
TEST_TENANT_ID = "tenant_cliente_default"

# ============================================================================
# COLORES PARA OUTPUT
# ============================================================================

class Colors:
    GREEN = "\033[92m"
    RED = "\033[91m"
    YELLOW = "\033[93m"
    BLUE = "\033[94m"
    RESET = "\033[0m"
    BOLD = "\033[1m"

def print_test(name: str):
    """Imprime encabezado de test."""
    print(f"\n{Colors.BLUE}{Colors.BOLD}▶ {name}{Colors.RESET}")

def print_success(msg: str):
    """Imprime mensaje de éxito."""
    print(f"  {Colors.GREEN}✓ {msg}{Colors.RESET}")

def print_error(msg: str):
    """Imprime mensaje de error."""
    print(f"  {Colors.RED}✗ {msg}{Colors.RESET}")

def print_info(msg: str):
    """Imprime información."""
    print(f"  {Colors.YELLOW}ℹ {msg}{Colors.RESET}")

def print_response(status: int, data: dict = None):
    """Imprime respuesta HTTP."""
    if status >= 200 and status < 300:
        print(f"  {Colors.GREEN}Status {status}{Colors.RESET}")
    else:
        print(f"  {Colors.RED}Status {status}{Colors.RESET}")
    
    if data:
        print(f"  Response: {json.dumps(data, indent=2, ensure_ascii=False)[:200]}...")

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def make_request(
    method: str,
    url: str,
    headers: Optional[dict] = None,
    data: Optional[dict] = None,
    json_data: Optional[dict] = None,
    files: Optional[dict] = None,
) -> tuple[int, dict]:
    """Hace un request HTTP y retorna (status_code, response_json)."""
    try:
        if method == "GET":
            r = requests.get(url, headers=headers)
        elif method == "POST":
            if files:
                r = requests.post(url, headers=headers, data=data, files=files)
            elif json_data is not None:
                r = requests.post(url, headers=headers, json=json_data)
            elif data is not None:
                r = requests.post(url, headers=headers, data=data)
            else:
                r = requests.post(url, headers=headers)
        elif method == "DELETE":
            r = requests.delete(url, headers=headers)
        else:
            raise ValueError(f"Método desconocido: {method}")
        
        try:
            return r.status_code, r.json()
        except:
            return r.status_code, {"text": r.text}
    except requests.exceptions.ConnectionError:
        print_error(f"No se puede conectar a {url}")
        return 0, {}
    except Exception as e:
        print_error(f"Error en request: {e}")
        return 0, {}

# ============================================================================
# TEST SUITE
# ============================================================================

def test_health_checks():
    """Test 1: Health checks en ambos backends."""
    print_test("TEST 1: Health Checks")
    
    # backend-saas
    status, data = make_request("GET", f"{SAAS_URL}/health")
    if status == 200:
        print_success(f"backend-saas:8000 /health - OK")
        print_response(status, data)
    else:
        print_error(f"backend-saas:8000 /health - FALLO (status {status})")
        return False
    
    # backend-agents
    status, data = make_request("GET", f"{AGENTS_URL}/health")
    if status == 200:
        print_success(f"backend-agents:8001 /health - OK")
        print_response(status, data)
    else:
        print_error(f"backend-agents:8001 /health - FALLO (status {status})")
        return False
    
    return True


def test_auth():
    """Test 2: Autenticación."""
    print_test("TEST 2: Autenticación (Auth)")
    
    # Validar API Key
    headers = {"X-API-Key": TEST_API_KEY}
    status, data = make_request("GET", f"{SAAS_URL}/tenant/me", headers=headers)
    
    if status == 200:
        print_success(f"API Key válida - GET /tenant/me OK")
        print_response(status, data)
        return True
    elif status == 401:
        print_error(f"API Key inválida (401)")
        print_info("¿Ejecutaste el seed script en backend-saas?")
        return False
    else:
        print_error(f"Error inesperado (status {status})")
        return False


def test_create_tenant():
    """Test 3: Crear tenant."""
    print_test("TEST 3: Crear Tenant (POST /onboarding/tenant)")
    
    onboarding_form = {
        "tenant_id": TEST_TENANT_ID,
        "tenant_nombre": "Test Clinic E2E",
        "industria": "salud",
        "subcategoria": "diagnóstico",
        "descripcion_corta": "Clínica de diagnóstico para tests E2E",
        "proposito_principal": "Responder preguntas sobre coberturas y sedes",
        "acciones_habilitadas": ["responder_preguntas", "listar_coberturas"],
        "acciones_prohibidas": [],
        "tono": "profesional",
        "mensaje_fallback": "No tengo esa información disponible",
        "entidades_clave": [
            {
                "nombre": "cobertura",
                "descripcion": "Obras sociales y prepagas",
                "storage": "postgresql",
                "es_consultable_directamente": True,
                "atributos": ["nombre", "sede"]
            }
        ],
        "coberturas": ["OSDE", "SWISS MEDICAL", "AXA"],
        "sedes": [
            {
                "nombre": "Sede Centro",
                "direccion": "Av. Corrientes 1234, CABA",
                "telefonos": ["+54-11-1234-5678"],
                "mail": "centro@testclinic.com",
                "horario_semana": "08:00-20:00",
                "horario_sabado": "09:00-17:00"
            }
        ],
        "servicios": [
            {
                "nombre": "Ecografía",
                "categoria": "imagen",
                "descripcion": "Ecografía abdominal y obstétrica"
            }
        ],
        "hints": {
            "industria_context": "Centro de diagnóstico médico",
            "terminos_clave": ["cobertura", "obra social", "sede", "horario"],
            "preguntas_frecuentes_esperadas": [
                "¿Atienden con OSDE?",
                "¿Cuál es el horario?",
                "¿Dónde están ubicados?"
            ],
            "entidades_de_alta_frecuencia": ["OSDE", "SWISS MEDICAL", "Centro"],
            "datos_ausentes_conocidos": []
        }
    }
    
    headers = {"X-API-Key": TEST_API_KEY}
    status, data = make_request("POST", f"{SAAS_URL}/onboarding/tenant", headers=headers, json_data=onboarding_form)
    
    if status == 200:
        print_success(f"Tenant creado - Status 200")
        print_response(status, data)
        print_info(f"Datos cargados: {data.get('datos_cargados', {})}")
        return True, onboarding_form
    else:
        print_error(f"Error creando tenant - Status {status}")
        print_response(status, data)
        return False, None


def test_upload_files():
    """Test 4: Subir archivos."""
    print_test("TEST 4: Subir Archivos (POST /onboarding/upload)")
    
    # Crear archivo de prueba
    test_file_path = Path("test_document.txt")
    test_file_content = """
    CENTRO DE DIAGNÓSTICO TEST
    ==========================
    
    Coberturas aceptadas:
    - OSDE
    - SWISS MEDICAL
    - AXA
    - MEDICUS
    
    Horarios:
    Lunes a Viernes: 8:00 - 20:00
    Sábado: 9:00 - 17:00
    Domingo: Cerrado
    
    Sedes:
    - Centro: Av. Corrientes 1234, Tel: 1234-5678
    - Flores: Av. Acoyte 456, Tel: 9876-5432
    """
    
    test_file_path.write_text(test_file_content)
    
    try:
        with open(test_file_path, "rb") as f:
            files = {"file1": ("test_document.txt", f, "text/plain")}
            data = {
                "tenant_id": TEST_TENANT_ID,
            }
            
            status, response = make_request("POST", f"{SAAS_URL}/onboarding/upload", data=data, files=files)
        
        if status == 200:
            print_success(f"Archivos subidos - Status 200")
            print_response(status, response)
            archivos_guardados = response.get("archivos_guardados", [])
            print_info(f"Archivos guardados: {len(archivos_guardados)}")
            return True
        else:
            print_error(f"Error subiendo archivos - Status {status}")
            print_response(status, response)
            return False
    finally:
        test_file_path.unlink(missing_ok=True)


def test_onboarding_status():
    """Test 5: Verificar estado de onboarding."""
    print_test("TEST 5: Verificar Estado (GET /onboarding/status/{tenant_id})")
    
    status, data = make_request("GET", f"{SAAS_URL}/onboarding/status/{TEST_TENANT_ID}")
    
    if status == 200:
        print_success(f"Estado obtenido - Status 200")
        print_response(status, data)
        
        postgresql = data.get("postgresql", {})
        qdrant = data.get("qdrant", {})
        
        print_info(f"PostgreSQL - Coberturas: {postgresql.get('tenant_coberturas', 0)}")
        print_info(f"PostgreSQL - Sedes: {postgresql.get('tenant_sedes', 0)}")
        print_info(f"Qdrant - Chunks: {qdrant.get('chunks_total', 0)}")
        
        return True, data
    else:
        print_error(f"Error obteniendo estado - Status {status}")
        print_response(status, data)
        return False, None


def test_ingestion(form_data: dict):
    """Test 6: Ejecutar ingesta con LLM en backend-agents."""
    print_test("TEST 6: Ingesta con LLM (POST /onboarding/ingest en backend-agents)")
    
    form_json = json.dumps(form_data)
    
    data = {
        "tenant_id": TEST_TENANT_ID,
        "form_json": form_json,
        "api_key": TEST_API_KEY,
    }
    
    print_info("Esto puede tardar ~1-2 minutos...")
    start = time.time()
    
    status, response = make_request("POST", f"{AGENTS_URL}/onboarding/ingest", data=data)
    
    elapsed = time.time() - start
    
    if status == 200:
        print_success(f"Ingesta completada - Status 200 ({elapsed:.1f}s)")
        print_response(status, response)
        
        chunks_generados = response.get("chunks_generados", 0)
        chunks_almacenados = response.get("chunks_almacenados", 0)
        modelo = response.get("modelo_usado", "desconocido")
        
        print_info(f"Chunks generados: {chunks_generados}")
        print_info(f"Chunks almacenados: {chunks_almacenados}")
        print_info(f"Modelo usado: {modelo}")
        
        return True
    else:
        print_error(f"Error en ingesta - Status {status}")
        print_response(status, response)
        return False


def test_agent_execute():
    """Test 7: Ejecutar query al agente."""
    print_test("TEST 7: Ejecutar Query (POST /agent/execute)")
    
    headers = {"X-API-Key": TEST_API_KEY}
    
    queries = [
        "¿Atienden con OSDE?",
        "¿Cuál es el horario?",
        "¿Dónde están ubicados?",
    ]
    
    for query in queries:
        data = {
            "query": query,
            "tenant_id": TEST_TENANT_ID,
            "max_iterations": 5,
        }
        
        print_info(f'Query: "{query}"')
        start = time.time()
        
        status, response = make_request("POST", f"{AGENTS_URL}/agent/execute", headers=headers, json_data=data)
        
        elapsed = time.time() - start
        
        if status == 200:
            print_success(f"Query ejecutada ({elapsed:.1f}s)")
            result = response.get("result", [])
            if result:
                answer = result[0].get("content", "Sin respuesta")
                print_info(f"Respuesta: {answer[:100]}...")
            
            metadata = response.get("metadata", {})
            print_info(f"Iterations: {metadata.get('iterations', 0)}, RAG hits: {metadata.get('rag_hits_count', 0)}")
        else:
            print_error(f"Error ejecutando query - Status {status}")
            print_response(status, response)


def test_agent_traces():
    """Test 8: Listar traces del agente."""
    print_test("TEST 8: Listar Traces (GET /agent/traces)")
    
    headers = {"X-API-Key": TEST_API_KEY}
    
    status, data = make_request("GET", f"{AGENTS_URL}/agent/traces?limit=10", headers=headers)
    
    if status == 200:
        print_success(f"Traces obtenidos - Status 200")
        traces = data.get("traces", [])
        print_info(f"Total de traces: {len(traces)}")
        
        if traces:
            latest = traces[0]
            print_info(f"Último trace: {latest.get('request_id')} - {latest.get('task')[:50]}...")
        
        return True
    else:
        print_error(f"Error obteniendo traces - Status {status}")
        print_response(status, data)
        return False


def test_agent_metrics():
    """Test 9: Métricas del agente."""
    print_test("TEST 9: Métricas (GET /metrics/agent)")
    
    headers = {"X-API-Key": TEST_API_KEY}
    
    status, data = make_request("GET", f"{AGENTS_URL}/metrics/agent", headers=headers)
    
    if status == 200:
        print_success(f"Métricas obtenidas - Status 200")
        metrics = data.get("metrics", [])
        print_info(f"Métrica(s): {len(metrics)}")
        
        for m in metrics:
            print_info(f"  - {m.get('finish_reason')}: {m.get('total')} queries, avg {m.get('avg_ms')}ms")
        
        return True
    else:
        print_error(f"Error obteniendo métricas - Status {status}")
        print_response(status, data)
        return False


def test_cleanup():
    """Test 10: Limpiar tenant."""
    print_test("TEST 10: Limpiar Tenant (DELETE /onboarding/tenant)")
    
    headers = {"X-API-Key": TEST_API_KEY}
    
    status, data = make_request("DELETE", f"{SAAS_URL}/onboarding/tenant/{TEST_TENANT_ID}", headers=headers)
    
    if status == 200:
        print_success(f"Tenant eliminado - Status 200")
        print_response(status, data)
        return True
    else:
        print_error(f"Error eliminando tenant - Status {status}")
        print_response(status, data)
        return False


# ============================================================================
# MAIN
# ============================================================================

def run_all_tests():
    """Ejecuta todos los tests."""
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("  TEST END-TO-END - webshooks.com")
    print("  Probando TODOS los endpoints")
    print("=" * 80)
    print(Colors.RESET)
    
    results = {}
    
    # Test 1: Health checks
    results["1_health_checks"] = test_health_checks()
    if not results["1_health_checks"]:
        print_error("Health checks fallaron. Asegúrate de que ambos backends estén corriendo.")
        return
    
    # Test 2: Auth
    results["2_auth"] = test_auth()
    if not results["2_auth"]:
        print_error("Auth falló. Verifica que el API Key sea válido.")
        return
    
    # Test 3: Create tenant
    results["3_create_tenant"], form_data = test_create_tenant()
    if not results["3_create_tenant"]:
        print_error("No se pudo crear el tenant.")
        return
    
    # Test 4: Upload files
    results["4_upload_files"] = test_upload_files()
    
    # Test 5: Check status
    results["5_status"], status_data = test_onboarding_status()
    
    # Test 6: Ingestion
    results["6_ingestion"] = test_ingestion(form_data)
    
    # Test 7: Execute agent
    test_agent_execute()
    
    # Test 8: Get traces
    results["8_traces"] = test_agent_traces()
    
    # Test 9: Get metrics
    results["9_metrics"] = test_agent_metrics()
    
    # Test 10: Cleanup (optional)
    print_test("TEST 10 (OPCIONAL): Cleanup - ¿Eliminar tenant?")
    print_info("Presioná 's' para limpiar, 'n' para mantener los datos de prueba")
    response = input("> ").strip().lower()
    if response == "s":
        results["10_cleanup"] = test_cleanup()
    else:
        print_info("Datos de prueba mantenidos para inspección")
    
    # Resumen
    print(f"\n{Colors.BOLD}{Colors.BLUE}")
    print("=" * 80)
    print("  RESUMEN DE TESTS")
    print("=" * 80)
    print(Colors.RESET)
    
    passed = sum(1 for v in results.values() if v is True)
    total = len(results)
    
    for test_name, result in results.items():
        status = f"{Colors.GREEN}✓ PASS{Colors.RESET}" if result else f"{Colors.RED}✗ FAIL{Colors.RESET}"
        print(f"  {test_name}: {status}")
    
    print(f"\n  {Colors.BOLD}Total: {passed}/{total} tests pasaron{Colors.RESET}\n")


if __name__ == "__main__":
    run_all_tests()
