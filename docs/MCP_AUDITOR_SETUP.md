# Guía de Auditor de Software con MCP

Esta guía detalla cómo utilizar los servidores MCP configurados para realizar una radiografía técnica del proyecto.

## Servidores Configurables
1. **Filesystem**: Acceso directo al código fuente.
2. **GitHub**: Integración con el flujo de trabajo de Git.
3. **Semgrep**: Auditoría de seguridad automatizada.
4. **SonarQube**: Medición de deuda técnica.
5. **Sourcegraph**: Búsqueda contextual profunda.

## Pasos para la Auditoría
1. **Mapeo de Estructura**: `filesystem.list_directory` para entender la jerarquía.
2. **Escaneo de Vulnerabilidades**: `semgrep.scan` para detectar fallos de seguridad críticos.
3. **Análisis de Deuda**: `sonarqube.get_metrics` para priorizar refactorizaciones.
4. **Validación de Flujo**: `github.get_pull_requests` para asegurar calidad en el delivery.

## Archivo de Configuración
Copia el contenido de `mcp_config_template.json` en la configuración de Antigravity para activar estas herramientas.
