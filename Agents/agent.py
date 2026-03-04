import os
import time
from dotenv import load_dotenv
from openai import OpenAI

# Cargar variables de entorno
load_dotenv()

# Configurar el cliente de OpenAI
# Usamos OPENAI_API_KEY del .env del usuario
api_key = os.getenv("OPENAI_API_KEY")

if not api_key:
    print("Error: No se encontró la API Key de OpenAI. Asegúrate de que OPENAI_API_KEY esté en el archivo .env")
    exit(1)

client = OpenAI(api_key=api_key)

def get_or_create_assistant():
    """Recupera el ID del asistente del entorno o crea uno nuevo."""
    assistant_id = os.getenv("ASSISTANT_ID")
    
    if assistant_id:
        try:
            # Actualizamos el asistente existente con las nuevas instrucciones
            assistant = client.beta.assistants.update(
                assistant_id,
                instructions="""Eres el Vendedor Estrella de 'Agencia Leads'. Tu misión es vender 'Revenue OS'.
        
        REGLAS DE ORO:
        1. Sé CONCISO: No uses más de 2 o 3 oraciones por respuesta.
        2. Tono MARKETINERO: Usa lenguaje persuasivo, enfocado en RESULTADOS y FACTURACIÓN.
        3. ESTRATEGIA DE REGISTRO: 
           - Si es un usuario individual: Mándalo a /es/auth/sign-up.
           - Si es una EMPRESA o Startup buscando Multi-tenant (gestión de CRM, CMS, Dashboards): Mándalo a /es/auth/register-company.
        4. CALL TO ACTION: Mándalo al link correspondiente diciendo que allí podrá desbloquear su instancia privada en segundos.
        5. Ve al GRANO: No des rodeos técnicos, habla de impacto financiero e ingresos.
        6. PERSONALIDAD: Eres audaz, profesional y directo.
        
         Revenue OS incluye módulos de: Executive, Comercial, Marketing, Operaciones y Seguridad.
        
        Ejemplo de respuesta (Empresa): 
        "¿Querés escalar tu organización con dashboards privados y gestión total? Registrá tu empresa ahora en /es/auth/register-company y desplegá tu Revenue OS en 30 segundos."
        
        Responde siempre en español.""",
                model="gpt-4o-mini"
            )
            print(f"Asistente actualizado con nuevas reglas: {assistant.name} ({assistant.id})")
            return assistant
        except Exception as e:
            print(f"Error al actualizar: {e}. Creando uno nuevo...")

    assistant = client.beta.assistants.create(
        name="Agente de Ventas Revenue OS (Mini)",
        instructions="""Eres el Vendedor Estrella de 'Agencia Leads'. Tu misión es vender 'Revenue OS'.
        
        REGLAS DE ORO:
        1. Sé CONCISO: No uses más de 2 o 3 oraciones por respuesta.
        2. Tono MARKETINERO: Usa lenguaje persuasivo, enfocado en RESULTADOS y FACTURACIÓN.
        3. ESTRATEGIA DE REGISTRO: 
           - Si es un usuario individual: Mándalo a /es/auth/sign-up.
           - Si es una EMPRESA o Startup buscando Multi-tenant (gestión de CRM, CMS, Dashboards): Mándalo a /es/auth/register-company.
        4. CALL TO ACTION: Mándalo al link correspondiente diciendo que allí podrá desbloquear su instancia privada en segundos.
        5. Ve al GRANO: No des rodeos técnicos, habla de impacto financiero e ingresos.
        6. PERSONALIDAD: Eres audaz, profesional y directo.
        
         Revenue OS incluye módulos de: Executive, Comercial, Marketing, Operaciones y Seguridad.
        
        Ejemplo de respuesta (Empresa): 
        "¿Querés escalar tu organización con dashboards privados y gestión total? Registrá tu empresa ahora en /es/auth/register-company y desplegá tu Revenue OS en 30 segundos."
        
        Responde siempre en español.""",
        model="gpt-4o-mini",
        tools=[]
    )
    print(f"Nuevo asistente creado con ID: {assistant.id}")
    print(f"CONSEJO: Guarda este ID en tu .env como ASSISTANT_ID={assistant.id} para no crear uno nuevo cada vez.")
    return assistant

def chat_with_assistant(assistant_id, thread_id=None):
    """Maneja el flujo de conversación interactiva."""
    if not thread_id:
        thread = client.beta.threads.create()
        thread_id = thread.id
    
    while True:
        user_input = input("\nTú: ").strip()
        if not user_input:
            continue
            
        if user_input.lower() in ["salir", "exit", "quit"]:
            break
        
        # Enviar mensaje
        client.beta.threads.messages.create(
            thread_id=thread_id,
            role="user",
            content=user_input
        )
        
        # Ejecutar
        run = client.beta.threads.runs.create(
            thread_id=thread_id,
            assistant_id=assistant_id
        )
        
        print("El agente está pensando...", end="\r")
        while True:
            run_status = client.beta.threads.runs.retrieve(thread_id=thread_id, run_id=run.id)
            if run_status.status == 'completed':
                break
            elif run_status.status in ['failed', 'cancelled', 'expired']:
                print(f"\nError en el run: {run_status.status}")
                return
            time.sleep(1)
            
        # Obtener respuesta
        messages = client.beta.threads.messages.list(thread_id=thread_id)
        for msg in messages.data:
            if msg.role == "assistant":
                print(f"\nAgente: {msg.content[0].text.value}")
                break

if __name__ == "__main__":
    sales_agent = get_or_create_assistant()
    print("\n--- Bienvenido al Chat de Ventas de Agencia B2B ---")
    print("Escribe 'salir' para terminar.")
    chat_with_assistant(sales_agent.id)
