# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM (PWA)

## Implemented Features
- Multi-tenant auth, Demo Mode, Spanish UI
- CRM Kanban with auto-deal creation on stage change
- Email Marketing: Full CRUD (campaigns, lists, automations) + auto-list from scored leads
- Real Resend email integration (spectra-metrics.com)
- FlowBot context-aware AI assistant
- A/B template testing
- Customizable dashboard (dates, compare, rates on top)
- Chatwoot webhook upsert with "bot" tag
- Scoring customization endpoint
- PWA support, Emergent badge hidden
- Contextual guide banners, lead status lifecycle dialog

## Key Endpoints
- POST /api/crm/contacts/{id} (auto-deal on stage change)
- POST /api/webhooks/chatwoot/lead (upsert + bot tag)
- CRUD /api/email-marketing/lists, campaigns, automations
- POST /api/email-marketing/auto-list-from-leads
- POST /api/email-marketing/lists/{id}/add-leads
- GET/PUT /api/settings/scoring

## Backlog
- P1: EasyPanel deployment plan
- P2: Advanced analytics time-series
