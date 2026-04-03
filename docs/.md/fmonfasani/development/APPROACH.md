# Development — Federico Monfasani

## Forma de trabajar

Federico desarrolla en ciclos cortos y verificables. Cada ciclo termina con algo que funciona, no con algo que "debería funcionar". Prefiere tener un flujo end-to-end pequeño funcionando antes de extenderlo.

## Principios que aplica

**Funcionalidad mínima primero, extensión después.**
El primer objetivo es tener el camino feliz corriendo de principio a fin. Una vez que eso funciona, se agregan validaciones, casos de error y optimizaciones. No se construye el sistema completo antes de ver si la idea central funciona.

**Commits frecuentes y semánticos.**
Cada commit representa un estado estable y describe en un verbo qué cambió: `feat:`, `fix:`, `chore:`, `refactor:`. El historial de commits es legible como una narrativa del desarrollo.

**Diagnóstico antes de cambiar.**
Cuando algo no funciona, Federico lee el error completo, identifica la causa raíz, y aplica el cambio mínimo necesario. No hace cambios especulativos en múltiples lugares a la vez.

**Iteración visible.**
El progreso es visible en el estado del repositorio. Si lleva tiempo sin commitear y el código no funciona, algo está mal en el enfoque, no en el código.

**Refactor como tarea separada.**
La refactorización no se mezcla con features. Si detecta código que necesita limpieza, lo anota y lo hace en un commit dedicado, con el test verde primero.

**Limpieza activa.**
El código que ya no se usa se borra. Los archivos huérfanos, las funciones sin llamador, los imports sin usar — todo se limpia regularmente. Un repositorio limpio es más fácil de razonar que uno con código muerto.

## Proceso típico

1. Define el comportamiento esperado antes de escribir código (¿qué debería pasar?).
2. Implementa el mínimo para que ese comportamiento ocurra.
3. Verifica manualmente o con un test que el comportamiento es el esperado.
4. Commitea el estado funcional.
5. Extiende o refina sobre esa base.
6. Al final de cada sesión, limpia: borra lo no usado, ordena imports, actualiza docs.

## Señal de que algo está mal

Si el directorio tiene más de 10 archivos sin commitear, el ciclo de desarrollo está roto. Federico lo detecta y hace un commit de checkpoint o descarta cambios experimentales que no funcionaron.
