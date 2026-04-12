# Spectra Flow - Product Requirements Document

## Original Problem Statement
Build a premium multi-tenant SaaS web application called Spectra Flow - an AI-powered prospecting, lead qualification, email outreach, and CRM handoff platform.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts (PWA)
- **Backend**: FastAPI + Motor (MongoDB async driver)
- **Database**: MongoDB
- **Auth**: JWT with Bearer tokens + bcrypt
- **Multi-tenancy**: Row-level using tenant_id
- **Email**: Resend API (spectra-metrics.com verified)
- **AI**: Emergent LLM Key (FlowBot context-aware, Neuro Copywriting)

## What's Been Implemented

### Core
- JWT auth, multi-tenant, Demo Mode, Spanish UI
- Spectra CRM (Kanban drag-drop), Email Marketing, Integration configs
- Real Resend email sending, Domain management

### UI/UX
- Customizable dashboard (show/hide KPIs + panels, localStorage)
- Date filters (today/week/month/quarter/year) + comparison mode
- Contextual guide banners on each page
- Lead status lifecycle explanation dialog
- Spanish lead statuses (15 states)
- Quality parameter breakdown in lead detail
- API key masking in integrations
- Company data fields (industry, phone, CUIT, etc.)
- Editable automations with step editor
- Context-aware FlowBot (searches items by name)
- A/B template testing with simulation
- PWA support (manifest + service worker + icons)
- Emergent badge hidden

### Fixes Applied
- FlowBot KeyError on deals without 'name'
- FlowBot auto-scroll to bottom
- Excel export with proper auth token (blob download)

## Prioritized Backlog
### P1
- Digital Ocean / EasyPanel deployment plan
### P2
- Lead scoring customization
- Chatwoot → CRM webhook
- Advanced analytics time-series
