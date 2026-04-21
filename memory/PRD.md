# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n + Apify (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Implemented Features (Fase 1)

### Email Marketing (Brevo-style)
- Stats dashboard: Enviados, Aperturas%, Clics%, Respuestas, Bounces, Cancelaciones
- Rate bars with progress indicators
- Tabs reordered: Plantillas → Listas → Segmentos → Campañas
- Segments: Dynamic rules (source, status, score, city, category, channel)
- Campaigns table: Brevo-style with all metrics columns
- Pick leads with filters (source, status) for lists
- "Formularios" placeholder (Muy Pronto)
- NeuroFlow: industry/tone now optional

### CRM Backend (ready, UI next)
- Tasks CRUD: llamar, email, reunion, seguimiento
- Notes CRUD per contact/deal
- Products catalog + deal products with auto-total
- Deal tags with filtering
- Activity log (auto-tracking all CRM actions)
- Settings activity log view

### Sidebar
- SPECTRA WEB section with "Landing Pages (Pronto)"
- "Formularios (Pronto)" in Email Marketing

## Backlog (Fase 1 remaining UI)
- CRM Deal detail page (tabs: Notas, Tareas, Historial, Productos, Presupuestos)
- Products in Settings/Configuration
- Activity log in Settings
- Presupuestos placeholder (Muy Pronto)
