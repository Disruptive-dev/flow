# GUIA COMPLETA DE DEPLOY - Spectra Flow v2
# Fecha: 14 Abril 2026

## SITUACION ACTUAL
- Preview (Emergent): Todo funciona OK
- Produccion (EasyPanel): Version VIEJA, no tiene ningun cambio nuevo
- OpenAI te revoco la key "FLOW" (sk-pro...6UA) por estar expuesta en GitHub
- MongoDB en tu Droplet esta expuesto publicamente al puerto 27017 (alerta de DigitalOcean)

---

## PASO 1: SEGURIDAD MONGODB (URGENTE)
Tu MongoDB esta abierta al mundo. Hay que cerrarla.

En tu VPS (SSH a 134.122.125.104):
```bash
# Opcion A: Firewall de DigitalOcean (recomendado)
# Ir a: https://cloud.digitalocean.com/networking/firewalls
# Crear firewall → Agregar regla:
#   - Permitir TCP 27017 SOLO desde la IP del mismo droplet (127.0.0.1)
#   - O mejor: solo desde los contenedores Docker (red interna)

# Opcion B: UFW en el servidor
sudo ufw deny 27017
sudo ufw allow from 172.16.0.0/12 to any port 27017  # Red Docker interna
sudo ufw reload
```

Si usas Docker Compose (que es tu caso), MongoDB solo necesita ser accesible
dentro de la red Docker. En tu docker-compose.yml, asegurate que MongoDB
NO tenga `ports: - "27017:27017"` expuesto al host. Solo necesita:
```yaml
mongodb:
  image: mongo:7
  # NO poner ports aqui - solo la red interna Docker
  volumes:
    - mongodb_data:/data/db
  networks:
    - spectra-network
```

## PASO 2: GENERAR NUEVA API KEY DE OPENAI
1. Ir a: https://platform.openai.com/api-keys
2. Crear nueva key con nombre "FLOW-v2"
3. Copiarla (la vas a necesitar para Dify en n8n)
NOTA: Esta key es para TU instancia de Dify, no para Spectra directamente.
Spectra usa la "Emergent LLM Key" para el bot y Flow IA.

## PASO 3: GUARDAR EN GITHUB
En el chat de Emergent:
1. Click en "Save to GitHub" (boton en el input del chat)
2. Confirmar el push
3. Verificar en tu repositorio de GitHub que los cambios estan

IMPORTANTE: El .env NO se sube a GitHub (esta en .gitignore).
Las keys se configuran directamente en EasyPanel como variables de entorno.

## PASO 4: REBUILD EN EASYPANEL

### Backend:
1. EasyPanel → tu proyecto → servicio "backend" (o "flow-api")
2. Click "Rebuild" o "Deploy"
3. VERIFICAR las variables de entorno en EasyPanel:
   - MONGO_URL=mongodb://mongodb:27017  (red Docker interna)
   - DB_NAME=spectra_flow_prod  (o el nombre que uses)
   - JWT_SECRET=(tu secret)
   - EMERGENT_LLM_KEY=sk-emergent-d3c15A0597868A0E64
   - OPENAI_API_KEY=  (dejar vacio, ya no se usa)
   - DIFY_BASE_URL=https://dify.optimia.disruptive-sw.com/v1
   - DIFY_APP_KEY=app-JXLErCQh2VNTu6yCHJU6uOGs
   - RESEND_API_KEY=(tu key de Resend)
   - CORS_ORIGINS=https://flow.spectra-metrics.com
   - FRONTEND_URL=https://flow.spectra-metrics.com

### Frontend:
1. EasyPanel → servicio "frontend"
2. Click "Rebuild"
3. Build arg: REACT_APP_BACKEND_URL=https://flow-api.spectra-metrics.com

### Verificar:
- Backend green → logs dicen "Application startup complete"
- Frontend green → se carga la pagina
- Login funciona → admin@spectraflow.com / Admin123!

## PASO 5: IMPORTAR WORKFLOW N8N v2
1. En tu n8n (n8n.disruptive-sw.com) → Workflows
2. Menu "+" → "Import from file"
3. Subir: n8n-workflow-spectra-prospeccion-v2.json (del repo GitHub)
4. Editar nodo "Outscraper Buscar":
   - Reemplazar TU-OUTSCRAPER-API-KEY con tu key real
5. Editar nodo "Scoring IA":
   - Reemplazar TU-DIFY-APP-KEY con: app-JXLErCQh2VNTu6yCHJU6uOGs
   - La URL de Dify ya esta puesta correcta
6. ACTIVAR el workflow (toggle arriba a la derecha → ON)
7. Copiar la "Production URL" del nodo Webhook
8. En Spectra → Configuracion → Integraciones → n8n:
   - Base URL: pegar la Production URL
   - API Key: spectra-2024
   - Guardar

## PASO 6: VERIFICAR TODO EN PRODUCCION
1. Login en flow.spectra-metrics.com
2. Verificar sidebar tiene 4 secciones
3. Ir a Buscador → probar tab B2B y LinkedIn (LinkedIn dice "Requiere API Key de Apify")
4. Ir a Leads → verificar boton "Crear Lead"
5. Ir a Admin Tenants → verificar que se ve la tabla
6. Probar Flow IA bot (el icono azul abajo a la derecha)
7. Probar busqueda real con Outscraper (n8n)

---

## RESUMEN DE QUE CAMBIO (todo lo que se va a subir)

### Funcional:
- Sidebar reestructurado: 4 secciones (Prospeccion, Leads, Email Marketing, CRM)
- Buscador de Prospectos: 2 tabs (B2B Google Maps + LinkedIn Apify)
- Crear Lead manual desde Leads
- Secuencia → auto-agrega lead a lista de email
- Fix oportunidades duplicadas en CRM
- Chatwoot → crea Leads (no CRM contacts) con tag BOT
- Modulos toggle funcional (oculta secciones del sidebar)
- Admin Tenants (crear/editar clientes, planes, precios, modulos)
- Analytics con filtros de fecha + metrica Perdidas
- Deduplicacion de leads en n8n callback
- Todos los leads pasan (calificados + rechazados)
- n8n Workflow v2 (corrige bug de datos mezclados)

### Seguridad:
- API key de OpenAI revocada removida del .env
- MongoDB debe cerrarse al publico (Paso 1)

### Lo que NO funciona sin accion tuya:
- Bot/Flow IA en produccion: Necesita EMERGENT_LLM_KEY en EasyPanel env vars
- LinkedIn: Necesita API Key de Apify cuando la tengas
- Emails reales: Necesita RESEND_API_KEY + dominio verificado
