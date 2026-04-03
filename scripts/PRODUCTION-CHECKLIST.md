# ✅ PRODUCTION DEPLOYMENT CHECKLIST

**Fecha:** _____________
**VPS IP:** _____________
**Dominio:** _____________

---

## 📋 Pre-Deploy (Local)

### Código
- [ ] Tests E2E pasan localmente (`pytest tests/` o `npm test`)
- [ ] Todos los endpoints funcionan en Swagger (`/docs`)
- [ ] No hay errores en build de Docker (`docker build`成功)
- [ ] Variables de entorno configuradas en `.env.production` (sin valores por defecto)
- [ ] Archivos `docker-compose.prod.yml` revisados
- [ ] Scripts tienen permisos de ejecución (`chmod +x scripts/*.sh`)

### Seguridad
- [ ] Contraseñas en `.env.production` son fuertes (min 12 chars, especiales)
- [ ] `ALLOWED_ORIGINS` configurado solo con dominios de producción
- [ ] API keys de OpenRouter (si se usan) tienen límites diarios configurados
- [ ] No hay secrets hardcodeados en el código (`grep -r "sk-"`)

### Base de datos
- [ ] Schema migrado: `scripts/init-db.sql` ejecutado
- [ ] Usuario admin creado (ver `SELECT * FROM "User" WHERE role='ADMIN';`)
- [ ] Backup inicial tomado

---

## 🚀 Deploy (VPS)

### Setup Inicial VPS
- [ ] Docker & Docker Compose instalados (`docker --version`, `docker compose version`)
- [ ] Nginx instalado (`nginx -v`)
- [ ] Certbot instalado (`certbot --version`)
- [ ] Firewall configurado (solo puertos 22, 80, 443 abiertos)
- [ ] Directorio `/opt/webshooks` creado
- [ ] Archivos copiados a VPS (`/opt/webshooks/`)
- [ ] `.env.production` subidos correctamente

### Docker
- [ ] `docker compose -f docker-compose.prod.yml build` exitoso
- [ ] `docker compose -f docker-compose.prod.yml up -d` exitoso
- [ ] Todos los contenedores corriendo: `docker ps`
- [ ] Healthchecks pasan: `./scripts/healthcheck.sh`

**Contenedores esperados:**
- [ ] `agencia_postgres` (healthy)
- [ ] `agencia_qdrant` (healthy)
- [ ] `agencia_redis` (healthy)
- [ ] `agencia_ollama` (healthy)
- [ ] `agencia_backend_saas` (healthy)
- [ ] `agencia_backend_agents` (healthy)

### Logs iniciales
- [ ] No hay errores en `docker compose logs`
- [ ] Ollama ha descargado modelos (ver logs de `agencia_ollama`)
- [ ] PostgreSQL acepta conexiones
- [ ] Backends responden `/health` con `{"status":"ok"}`

---

## 🔐 Post-Deploy

### Nginx
- [ ] Config `nginx.conf` copiada a `/etc/nginx/sites-available/webshooks`
- [ ] Dominios actualizados (tudominio.com, api.tudominio.com, agents.tudominio.com)
- [ ] `nginx -t` exitoso
- [ ] `systemctl reload nginx` exitoso
- [ ] Certificado SSL obtenido: `certbot certificates`
- [ ] HTTPS funciona: `curl https://api.tudominio.com/health`

### API Testing
- [ ] `curl http://localhost:8000/health` → 200
- [ ] `curl http://localhost:8001/health` → 200
- [ ] `curl https://api.tudominio.com/health` → 200 (con SSL)
- [ ] `curl https://agents.tudominio.com/health` → 200

### Flujo completo
- [ ] Login exitoso: `POST /auth/login`
- [ ] API Key recibida
- [ ] Create tenant (como admin/analista) exitoso
- [ ] Upload de archivos exitoso
- [ ] Ingesta `POST /onboarding/ingest` completa (esperar 2-5 min)
- [ ] `GET /onboarding/status/{tenant_id}` muestra datos en PostgreSQL y Qdrant
- [ ] `POST /agent/execute` responde correctamente
- [ ] `GET /agent/config` retorna configuración del tenant

---

## 📊 Monitoreo

- [ ] Cron de backups configurado: `crontab -l`
  ```bash
  0 2 * * * /opt/webshooks/scripts/backup.sh /opt/backups/webshooks >> /var/log/backup.log 2>&1
  ```
- [ ] Directorio `/var/log/webshooks` existe
- [ ] Logrotate configurado: `/etc/logrotate.d/webshooks`
- [ ] Healthcheck externo (opcional) configurado (UptimeRobot, etc.)
- [ ] Alertas de disco configuradas (>80% uso)

---

## 🔒 Seguridad Final

- [ ] Fail2ban instalado y corriendo (`systemctl status fail2ban`)
- [ ] SSH solo con claves públicas (password login deshabilitado)
- [ ] UFW activo: `ufw status` → solo 22, 80, 443
- [ ] PostgreSQL NO expuesto al exterior ( solo puerto interno 5432)
- [ ] Qdrant NO expuesto al exterior (solo interno 6333)
- [ ] Ollama NO expuesto al exterior (solo interno 11434)
- [ ] Backends NO expuestos directamente (solo via Nginx)
- [ ] `.env.production` NO está en git (ya en `.gitignore`)

---

## 📝 Documentación

- [ ] `DEPLOYMENT.md` actualizado con datos de la VPS (IP, dominios)
- [ ] `.env.production` versionado? → **NO**, mantener en `.gitignore`
- [ ] API keys guardadas en lugar seguro (LastPass, 1Password, etc.)
- [ ] Cronjobs documentados: `crontab -l > crontab-backup.txt`
- [ ] Passwords compartidos con equipo (si aplica)

---

## 🆘 Rollback Plan

- [ ] Backup de BD tomado antes de deploy
- [ ] `docker-compose.prod.yml` anterior guardado como `docker-compose.prod.backup.yml`
- [ ) `docker compose down && docker volume prune` documentado (no ejecutar innecesariamente)
- [ ] Comando de rollback preparado:
  ```bash
  cd /opt/webshooks
  git checkout HEAD~1  # si usas git en la VPS
  docker compose down
  docker compose up -d
  ```

---

## 🎯 Sign-Off

**Desarrollador:** _____________
**Fecha:** _____________
**Commit:** _____________

**Estado:** ☐ Listo para producción
**Estado:** ☐ En testing
**Estado:** ☐ Rollback necesario

---

## 📞 Emergencia

Si algo falla:

1. **Contenedores no inician:** `docker compose logs [servicio]`
2. **No conecta a DB:** `docker exec agencia_postgres psql -U postgres -c "\l"`
3. **Espacio lleno:** `df -h` y `docker system prune -a`
4. **Rollback:** `git checkout [commit-anterior] && docker compose up -d`
5. **Restaurar backup:** `./scripts/backup.sh restore`

---

**Una vez completado todo, ¡FELICIDADES! Tu plataforma está en producción 🚀**
