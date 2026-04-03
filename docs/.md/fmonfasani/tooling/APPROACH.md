# Tooling — Federico Monfasani

## Forma de trabajar

Federico trata las herramientas de desarrollo como multiplicadores de productividad, no como fines en sí mismos. Adopta una herramienta cuando resuelve un problema concreto que ya existe, no por tendencia. Y la configura para que funcione de manera consistente para cualquiera que clone el repositorio.

## Principios que aplica

**Herramientas de AI como par de programación, no como generador de código.**
Federico usa asistentes de AI para diagnosticar problemas, revisar lógica, y acelerar la escritura de boilerplate. La decisión de qué construir y cómo estructurarlo sigue siendo humana. El código generado se revisa y se entiende antes de commitearse.

**Skills reutilizables para contexto recurrente.**
Cuando se encuentra escribiendo el mismo contexto para una herramienta de AI repetidamente, lo convierte en un skill o instrucción reutilizable. El contexto del proyecto no se re-explica en cada sesión.

**Configuración de herramientas versionada.**
Los archivos de configuración de linters, formateadores, hooks de git y herramientas de AI viven en el repositorio. La experiencia de desarrollo es consistente entre máquinas y entre miembros del equipo.

**Hooks de git para calidad automática.**
Pre-commit hooks verifican formato y linting antes de que el código llegue al repositorio. Los errores de formato no ocupan espacio en code reviews.

**Swagger UI como herramienta de desarrollo activo.**
Federico usa la interfaz de documentación de APIs no solo como referencia, sino como herramienta principal de prueba durante el desarrollo. Un endpoint que no puede testearse desde el Swagger no está completo.

## Proceso típico

1. Antes de adoptar una herramienta nueva, define qué problema específico resuelve.
2. Configura la herramienta con los defaults del proyecto y commitea la configuración.
3. Documenta cómo usar la herramienta en el contexto del proyecto (no el manual general, sino "cómo usarla aquí").
4. Crea skills o instrucciones reutilizables para el contexto recurrente.
5. Revisa periódicamente si las herramientas activas siguen siendo las correctas.

## Señal de que algo está mal

Si la configuración de una herramienta existe solo en una máquina, está incompleta. Si un asistente de AI necesita más de 2 mensajes para entender el contexto del proyecto, faltan instrucciones reutilizables.
