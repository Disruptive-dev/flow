# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Navigation Structure (4 Sections)
1. **Spectra Prospeccion**: Buscador de Prospectos, Flow IA
2. **Leads**: Central hub (prospeccion, bot, LinkedIn futuro)
3. **Spectra Email Marketing**: Email Marketing, Campanas, Plantillas
4. **Spectra CRM**: Pipeline Kanban, Contactos, Oportunidades
+ **Super Admin**: Tenant Management (solo super_admin)

## All Implemented Features
- Multi-tenant JWT auth, Demo Mode, Spanish UI, PWA
- Prospect Finder → Flow IA → Leads → Email Marketing → CRM (full pipeline)
- CRM Kanban with auto-deal creation on stage change (NO duplicates)
- Email Marketing: Full CRUD, auto-list from scored leads, real send via Resend
- A/B template testing, editable automations
- Customizable dashboard (dates, compare mode, rates on top)
- Analytics: Leads/CRM stats + Time-series + Date filters (week/month/quarter) + Perdidas
- Scoring customizable (Settings → Scoring tab)
- Auto-list: Scored leads auto-saved to email lists
- Contextual guide banners, lead status lifecycle dialog
- Real Resend email integration, Dify scoring endpoint
- n8n webhook trigger + callbacks with deduplication
- Chatwoot webhook → creates leads (not CRM contacts) with BOT tag
- Module toggle in Settings controls sidebar visibility
- Super Admin Tenant Management (create/edit clients, plans, pricing, modules)
- API key masking, Company data fields
- Docker + EasyPanel deployment ready

## Backlog
- Chatwoot end-to-end guide with user's instance
- LinkedIn scraping via Outscraper (future data source for Leads)
- Advanced scoring customization per tenant
- Refactor server.py into route modules
