# Infrastructure — Federico Monfasani

## Forma de trabajar

Federico trata la infraestructura como código de primera clase: versionada, revisable, reproducible. No usa configuraciones manuales en servidores. Si no está en un archivo de configuración commiteado, no existe.

## Principios que aplica

**Un entorno local que replica producción.**
El entorno de desarrollo local corre exactamente los mismos servicios que producción, con las mismas variables de entorno (salvo credenciales). Esto elimina el "funciona en mi máquina" antes de que aparezca.

**Servicios internos nunca expuestos al exterior.**
La separación entre servicios públicos (con puerto mapeado) y servicios internos (solo accesibles dentro de la red de contenedores) es explícita en la configuración. No se expone lo que no necesita estar expuesto.

**Health checks en todos los servicios críticos.**
Cada servicio define condiciones de salud. Los servicios que dependen de otros esperan que esas dependencias estén sanas antes de iniciar. Esto evita arranques en cascada con servicios parcialmente disponibles.

**Variables de entorno separadas por entorno.**
Nunca hay credenciales hardcodeadas. Existe un archivo `.env.example` como documentación y contratos, y los valores reales van en archivos `.env.production` que nunca se commitean.

**Volúmenes persistentes y compartidos donde corresponde.**
Los datos que deben sobrevivir al reinicio de contenedores van en volúmenes nombrados. Los archivos que un servicio produce y otro consume se comparten vía volúmenes montados explícitamente.

## Proceso típico

1. Define los servicios y sus dependencias en un archivo de orquestación único.
2. Configura health checks antes de agregar `depends_on`.
3. Arranca solo la infraestructura base (base de datos, cache, vector store) y valida que funciona.
4. Agrega los servicios de aplicación uno por uno, verificando que cada uno arranca correctamente.
5. Corre el flujo end-to-end completo antes de declarar el entorno listo.
6. Documenta los comandos exactos para levantar, detener y limpiar el entorno.

## Señal de que algo está mal

Si tiene que hacer pasos manuales en el servidor para que algo funcione, lo documenta como un bug de infraestructura y automatiza esos pasos antes de seguir.
