# API Design — Federico Monfasani

## Forma de trabajar

Federico diseña APIs pensando primero en el consumidor. Antes de escribir un endpoint, escribe el ejemplo de request y response que le gustaría recibir si fuera el cliente. La documentación no es un agregado — es parte del código del endpoint.

## Principios que aplica

**Documentación como contrato, no como descripción.**
Cada endpoint tiene un ejemplo de request completo y un ejemplo de response real, no genérico. El Swagger debe poder usarse como guía de integración sin leer código adicional. Si el Swagger está incompleto, el endpoint está incompleto.

**Validación en la frontera del sistema.**
Los modelos de request validan tipos, rangos y longitudes en el punto de entrada. Los errores de validación devuelven mensajes descriptivos que el cliente puede leer y actuar sobre ellos. No se llega al business logic con datos inválidos.

**Auth transparente en el proxy.**
Cuando un servicio actúa como proxy hacia otro servicio interno, propaga los headers de autenticación explícitamente. No asume que el contexto se transmite automáticamente.

**Errores semánticos.**
Los códigos HTTP tienen significado: 400 para input inválido, 401 para no autenticado, 403 para no autorizado, 502 para servicio interno caído. No se usa 500 para todo.

**Separación entre contrato público y lógica interna.**
Los modelos de response que se exponen al cliente son diferentes a las estructuras internas. Si el servicio interno cambia su formato de respuesta, el cliente externo no lo siente.

## Proceso típico

1. Escribe el ejemplo de request/response antes de implementar.
2. Define el modelo de datos (schema) y sus validaciones.
3. Implementa el endpoint con el ejemplo como test de referencia.
4. Agrega la documentación inline (description, summary, ejemplos de error).
5. Verifica que el Swagger generado muestra todo lo que un integrador necesitaría saber.
6. Corre el flujo completo a través del Swagger UI antes de declarar el endpoint listo.

## Señal de que algo está mal

Si alguien necesita leer el código fuente para entender cómo usar un endpoint, la documentación está incompleta. Federico lo toma como deuda técnica a resolver en el mismo sprint.
