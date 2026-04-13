# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Navigation Structure (4 Sections)
1. **Spectra Prospeccion**: Buscador de Prospectos, Flow IA
2. **Leads**: Central hub (prospeccion, bot, LinkedIn futuro, manual)
3. **Spectra Email Marketing**: Email Marketing, Campanas, Plantillas
4. **Spectra CRM**: Pipeline Kanban, Contactos, Oportunidades
+ **Super Admin**: Tenant Management (solo super_admin)

## All Implemented Features
- Multi-tenant JWT auth, Demo Mode, Spanish UI, PWA
- Prospect Finder → Flow IA → Leads → Email Marketing → CRM (full pipeline)
- CRM Kanban with auto-deal creation on stage change (NO duplicates)
- CRM deals: update existing instead of creating duplicate
- Email Marketing: Full CRUD, auto-list from scored leads, real send via Resend
- A/B template testing, editable automations
- Customizable dashboard (dates, compare mode, rates on top)
- Analytics: Leads/CRM stats + Time-series + Date filters + Perdidas metric
- Scoring customizable (Settings → Scoring tab)
- Auto-list: Scored leads auto-saved to email lists
- Sequence flow: "Enviar a secuencia" → auto-adds to email list "Secuencia - Leads en cola"
- Contextual guide banners, lead status lifecycle dialog
- Real Resend email integration, Dify scoring endpoint
- n8n webhook trigger + callbacks with deduplication (by name/phone/email)
- All leads pass through: scored (>=50) + rejected (<50)
- Chatwoot webhook → creates leads (not CRM contacts) with BOT tag
- Module toggle in Settings controls sidebar visibility
- Super Admin Tenant Management (create/edit clients, plans, pricing, modules per client)
- Manual lead creation from Leads page
- Lead stats summary cards (Calificados, Rechazados, Aprobados, Total)
- API key masking, Company data fields
- Docker + EasyPanel deployment ready
- n8n Workflow v2 (fixes data mixing bug from SplitInBatches)

## Backlog
- Chatwoot end-to-end guide with user's instance
- LinkedIn scraping via Outscraper (future data source for Leads)
- Advanced scoring customization per tenant
- Refactor server.py into route modules
