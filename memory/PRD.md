# Spectra Flow - Product Requirements Document

## Original Problem Statement
Build a premium multi-tenant SaaS web application called Spectra Flow - an AI-powered prospecting, lead qualification, email outreach, and CRM handoff platform.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + Motor (MongoDB async driver)
- **Database**: MongoDB
- **Auth**: JWT with Bearer tokens + bcrypt password hashing
- **Multi-tenancy**: Row-level using tenant_id
- **Email**: Resend API (real sending via spectra-metrics.com)
- **AI**: Emergent LLM Key (FlowBot context-aware, Neuro Copywriting)

## What's Been Implemented

### Core Platform
- JWT auth system, multi-tenant data architecture
- Demo Mode, Spanish UI translation
- Spectra CRM (Drag & Drop Pipeline, Kanban)
- Email Marketing (campaigns, editable automations, lists)
- Integration config (n8n, Dify, Outscraper, Resend)

### Phase 2 (Apr 12, 2026)
- Real Resend Email Integration (spectra-metrics.com verified)
- API Key Masking in Integrations (pencil edit)
- Company Data Fields (replaced color pickers)
- Spanish Lead Statuses (15 states translated)
- Quality Parameter Breakdown in lead detail
- Context-Aware FlowBot (analyzes specific items by name)
- Editable Email Automations (CRUD + step editor)
- Sidebar email: flow@spectra-metrics.com

### Phase 3 (Apr 12, 2026 - Current)
- Fixed FlowBot KeyError on deals without 'name' field
- FlowBot auto-scroll to bottom on new messages
- Fixed Excel export auth (uses api.get with blob, not direct <a> link)
- Customizable Dashboard (show/hide panels + KPIs via Personalizar dialog)
- New Conversion Rates panel (Apertura, Respuesta, CRM rates)
- Dashboard preferences persist in localStorage

## Prioritized Backlog

### P1 (Important)
- Digital Ocean / EasyPanel deployment architecture plan

### P2 (Nice to Have)
- Dashboard date range filters
- Lead scoring customization
- A/B testing for email templates
- Chatwoot → Spectra CRM webhook
- Advanced analytics with time-series charts

## Key API Endpoints
- POST /api/auth/login
- POST /api/ai/flow-bot (context-aware, searches by name)
- POST /api/email/send (real Resend)
- POST /api/domains/sync-resend
- GET /api/export/leads (Excel)
- GET /api/export/crm-contacts (Excel)
- POST /api/import/leads (Excel)
- POST /api/import/crm-contacts (Excel)
- PUT /api/email-marketing/automations/{id}
