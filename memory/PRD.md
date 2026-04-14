# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Navigation (4 Sections + Super Admin + Productos)
1. **Spectra Prospeccion**: Buscador (B2B + LinkedIn), Flow IA
2. **Leads**: Central hub (prospeccion, bot, LinkedIn, manual, importado)
3. **Spectra Email Marketing**: Email Marketing, Campanas, Plantillas
4. **Spectra CRM**: Pipeline Kanban, Contactos, Oportunidades
+ **Super Admin**: Admin Tenants
+ **Productos**: OptimIA Bot, Spectra Content IA, Spectra Brain

## Implemented Features
- Full pipeline: Prospect Finder → Flow IA → Leads → Email Marketing → CRM
- Prospect Finder: B2B (Outscraper) + LinkedIn (Apify) tabs
- Lead source tracking (Fuente column): B2B, LinkedIn, OptimIA Bot, Creado, Importado
- Channel tracking: web, whatsapp, facebook, instagram, email, telefono, referido
- Editable notes and channel per lead
- Manual lead creation, Excel import/export
- Pick leads from Leads collection for email lists
- Chatwoot → Leads with BOT tag + channel
- CRM deals deduplication, auto-deal on stage change
- Module toggle controls sidebar (hidden for clients)
- Technical details hidden from non-super_admin users
- Super Admin: Tenant CRUD (plans, pricing, modules)
- Flow IA Neuro: custom prompt for template generation
- Sequence → auto email list
- n8n deduplication, all leads pass (scored + rejected)
- Analytics: date filters + Perdidas
- PWA, Docker, EasyPanel deployment

## Backlog
- Apify LinkedIn real scraping
- Chatwoot e2e testing
- Refactor server.py into route modules
