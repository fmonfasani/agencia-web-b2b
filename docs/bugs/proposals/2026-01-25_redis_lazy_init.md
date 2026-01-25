# Propuesta de Solución: Lazy Initialization de Redis

**ID del Bug**: BUG-004  
**Relacionado a**: Despliegue en Vercel (Build Failure en Collecting Page Data)

## 1. Objetivo

Evitar que el proceso de build de Next.js falle cuando las variables de entorno de Redis no están presentes o son inválidas durante la generación estática de páginas.

## 2. Solución Técnica Propuesta

### A. Inicialización Perezosa (Lazy Initialization)

En lugar de instanciar el cliente de Redis en el scroll superior del módulo (top-level), lo moveremos dentro de una función o lo manejaremos con un getter. Esto asegura que la clase `Redis` (de `@upstash/redis`) solo se instancie si realmente se intenta realizar una operación y si las variables existen.

### B. Mapeo de Variables de Vercel

Vercel suele inyectar variables con el prefijo `KV_` cuando se usa la integración oficial de Vercel KV (Upstash). Agregaremos soporte para ambos nombres de variables para mayor compatibilidad.

---

## 3. Plan de Validación

1. **Verificación Local**: Ejecutar `npm run build` localmente sin las variables de Redis en el `.env` y confirmar que no explota.
2. **Verificación en Vercel**: El build debería pasar la etapa de "Collecting page data" exitosamente.
