# Architecture — Federico Monfasani

## Forma de trabajar

Federico parte siempre de una propuesta arquitectónica escrita antes de tocar código. El primer artefacto es un documento que separa responsabilidades: qué módulo hace qué, qué se comunica con qué, y por qué. Escribe esto como un contrato de equipo, no como un borrador.

## Principios que aplica

**Separación de responsabilidades por dominio, no por capa técnica.**
En lugar de organizar el código en "controllers / services / repositories", organiza por dominio funcional: auth, onboarding, agent engine, tenant management. Cada dominio es autónomo y expone interfaces claras hacia afuera.

**API Gateway como punto único de entrada.**
Cuando hay múltiples servicios internos, diseña un servicio frontal que actúa como proxy y control plane. Los servicios internos nunca quedan expuestos directamente. Esta decisión reduce la superficie de ataque y simplifica la autenticación.

**Aislamiento por tenant desde el diseño, no como agregado posterior.**
En sistemas multi-tenant, el aislamiento de datos (por colección, por namespace, por foreign key) es una decisión de diseño de día 0. No es algo que se agrega después.

**Iteración arquitectónica visible.**
Cuando detecta que la arquitectura necesita cambiar, escribe una propuesta formal ("PROPUESTA_SEPARACION_ARQUITECTONICA") antes de ejecutar. Esto permite revisar el impacto antes de comprometerse.

## Proceso típico

1. Dibuja (o escribe) el diagrama de servicios: quién llama a quién, qué puerto, qué protocolo.
2. Define los contratos entre servicios: qué headers, qué payload, qué errores.
3. Identifica los puntos de fallo: ¿qué pasa si el servicio B cae? ¿hay fallback?
4. Escribe la propuesta como documento antes de abrir el editor de código.
5. Ejecuta la arquitectura en la unidad más pequeña posible primero (un solo endpoint funcionando end-to-end).
6. Valida el diseño corriendo el flujo completo localmente antes de escalar.

## Señal de que algo está mal

Si Federico empieza a duplicar lógica entre servicios, lo toma como señal de que la separación de responsabilidades está mal definida — y vuelve al paso 1 en lugar de agregar más código.
