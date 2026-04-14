# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Navigation Structure (4 Sections)
1. **Spectra Prospeccion**: Buscador de Prospectos (B2B + LinkedIn), Flow IA
2. **Leads**: Central hub (prospeccion, bot, LinkedIn, manual)
3. **Spectra Email Marketing**: Email Marketing, Campanas, Plantillas
4. **Spectra CRM**: Pipeline Kanban, Contactos, Oportunidades
+ **Super Admin**: Tenant Management (solo super_admin)

## All Implemented Features
- Multi-tenant JWT auth, Demo Mode, Spanish UI, PWA
- Prospect Finder with 2 sources: B2B (Google Maps/Outscraper) + LinkedIn (Apify)
- Prospect Finder → Flow IA → Leads → Email Marketing → CRM (full pipeline)
- CRM Kanban with auto-deal creation (NO duplicates)
- Email Marketing: Full CRUD, auto-list from scored leads, real send via Resend
- Sequence flow: leads "en secuencia" auto-add to email list
- A/B template testing
- Customizable dashboard (dates, compare mode, rates)
- Analytics: Date filters + Perdidas metric
- Scoring customizable per tenant
- n8n webhook with deduplication (name/phone/email)
- Chatwoot → Leads with BOT tag
- Module toggle controls sidebar visibility
- Super Admin Tenant Management (plans, pricing, modules)
- Manual lead creation
- Docker + EasyPanel deployment

## Backlog
- Apify LinkedIn scraping (UI ready, needs API key)
- Chatwoot e2e guide
- Refactor server.py into route modules
