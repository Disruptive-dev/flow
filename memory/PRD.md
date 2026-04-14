# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n + Apify (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Navigation
1. Spectra Prospeccion: Buscador (B2B + LinkedIn), Flow IA
2. Leads: Central hub (all sources) with filters, sorting, editable fields
3. Spectra Email Marketing: Campaigns, Lists (manual lead picking), Templates (AI custom prompt)
4. Spectra CRM: Pipeline Kanban, Contacts, Deals (no duplicates)
+ Super Admin: Tenants | Productos: OptimIA, Content IA, Brain

## Key Features
- Lead source tracking: B2B Google Maps, LinkedIn, OptimIA Bot, Manual, Imported
- Lead channel tracking: web, whatsapp, facebook, instagram, email, telefono, referido
- Advanced filters: date range, source, category, city, status, search
- Sortable columns: empresa, categoria, ciudad, score, fecha
- Editable lead fields: email, phone, website, category, channel, notes
- Manual lead picking for email lists
- Custom AI prompt for template generation
- Chatwoot webhook → Leads with BOT tag + channel
- n8n deduplication, all leads pass (scored + rejected)
- Module toggle, tech details hidden from clients
- Tenant management with plans/pricing/modules

## Outscraper Config
Using Google Maps Search API v3 endpoint:
- API: https://api.outscraper.com/maps/search-v3
- Auth: X-API-KEY header
- Key params: query, limit, language, async
- Alternative scrapers at outscraper.com: Google Search, Amazon, Yelp, TripAdvisor

## Backlog
- Apify LinkedIn real scraping activation
- Refactor server.py into route modules
