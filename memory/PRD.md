# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Navigation Structure (4 Sections + Super Admin)
1. **Spectra Prospeccion**: Buscador de Prospectos (B2B + LinkedIn), Flow IA
2. **Leads**: Central hub (prospeccion, bot, LinkedIn, manual, importado)
3. **Spectra Email Marketing**: Email Marketing, Campanas, Plantillas
4. **Spectra CRM**: Pipeline Kanban, Contactos, Oportunidades
+ **Super Admin** (only super_admin): Admin Tenants, OptimIA Bot, Spectra Content IA, Spectra Brain

## Source Tracking in Leads
- B2B Google Maps (from Outscraper/n8n)
- LinkedIn (from Apify - pending key activation)
- OptimIA Bot (from Chatwoot via n8n webhook)
- Creado (manual creation)
- Importado (Excel import)

## All Implemented Features
- Multi-tenant JWT auth, Demo Mode, Spanish UI, PWA
- Prospect Finder with 2 sources: B2B + LinkedIn tabs
- Lead source tracking column (Fuente)
- Chatwoot/OptimIA Bot → Leads with BOT tag (n8n workflow ready)
- CRM deals deduplication fix
- Module toggle controls sidebar visibility
- Super Admin: Tenants + external links (OptimIA, Content IA, Brain)
- Analytics: Date filters + Perdidas metric
- Manual lead creation, Excel import/export
- Sequence → auto email list
- n8n deduplication, all leads pass (scored + rejected)

## Backlog
- Apify LinkedIn scraping activation
- Chatwoot e2e testing
- Refactor server.py into route modules
