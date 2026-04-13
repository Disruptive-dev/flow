# Guia de Actualizacion a Produccion - Spectra Flow v2

## Resumen de Cambios (para subir a EasyPanel)

### Cambios en Backend (server.py)
- Deduplicacion de leads en n8n callback
- Todos los leads pasan (calificados + rechazados)
- Fix de oportunidades duplicadas en CRM
- Chatwoot webhook → Leads (no CRM contacts) con tag BOT
- Crear lead manual (POST /api/leads)
- Secuencia → auto-agrega a lista de email
- Admin Tenants CRUD (GET/POST/PUT /api/admin/tenants)
- Filtros de fecha en Analytics y CRM Stats
- Endpoint /api/leads/stats
- Modulos incluyen "leads"

### Cambios en Frontend
- Sidebar reestructurado (4 secciones + Super Admin)
- Pagina Admin Tenants (/admin/tenants)
- Boton "Crear Lead" en Leads page
- Tarjetas de stats en Leads
- Filtros de fecha en Analytics (Leads + CRM tabs)
- Metrica "Perdidas" en Analytics CRM

### Cambios en n8n
- Workflow v2: n8n-workflow-spectra-prospeccion-v2.json

---

## Pasos para Actualizar

### 1. Guardar en GitHub
En el chat de Emergent, click en "Save to GitHub" para pushear los cambios.

### 2. Rebuild en EasyPanel

#### Backend:
1. Ir a EasyPanel → tu proyecto → servicio Backend
2. Click "Rebuild" o "Deploy"
3. Verificar que el build pase sin errores
4. Verificar logs que diga "Application startup complete"

#### Frontend:
1. Ir a EasyPanel → tu proyecto → servicio Frontend
2. Click "Rebuild" o "Deploy"
3. Verificar que el build pase

### 3. Actualizar n8n
1. En tu n8n → Menu → Workflows → "+" → "Import from file"
2. Sube `n8n-workflow-spectra-prospeccion-v2.json`
3. Edita el nodo "Outscraper Buscar":
   - Reemplaza `TU-OUTSCRAPER-API-KEY` con tu API key real
4. Edita el nodo "Scoring IA":
   - Reemplaza `TU-DIFY-APP-KEY` con: `app-JXLErCQh2VNTu6yCHJU6uOGs`
   - Reemplaza la URL de Dify si es diferente
5. Activa el workflow (toggle arriba a la derecha → ON)
6. Copia la "Production URL" del nodo Webhook
7. En Spectra → Configuracion → Integraciones → n8n → pega la Production URL

### 4. Verificar
- Login en flow.spectra-metrics.com
- Verificar sidebar con 4 secciones
- Probar crear un lead manual
- Probar Admin Tenants (Super Admin)
- Verificar Analytics con filtros de fecha

---

## Archivos Modificados
- /app/backend/server.py
- /app/frontend/src/components/layout/Sidebar.js
- /app/frontend/src/pages/LeadsPage.js
- /app/frontend/src/pages/AnalyticsPage.js
- /app/frontend/src/pages/SettingsPage.js
- /app/frontend/src/pages/TenantAdminPage.js (NUEVO)
- /app/frontend/src/pages/JobsPage.js
- /app/frontend/src/App.js
- /app/n8n-workflow-spectra-prospeccion-v2.json (NUEVO)
