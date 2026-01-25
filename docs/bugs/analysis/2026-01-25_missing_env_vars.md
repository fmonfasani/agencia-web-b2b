# Análisis de Fallo de Build: Falta Variables de Entorno

**ID del Bug**: BUG-002  
**Fecha**: 25 de Enero, 2026  
**Severidad**: Crítica (Bloqueante)  
**Reportado por**: Vercel CLI (Logs)

## 1. 📊 Descripción del Problema

El proceso de build falla inmediatamente al intentar cargar la configuración de Prisma (`prisma.config.ts`).

**Log del Error**:

```
Failed to load config file "/vercel/path0" as a TypeScript/JavaScript module.
Error: PrismaConfigEnvError: Missing required environment variable: DATABASE_URL
```

Acompañado de warnings de `npm` (deprecaciones) que son ruido y no la causa raíz.

## 2. 🕵️ Diagnóstico

### Causa Raíz

El archivo `prisma.config.ts` utiliza una función estricta `env("DATABASE_URL")` para definir la fuente de datos. Esta función lanza una excepción si la variable de entorno no está definida en el sistema donde se ejecuta el build (en este caso, los servidores de Vercel).

### Evidencia

Código en `prisma.config.ts`:

```typescript
datasource: {
  url: env("DATABASE_URL"), // <--- Aquí explota si no existe
},
```

### Por qué ocurre ahora

Previamente fallaba el linting. Al solucionar el linting y saltarlo temporalmente, el proceso avanzó hasta la siguiente etapa: inicialización de Prisma, donde se encontró con la ausencia de configuración de base de datos.

## 3. 🔗 Referencias

- Vercel Project Settings > Environment Variables.
