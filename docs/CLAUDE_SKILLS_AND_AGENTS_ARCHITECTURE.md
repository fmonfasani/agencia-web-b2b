# Claude Skills y Agentes: Estructura Reutilizable para GitHub

Este documento resume una arquitectura recomendada para organizar skills y agentes de Claude de forma reusable, mantenible y versionable.

## 1. Estructura sugerida de repositorio

```text
ai-ops-kit/
  README.md
  LICENSE
  pyproject.toml                # opcional, si hay utilidades Python compartidas
  skills/
    finobs-audit/
      SKILL.md
      metadata.json
      examples/
      assets/
      scripts/                  # opcional
    lead-scoring/
      SKILL.md
      metadata.json
  agents/
    architecture-agent.md
    refactor-agent.md
  shared/
    python/
    prompts/
  templates/
    settings.local.example.json
```

## 2. Qué debe incluir cada parte

### `skills/<nombre>/SKILL.md`
- Objetivo de la skill.
- Inputs esperados.
- Flujo de ejecución paso a paso.
- Restricciones de seguridad.
- Output esperado.

### `skills/<nombre>/metadata.json`
- `name`, `version`, `owner`.
- `tags` (por dominio/capacidad).
- Dependencias y compatibilidad.
- Estado (`alpha`, `beta`, `stable`).

### `skills/<nombre>/scripts/`
- Lógica ejecutable real (Python/Bash/PowerShell).
- Evita duplicar lógica en prompts.
- Permite tests y validación reproducible.

### `agents/*.md`
- Agentes orquestadores.
- Deciden qué skill usar y cuándo.
- Mantienen reglas de coordinación y priorización.

### `shared/`
- Código/prompts compartidos por múltiples skills/agentes.
- Evita copiar-pegar entre proyectos.

## 3. Convenciones recomendadas para reutilizar en GitHub

1. Usar versionado semántico (`v1.2.0`) por skill/agente.
2. Definir contrato estable de entrada/salida (idealmente JSON).
3. Mantener `CHANGELOG.md` por skill.
4. Agregar tests mínimos a scripts críticos.
5. No hardcodear rutas locales; usar variables (`PROJECT_ROOT`, `TOOLS_ROOT`).
6. Separar prompt (SKILL.md) de implementación (`scripts/`).

## 4. Reutilización entre repos

### Opción A: Submódulo Git
- Crear un repo central de skills.
- Consumirlo desde proyectos como submódulo.

### Opción B: Repo central + sincronización
- Mantener un repo `shared-skills`.
- Sincronizar vía script o pipeline.

### Opción C: Paquete instalable
- Publicar utilidades compartidas como paquete Python.
- Consumir con `pip install -e` en desarrollo.

## 5. Aplicado a tu caso actual

Patrón recomendado:
- `.claude/agents/` como capa de orquestación.
- `ai-finobs-claude/`, `ai-lead-gen-claude/`, `ai-marketing-claude/` como aplicaciones/skills de dominio.
- Una carpeta compartida (`shared-tools` o `shared`) para utilidades comunes.

## 6. Regla práctica

Si algo es reusable y técnico, va a `shared` o `scripts`.
Si algo es de decisión/orquestación, va en `agents`.
Si algo describe comportamiento y contrato, va en `SKILL.md`.
