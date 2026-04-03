# Infraestructura Webshooks

**Documento Técnico de Configuración v1.1**
Servidor DigitalOcean + Docker + PostgreSQL + Prisma + Firewall Security

---

## 1. Arquitectura General

*   **Proveedor Cloud:** DigitalOcean (NYC3)
*   **Servidor:** Droplet Ubuntu 24.04 LTS (Basic Plan)
*   **Motor de Contenedores:** Docker (Isolation Layer)
*   **Base de Datos:** PostgreSQL 16 (Containerized)
*   **Seguridad:** DigitalOcean Cloud Firewall (Port level protection)

---

## 2. Configuración del Servidor

### 2.1 Personalización de Terminal (Oh My Bash)
Se instaló el tema **agnoster** para mejorar la legibilidad del prompt SSH.
```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/ohmybash/oh-my-bash/master/tools/install.sh)"
```

### 2.2 Instalación de Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh
```

---

## 3. Base de Datos PostgreSQL

### 3.1 Despliegue del Contenedor
```bash
docker run -d \
  --name multidb-postgres \
  -e POSTGRES_PASSWORD='[REDACTED_PASSWORD]' \
  -p 5432:5432 \
  --restart always \
  postgres:16
```

### 3.2 Creación de la Base de Datos del Proyecto
```bash
docker exec -it multidb-postgres psql -U postgres -c "CREATE DATABASE agencia_web_b2b;"
```

---

## 4. Configuración de Conexión (Prisma)

### 4.1 URL de Conexión
En el archivo `.env` local, la contraseña debe llevar el carácter `#` escapado como `%23`:
```env
DATABASE_URL="postgresql://postgres:%23[PASSWORD]@134.209.41.51:5432/agencia_web_b2b?sslmode=disable"
```

### 4.2 Verificación de Sincronización
```powershell
npx prisma db push
```

---

## 5. Seguridad: Firewall Cloud

Se ha implementado un firewall en DigitalOcean para proteger la instancia.

### 5.1 Reglas de Inbound (Entrada)
| Regla | Puerto | Origen | Propósito |
| :--- | :--- | :--- | :--- |
| **SSH** | 22 | All IPv4 / All IPv6 | Administración remota. |
| **PostgreSQL** | 5432 | `0.0.0.0/0` (All IPv4) | Permitir acceso desde Vercel (Next.js). |

### 5.2 Verificación del Firewall
Para probar que el acceso externo está bloqueado desde otras redes:
```bash
# Debería dar timeout desde cualquier IP que no sea la tuya
telnet 134.209.41.51 5432
```
Desde el servidor, la conexión local siempre es posible:
```bash
telnet localhost 5432
```

---

## 6. Comandos de Mantenimiento

| Comando | Acción |
| :--- | :--- |
| `docker ps` | Ver estado del contenedor de DB. |
| `docker logs multidb-postgres` | Ver errores en tiempo real. |
| `docker stats` | Monitorear consumo de RAM/CPU. |
| `service docker status` | Verificar el servicio de Docker. |

---

### 5.3 Recomendaciones de Seguridad (Best Practices)
- **Contraseña Fuerte:** Al abrir a `0.0.0.0/0`, la seguridad reside enteramente en la complejidad de la contraseña.
- **SSL Enforced:** Se recomienda cambiar `sslmode=disable` a `sslmode=require` en producción para cifrar el tráfico entre Vercel y DigitalOcean.
- **Vesting:** Monitorear logs de intentos fallidos en el contenedor de Postgres.

**Última actualización:** 2026-03-03
**Estado:** Activo y Seguro (Requiere SSL en Producción)
