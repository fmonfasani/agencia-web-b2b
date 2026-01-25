# Análisis de Fallo de Despliegue - Redis Configuration

**ID del Bug**: BUG-004  
**Contexto**: El build ahora pasa las verificaciones de tipos y compilación, pero falla en una nueva etapa relacionada con la recolección de datos estáticos (`Collecting page data`).

## 1. 📊 Diagnóstico

**Error en Logs**:

```
[Upstash Redis] The 'url' property is missing or undefined in your Redis config.
[Upstash Redis] The 'token' property is missing or undefined in your Redis config.
Build Failed. Command "npm run build" exited with 1.
```

## 2. Causa Raíz

Algunas páginas de la aplicación se están renderizando estáticamente en el momento del build (SSG/ISR). Estas páginas o componentes importan `src/lib/bot/redis-context.ts`.

Aunque en el código tenemos un chequeo condicional:

```typescript
const redis =
  process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ? new Redis({ ... })
    : null;
```

Al parecer, en algún otro lugar del código se está instanciando `Redis` de forma directa o el SDK de Upstash lanza un error proactivo si detecta variables vacías durante la inicialización del módulo en el entorno de build de Vercel (donde estas variables podrían no estar definidas si no se configuraron correctamente).

**Hipótesis**: Vercel no tiene las variables `KV_URL` o `UPSTASH_REDIS_REST_URL` configuradas en el entorno.

## 3. Solución Técnica

### A. Configuración en Vercel

Asegurar que la instancia de Redis creada (que vi en la captura del usuario) esté realmente vinculada y exportando las variables con el nombre correcto.
Generalmente Vercel KV exporta:

- `KV_URL`
- `KV_REST_API_URL`
- `KV_REST_API_TOKEN`

Si usamos Upstash directo, exporta:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`

### B. Defensiva en Código

Modificar `redis-context.ts` para que, durante el build (`NODE_ENV === 'production' && !vars`), no intente instanciar Redis si faltan credenciales, y evitar que el error rompa el build de páginas estáticas.

## 4. Plan de Acción

1.  **Revisar Variables**: Chequear qué nombres de variables inyectó Vercel (KV vs UPSTASH).
2.  **Hardening de Código**: Hacer el cliente Redis opcional/lazy.
