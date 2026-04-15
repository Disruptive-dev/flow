# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n + Apify (PWA)
Deploy: Docker Compose / EasyPanel on DigitalOcean

## Key Features
- Full pipeline: Prospect Finder → Flow IA → Leads → Email Marketing → CRM
- B2B Google Maps (Outscraper) + LinkedIn (Apify) — both active
- Apify runs directly from backend (no n8n needed for LinkedIn)
- User profile: avatar upload, name, cargo, phone, change password
- Registration creates basic plan (only Leads enabled)
- Module toggle auto-refreshes sidebar
- All tech references hidden from UI
- Products (OptimIA, Content IA, Brain) visible for ALL users
- Super Admin: tenant management with plans/pricing/modules

## Backlog
- n/a — all requested features implemented
