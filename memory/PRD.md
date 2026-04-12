# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## All Implemented Features
- Multi-tenant JWT auth, Demo Mode, Spanish UI, PWA
- Prospect Finder → Flow IA → Leads → Email Marketing → CRM (full pipeline)
- CRM Kanban with auto-deal creation on stage change
- Email Marketing: Full CRUD, auto-list from scored leads, real send via Resend
- A/B template testing, editable automations
- Customizable dashboard (dates, compare mode, rates on top)
- Analytics: Leads/CRM stats + Time-series (leads/jobs/contacts by day) + Top categories + Quality distribution
- Scoring customizable (Settings → Scoring tab)
- Auto-list: Scored leads auto-saved to "Prospeccion / {category} - Leads calificados"
- Contextual guide banners, lead status lifecycle dialog
- Real Resend email integration, Dify scoring endpoint, Chatwoot webhook with bot tag
- n8n webhook trigger + callbacks
- API key masking, Company data fields
- Docker + EasyPanel deployment ready

## Backlog
- Connect real n8n + Outscraper + Dify for live prospecting
- Chatwoot → n8n → Spectra live demo
