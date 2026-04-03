# Project Management — Federico Monfasani

## Forma de trabajar

Federico gestiona el trabajo mediante documentos vivos y ciclos cortos de validación. No usa herramientas de gestión de proyectos complejas para proyectos donde él es el principal ejecutor. El repositorio de código es la fuente de verdad del progreso.

## Principios que aplica

**Estado visible en el repositorio.**
El progreso se mide por código funcionando commiteado, no por tareas marcadas en una herramienta externa. El historial de git es el registro de avance más confiable.

**Documentos de estado puntuales.**
Cuando completa un módulo o una fase del proyecto, escribe un documento de estado (STATUS, PROGRESS) que captura qué está hecho, qué queda pendiente y qué decisiones se tomaron. Esto permite retomar el trabajo sin perder contexto.

**Priorización por impacto en el flujo crítico.**
Lo primero que se completa es lo que bloquea el resto. Si el servicio de auth no funciona, nada más puede testearse. El orden de implementación sigue el orden de dependencias del sistema.

**Deuda técnica explícita.**
Cuando se toma una decisión práctica que no es la ideal (hardcodear algo para avanzar, saltear validación para testear un flujo), se registra como TODO con contexto. No hay deuda técnica oculta.

**Cleanup como parte del ciclo.**
Al final de cada fase significativa, Federico hace una pasada de limpieza: borra código muerto, ordena el repositorio, actualiza documentación. El repo limpio es parte de la definición de "terminado".

## Proceso típico

1. Define el objetivo de la sesión o sprint (qué debería estar funcionando al final).
2. Identifica las dependencias bloqueantes y las resuelve primero.
3. Trabaja en ciclos cortos con commits frecuentes.
4. Al terminar una fase, escribe un documento de estado.
5. Hace limpieza del repositorio.
6. Identifica qué viene después y lo deja registrado en un TODO o plan.

## Señal de que algo está mal

Si no puede responder "¿qué está funcionando hoy?" mirando el repositorio, la gestión del trabajo está rota. Si tiene más de un sprint de deuda técnica no registrada, el ritmo de cleanup está atrasado.
