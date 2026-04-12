# Spectra Flow - Guia de Deployment en EasyPanel (DigitalOcean)

## Requisitos
- VPS DigitalOcean (minimo 2GB RAM, 2 vCPU) - ~$12/mes
- EasyPanel instalado (https://easypanel.io)
- Dominio configurado (ej: app.spectra-metrics.com)

---

## Paso 1: Instalar EasyPanel en tu VPS

```bash
curl -sSL https://get.easypanel.io | sh
```

Accede a `http://TU-IP:3000` y crea tu cuenta admin.

---

## Paso 2: Crear Proyecto en EasyPanel

1. Click **"New Project"** → Nombre: `spectra-flow`
2. Vas a crear 3 servicios:

### Servicio 1: MongoDB
- Tipo: **Database → MongoDB**
- Nombre: `mongodb`
- Version: 7
- EasyPanel lo maneja automaticamente

### Servicio 2: Backend (FastAPI)
- Tipo: **App → Dockerfile**
- Nombre: `backend`
- Source: GitHub repo → ruta `/backend`
- Dockerfile path: `Dockerfile`
- Port: `8001`
- Variables de entorno:
  ```
  MONGO_URL=mongodb://mongodb:27017
  DB_NAME=spectraflow
  JWT_SECRET=tu-clave-secreta-larga-y-segura
  EMERGENT_LLM_KEY=tu-emergent-key
  RESEND_API_KEY=tu-resend-api-key
  OUTSCRAPER_API_KEY=tu-outscraper-key
  DIFY_BASE_URL=https://tu-dify.com/v1
  DIFY_APP_KEY=app-tu-dify-key
  ```

### Servicio 3: Frontend (React)
- Tipo: **App → Dockerfile**
- Nombre: `frontend`
- Source: GitHub repo → ruta `/frontend`
- Dockerfile path: `Dockerfile`
- Port: `3000`
- Build args:
  ```
  REACT_APP_BACKEND_URL=https://app.spectra-metrics.com
  ```

---

## Paso 3: Configurar Dominio

En EasyPanel:
1. Ve al servicio `frontend`
2. **Domains** → Agrega `app.spectra-metrics.com`
3. EasyPanel genera SSL automaticamente con Let's Encrypt

Para el backend (API directa):
1. Ve al servicio `backend`
2. **Domains** → Agrega `api.spectra-metrics.com`
3. O usa proxy path en el frontend nginx

---

## Paso 4: Deploy

1. Conecta tu repo de GitHub en EasyPanel
2. Click **Deploy** en cada servicio
3. EasyPanel hace build y deploy automatico

---

## Alternativa: Docker Compose Directo

Si preferis sin EasyPanel:

```bash
# En tu VPS
git clone tu-repo.git /opt/spectra-flow
cd /opt/spectra-flow

# Crear .env
cat > .env << EOF
JWT_SECRET=tu-clave-secreta
EMERGENT_LLM_KEY=tu-key
RESEND_API_KEY=tu-resend-api-key
OUTSCRAPER_API_KEY=tu-key
DIFY_BASE_URL=https://tu-dify.com/v1
DIFY_APP_KEY=app-tu-key
REACT_APP_BACKEND_URL=https://tu-dominio.com
EOF

# Levantar
docker compose up -d

# Ver logs
docker compose logs -f
```

---

## Costos Estimados

| Servicio | Costo |
|----------|-------|
| DigitalOcean Droplet 2GB | $12/mes |
| Dominio .com | $12/ano |
| Resend (free tier) | $0 (100 emails/dia) |
| Dify (self-hosted) | $0 |
| n8n (self-hosted) | $0 |
| **Total** | **~$13/mes** |

---

## Backups

```bash
# Backup MongoDB
docker exec mongodb mongodump --out /backup
docker cp mongodb:/backup ./backup-$(date +%Y%m%d)

# Restore
docker cp ./backup mongodb:/restore
docker exec mongodb mongorestore /restore
```
