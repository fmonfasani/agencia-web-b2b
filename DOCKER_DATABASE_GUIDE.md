# 🐳 Guía de Manejo: Docker & PostgreSQL (Agencia B2B)

Esta guía contiene los comandos esenciales para administrar la base de datos y los contenedores en tu VPS (`agencia-dropletv1`).

---

## 1. Gestión de Docker

Actualmente, tu base de datos corre en el contenedor: `multidb-postgres`.

### Comandos de Estado
- **Ver todos los contenedores activos:**
  ```bash
  docker ps
  ```
- **Ver logs en tiempo real (útil para ver errores de conexión):**
  ```bash
  docker logs -f multidb-postgres
  ```

### Control de Ciclo de Vida
- **Reiniciar la base de datos:**
  ```bash
  docker restart multidb-postgres
  ```
- **Detener/Iniciar:**
  ```bash
  docker stop multidb-postgres
  docker start multidb-postgres
  ```

---

## 2. Manejo de SQL (dentro de Docker)

Para ejecutar comandos SQL, no necesitas instalar `psql` en la VPS, usas el que está dentro del contenedor.

### Entrar a la consola interactiva (CLI)
```bash
docker exec -it multidb-postgres psql -U postgres
```
*(Una vez dentro, el prompt cambiará a `postgres=#`)*

### Comandos SQL Básicos (dentro de psql)
- **Listar bases de datos:** `\l`
- **Conectar a una base específica:** `\c nombre_de_la_db`
- **Listar tablas:** `\dt`
- **Ver estructura de una tabla:** `\d nombre_de_tabla`
- **Salir de psql:** `\q`

### Consultas útiles para Agencia B2B
```sql
-- Ver los últimos 5 leads ingresados
SELECT id, name, "companyName", status, "createdAt" FROM "Lead" ORDER BY "createdAt" DESC LIMIT 5;

-- Ver cuántos leads hay por estado de pipeline
SELECT "pipelineStatus", COUNT(*) FROM "Lead" GROUP BY "pipelineStatus";

-- Verificar si hay propuestas registradas
SELECT COUNT(*) FROM "Proposal";
```

---

## 3. Integración con Prisma

Como el proyecto usa Prisma, la mayoría de las veces no querrás tocar SQL a mano.

### Ver la base de datos visualmente (Prisma Studio)
Si estás en desarrollo local y tienes acceso al túnel o la base, corre:
```bash
npx prisma studio
```

### Sincronizar cambios de esquema
Si modificas el `schema.prisma` y quieres aplicarlo a la VPS:
```bash
npx prisma db push
```

---

## 4. Backups (Respaldo)

Es vital hacer respaldos antes de cambios grandes.

### Crear un respaldo (Exportar)
```bash
docker exec -t multidb-postgres pg_dumpall -c -U postgres > backup_agencia_$(date +%F).sql
```

### Restaurar un respaldo (Importar)
```bash
cat backup_agencia_total.sql | docker exec -i multidb-postgres psql -U postgres
```

---

## 5. Tips de Seguridad
1. **No expongas el puerto 5432 al público**: Asegúrate de que el firewall de DigitalOcean solo permita conexiones desde tu IP o localhost.
2. **Uso de Memoria**: Si la VPS se pone lenta, revisa el consumo con `docker stats`.

> [!TIP]
> Si alguna vez el contenedor no inicia por "puerto ocupado", usa `ss -tulpn | grep 5432` para ver qué proceso local está bloqueando el puerto.
