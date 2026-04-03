Para tu contexto concreto como desarrollador de webshooks.com, los Skills son básicamente instrucciones reutilizables que Claude carga automáticamente cuando detecta una tarea relevante. En lugar de explicar el contexto de tu proyecto cada vez, lo encapsulás una sola vez.
Lo que ganás específicamente:
Si te encontrás escribiendo el mismo prompt repetidamente a través de múltiples conversaciones, es momento de crear un Skill. Un Skill fuerte vale más que cien prompts perfectos — el prompt funciona una vez, el Skill funciona siempre. The-ai-corner
Para tu proyecto concreto podrías crear:

webshooks-context — arquitectura del sistema, stack, decisiones tomadas
fastapi-backend — convenciones de código, estructura de carpetas, patrones usados
rag-agent — cómo funciona el agente, LangGraph, Qdrant, flujo de decisión
deploy-hetzner — configuración del VPS, variables de entorno, docker-compose

Cómo organizarlos:
Los Skills son carpetas especializadas que contienen instrucciones, scripts y recursos que Claude descubre y carga dinámicamente cuando son relevantes. Usá Skills cuando las capacidades deban ser accesibles para cualquier instancia de Claude — son expertise portable. GitHub
Para empezar:
Anthropic incluye un meta-skill llamado skill-creator que construye tu primer skill de forma interactiva. Describís tu workflow y Claude genera la estructura de carpetas y el SKILL.md por vos. Verdent
Requiere plan Pro o superior con Code Execution habilitado en Settings → Feature Previews.
Para tu caso lo más útil sería un skill con todo el contexto de webshooks.com — así cada conversación nueva arranca con el contexto completo sin que tengas que explicarlo. ¿Querés que te arme la estructura?como configurar un subagente y que diferencia tiene con los skills y los tools9:17 a. m.Pensando en configuración de subagentes y diferenciación con skills y toolsPensando en configuración de subagentes y diferenciación con skills y toolsBuena pregunta. Son tres conceptos distintos que se confunden fácilmente. Te lo explico en términos concretos para tu proyecto.
La diferencia fundamental:
Skills son como recetas, subagentes son como colaboradores especializados. DEV Community
ToolsSkillsSubagentsQué esFunciones externas (MCP, APIs)Instrucciones reutilizablesAgente independiente con su propio contextoQuién lo activaVos o Claude explícitamenteClaude automáticamente cuando detecta la tareaClaude delegando trabajoContextoCompartidoCompartidoAislado — ventana propiaTools disponiblesLos que tengaLos del agente principalLos que vos definasCuándo usarloConectar con datos externosExpertise repetibleTareas complejas en paralelo o aisladas

Cómo configurar un subagente — se crea como un archivo .md en .claude/agents/:
markdown--- 
name: rag-reviewer
description: Revisa calidad de chunks RAG y encoding. Usar cuando se analicen resultados de Qdrant.
tools: Read, Grep, Glob
model: sonnet
---

Sos un especialista en RAG y sistemas de embeddings.

Cuando revisés chunks:
1. Verificá encoding UTF-8 correcto
2. Chequeá scores de similitud > 0.6
3. Identificá chunks con texto corrupto
4. Reportá categorías sin cobertura suficiente

Formato de respuesta:
- Issues críticos (bloquean producción)
- Warnings (degradan calidad)
- Sugerencias (mejoras opcionales)
Un subagente puede configurarse con diferentes modelos y conjuntos de tools. Por ejemplo, uno puede usar un modelo liviano con tools de solo lectura, mientras otro tiene permisos completos de edición. Zencoder

Para tu proyecto webshooks.com, el esquema ideal sería:
Skills (conocimiento reutilizable):

webshooks-context — arquitectura, stack, decisiones
fastapi-conventions — patrones del backend

Subagentes (trabajo aislado):

rag-reviewer — analiza chunks de Qdrant sin contaminar el contexto principal
deploy-checker — verifica configuración antes de subir a Hetzner

Tools/MCP (conectividad):

PostgreSQL, Qdrant, GitHub

Los subagentes resuelven el problema de context bloat — aíslan el acceso a tools y el razonamiento intermedio en workers dedicados. Towards Data Science