# 🚀 VPS Deployment Guide: Next.js with PM2, Nginx, and CI/CD

This guide configures VPS deployment for the Agencia B2B Next.js application using PM2 for process management, Nginx as reverse proxy, and CI/CD integration.

## Prerequisites

- Ubuntu/Debian VPS
- Node.js 20 installed
- PM2 installed (`npm install -g pm2`)
- Domain configured (e.g., yourdomain.com)
- SSH access

## 1. SSH Setup and Security

### Generate SSH Key Pair (on your local machine)

```bash
ssh-keygen -t ed25519 -C "your-email@example.com"
```

### Copy Public Key to VPS

```bash
ssh-copy-id root@your-vps-ip
# Or manually:
# cat ~/.ssh/id_ed25519.pub
# Then paste into /root/.ssh/authorized_keys on VPS
```

### Secure SSH Configuration

Edit `/etc/ssh/sshd_config`:

```bash
# Disable password authentication
PasswordAuthentication no
# Disable root login
PermitRootLogin prohibit-password
# Use specific port (optional)
Port 22
```

Restart SSH:

```bash
systemctl restart sshd
```

### Create Application User

```bash
adduser deploy
usermod -aG sudo deploy
su - deploy
```

## 2. Server Preparation

### Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### Install Dependencies

```bash
sudo apt install -y curl wget git nginx certbot python3-certbot-nginx
```

### Install Node.js 20 (if not already)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Install PM2 Globally

```bash
sudo npm install -g pm2
```

### Create Application Directory

```bash
sudo mkdir -p /var/www/agencia-web-b2b
sudo chown -R deploy:deploy /var/www/agencia-web-b2b
cd /var/www/agencia-web-b2b
```

## 3. Environment Variables

Create `.env` file:

```bash
nano .env
```

Content:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/agencia_web_b2b"
POSTGRES_PRISMA_URL="postgresql://user:password@localhost:5432/agencia_web_b2b"
POSTGRES_URL_NON_POOLING="postgresql://user:password@localhost:5432/agencia_web_b2b"

# Next.js
NEXTAUTH_URL="https://yourdomain.com"
NEXTAUTH_SECRET="your-nextauth-secret-here"
AUTH_TRUST_HOST=true

# AI Services
AGENT_SERVICE_URL="http://localhost:8000"
INTERNAL_API_SECRET="your-internal-api-secret"
ADMIN_SECRET="your-admin-secret"
GEMINI_API_KEY="your-gemini-api-key"
APIFY_API_TOKEN="your-apify-token"

# Production Settings
NODE_ENV=production
PORT=3001
```

Generate secrets:

```bash
openssl rand -base64 32  # For NEXTAUTH_SECRET
openssl rand -hex 32     # For API secrets
```

## 4. Database Setup

### Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### Create Database and User

```bash
sudo -u postgres psql
```

```sql
CREATE USER agencia_user WITH PASSWORD 'your-secure-password';
CREATE DATABASE agencia_web_b2b OWNER agencia_user;
GRANT ALL PRIVILEGES ON DATABASE agencia_web_b2b TO agencia_user;
\q
```

Update `.env` with the database credentials.

## 5. Application Deployment

### Clone Repository

```bash
git clone https://github.com/yourusername/agencia-web-b2b.git .
# Or if private repo:
git clone git@github.com:yourusername/agencia-web-b2b.git .
```

### Install Dependencies

```bash
npm ci --production=false
```

### Database Migration

```bash
npx prisma generate
npx prisma migrate deploy
npx tsx prisma/seed-plans.ts  # If you have seed data
```

### Build Application

```bash
npm run build
```

### Start with PM2

```bash
pm2 start ecosystem.config.js --env production
pm2 save
pm2 startup
# Follow the instructions to enable startup
```

### Verify Application

```bash
pm2 status
pm2 logs agencia-web-b2b
```

## 6. Nginx Reverse Proxy Configuration

### Create Nginx Site Configuration

```bash
sudo nano /etc/nginx/sites-available/agencia-web-b2b
```

Content:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_proto;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check endpoint
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# Redirect www to non-www
server {
    listen 80;
    server_name www.yourdomain.com;
    return 301 http://yourdomain.com$request_uri;
}
```

### Enable Site

```bash
sudo ln -s /etc/nginx/sites-available/agencia-web-b2b /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 7. SSL Certificate with Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Update Nginx config for SSL (certbot does this automatically).

## 8. Health Checks and Monitoring

### PM2 Monitoring

```bash
pm2 monit
```

### Application Health Check

The application includes a `/health` endpoint that returns "healthy".

### Log Rotation

```bash
sudo nano /etc/logrotate.d/agencia-web-b2b
```

Content:

```
/var/www/agencia-web-b2b/logs/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 deploy deploy
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 9. CI/CD Integration (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to VPS

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "npm"

      - name: Install dependencies
        run: npm ci

      - name: Generate Prisma client
        run: npx prisma generate

      - name: Build application
        run: npm run build

      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/agencia-web-b2b
            git pull origin main
            npm ci --production=false
            npx prisma migrate deploy
            npm run build
            pm2 restart ecosystem.config.js
            pm2 save
```

### Required Secrets in GitHub

- `VPS_HOST`: Your VPS IP or domain
- `VPS_USER`: SSH username (e.g., deploy)
- `VPS_SSH_KEY`: Private SSH key content

## 10. Backup Strategy

### Database Backup Script

Create `/var/www/agencia-web-b2b/scripts/backup.sh`:

```bash
#!/bin/bash
BACKUP_DIR="/var/www/agencia-web-b2b/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"

mkdir -p $BACKUP_DIR

pg_dump -U agencia_user -h localhost agencia_web_b2b > $BACKUP_FILE

# Keep only last 7 days
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: $BACKUP_FILE"
```

Make executable and add to cron:

```bash
chmod +x /var/www/agencia-web-b2b/scripts/backup.sh
crontab -e
# Add: 0 2 * * * /var/www/agencia-web-b2b/scripts/backup.sh
```

## 11. Monitoring and Alerts

### Install Monitoring Tools (Optional)

```bash
sudo apt install -y htop iotop
```

### PM2 Logs

```bash
pm2 logs agencia-web-b2b --lines 100
```

### System Monitoring

```bash
pm2 show agencia-web-b2b
```

## 12. Troubleshooting

### Common Issues

1. **Port already in use**

   ```bash
   sudo lsof -i :3001
   pm2 stop all
   ```

2. **Permission issues**

   ```bash
   sudo chown -R deploy:deploy /var/www/agencia-web-b2b
   ```

3. **Build failures**

   ```bash
   rm -rf node_modules .next
   npm ci
   npm run build
   ```

4. **Database connection**
   ```bash
   sudo -u postgres psql -c "SELECT version();"
   ```

### Rollback

```bash
cd /var/www/agencia-web-b2b
git log --oneline -10
git reset --hard <commit-hash>
npm ci
npm run build
pm2 restart ecosystem.config.js
```

## 13. Security Checklist

- [ ] SSH key authentication only
- [ ] UFW firewall configured
- [ ] SSL certificate installed
- [ ] Environment variables secured
- [ ] Database user with limited privileges
- [ ] Regular updates scheduled
- [ ] Backups automated
- [ ] Logs monitored

## 14. Performance Optimization

### PM2 Cluster Mode (if needed)

Update `ecosystem.config.js`:

```javascript
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster',
```

### Nginx Caching

Add to Nginx config:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

This setup provides a production-ready deployment with high availability, security, and monitoring capabilities.
