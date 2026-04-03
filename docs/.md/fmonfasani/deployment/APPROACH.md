# Deployment — Federico Monfasani

## Forma de trabajar

Federico trata cada deploy como un proceso repetible y verificable. No existe "el deploy" — existe un script que cualquiera puede correr y que produce el mismo resultado siempre. Si el proceso requiere pasos mentales, esos pasos se convierten en código.

## Principios que aplica

**Preflight checks antes de tocar el servidor.**
Antes de iniciar un deploy, un script verifica que todas las condiciones están dadas: variables de entorno presentes, puertos disponibles, servicios de dependencia accesibles. Si algo falla en preflight, el deploy no empieza.

**Rollback como ciudadano de primera clase.**
Cada proceso de deploy tiene un camino de vuelta definido. El backup de base de datos ocurre antes de cualquier migración. El estado anterior es recuperable.

**Checklists vivos.**
Los checklists de deploy no son documentos estáticos. Se actualizan cada vez que aparece un paso nuevo que debería haberse automatizado. El objetivo es que la lista se reduzca con el tiempo, no que crezca.

**Un solo punto de verdad para la configuración de producción.**
Las variables de entorno de producción viven en un lugar único y seguro. No hay configuración dispersa entre archivos de servidor, variables manuales y archivos commiteados.

**Logs centralizados desde el primer día.**
El deploy configura rotación de logs y niveles de logging apropiados. No se descubre que los logs no están disponibles cuando hay un incidente.

## Proceso típico

1. Ejecuta preflight check: valida entorno, credenciales, conectividad.
2. Hace backup del estado actual (base de datos, archivos críticos).
3. Actualiza el código desde el repositorio.
4. Reconstruye y reinicia los servicios afectados.
5. Corre health checks para verificar que todos los servicios están saludables.
6. Ejecuta smoke tests: flujo mínimo de auth, creación de tenant, consulta al agente.
7. Documenta el resultado del deploy (timestamp, versión, resultado).

## Señal de que algo está mal

Si tiene que conectarse al servidor para ver qué pasó, el sistema de logging está incompleto. Si tiene que recordar pasos del deploy, el script está incompleto.
