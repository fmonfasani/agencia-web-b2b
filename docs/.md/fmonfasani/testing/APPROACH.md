# Testing — Federico Monfasani

## Forma de trabajar

Federico prioriza tests que verifican comportamiento real sobre tests que verifican implementación. Un test que pasa cuando el sistema está roto es peor que no tener test. El criterio de calidad de un test es: ¿este test hubiera detectado el bug que acabo de corregir?

## Principios que aplica

**Tests end-to-end sobre el flujo crítico primero.**
El camino más importante del sistema (auth → onboarding → consulta al agente) debe tener cobertura end-to-end antes que cualquier otra cosa. Los tests unitarios complementan, no reemplazan.

**Tests contra servicios reales, no mocks, en los límites del sistema.**
Los tests de integración que verifican comunicación entre servicios corren contra los servicios reales (en contenedor). Un mock que pasa cuando el servicio real falla no es un test, es ruido.

**Aislamiento por tenant en los tests.**
En sistemas multi-tenant, los tests verifican explícitamente que los datos de un tenant no son accesibles desde otro. El aislamiento es un comportamiento testeable, no un supuesto.

**Smoke tests como primer nivel de verificación post-deploy.**
Después de cualquier deploy, un conjunto mínimo de requests verifica que el sistema está vivo y los flujos críticos responden correctamente. Este conjunto es la primera línea de alerta.

**Tests como documentación del comportamiento esperado.**
El nombre del test describe qué debería pasar: `test_tenant_isolation_prevents_cross_tenant_access`. Leer los tests debe dar una idea clara de qué garantiza el sistema.

## Proceso típico

1. Identifica el comportamiento crítico a verificar.
2. Escribe el test que falla si ese comportamiento no existe.
3. Implementa el comportamiento hasta que el test pase.
4. Agrega casos de borde: ¿qué pasa si el input es inválido? ¿si el servicio está caído?
5. Corre todos los tests antes de commitear.
6. Documenta en el nombre del test qué comportamiento garantiza.

## Señal de que algo está mal

Si un test requiere entender la implementación para entender qué verifica, está mal escrito. Si un test no hubiera detectado el último bug que apareció en producción, falta cobertura en el lugar correcto.
