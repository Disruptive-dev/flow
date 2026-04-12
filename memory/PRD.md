# Spectra Flow - Product Requirements Document

## Original Problem Statement
Build a premium multi-tenant SaaS web application called Spectra Flow - an AI-powered prospecting, lead qualification, email outreach, and CRM handoff platform.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + Motor (MongoDB async driver)
- **Database**: MongoDB
- **Auth**: JWT with httpOnly cookies + bcrypt password hashing
- **Multi-tenancy**: Row-level using tenant_id
- **Email**: Resend API (real sending via spectra-metrics.com)
- **AI**: Emergent LLM Key (FlowBot, Neuro Copywriting)

## User Personas
1. **Super Admin** - Full system access, manages all tenants
2. **Tenant Admin** - Full access within tenant, manages users and settings
3. **Operator** - Manages leads, campaigns, operational workflows
4. **Viewer** - Read-only access to dashboards and reports

## Core Requirements
- Multi-tenant architecture with role-based access control
- AI-powered prospecting workflow
- Lead lifecycle management (15 statuses, all in Spanish)
- Campaign management with email templates
- Domain/sender setup with real DNS verification via Resend
- Built-in Spectra CRM (Kanban, contacts, deals)
- Email Marketing module (campaigns, automations, lists)
- FlowBot AI analytics assistant (context-aware, can analyze specific items by name)
- Bilingual UI (English/Spanish)
- Premium B2B SaaS design aesthetic

## What's Been Implemented

### Phase 1 (Initial Build)
- Complete JWT auth system with login, register, logout, refresh
- Multi-tenant data architecture
- All CRUD endpoints: prospect jobs, leads, campaigns, templates, domains, CRM sync, analytics, settings, users
- Seed data with realistic Argentine business data
- Demo Mode with animated Prospect Job progress
- Translation to Spanish UI
- Spectra CRM with Drag & Drop Pipeline
- Split Analytics for Leads vs CRM with Funnel charts
- Email Marketing Module creation
- Integration configuration (n8n, Dify, Outscraper, Resend)
- Downloadable n8n workflow JSON generator
- Flow IA Neuro template generation
- Shared Templates between Prospeccion and Email Marketing

### Phase 2 (Apr 12, 2026 - Current Session)
- **Real Resend Email Integration**: Domain spectra-metrics.com verified, real email sending via Resend API
- **Domain Sync**: POST /api/domains/sync-resend to sync status from Resend API
- **API Key Masking**: All integration API keys masked (first 4 + *** + last 4) with pencil edit button
- **Company Data Fields**: Replaced color pickers with company info (industry, phone, tax_id, country, website, address, description)
- **Spanish Lead Statuses**: All 15 lead statuses translated to Spanish
- **Quality Parameter Breakdown**: Lead detail drawer shows scoring breakdown (+20 sitio web, +15 email, +10 telefono, etc.)
- **Context-Aware FlowBot**: Can analyze specific campaigns, deals, contacts, and leads by name
- **Editable Automations**: Full CRUD for email automations with step editor (email/wait/condition)
- **Sidebar Email**: Changed to flow@spectra-metrics.com

## Prioritized Backlog

### P1 (Important)
- Import/Export Excel for Spectra CRM Contacts
- Customizable dashboards (move/hide panels)
- Digital Ocean / EasyPanel deployment architecture plan

### P2 (Nice to Have)
- Dashboard date range filters
- Lead scoring customization
- A/B testing for email templates
- Chatwoot → Spectra CRM webhook
- Advanced analytics with time-series charts

## Key API Endpoints
- POST /api/auth/login
- POST /api/prospect/job
- POST /api/ai/flowbot-chat (conversational, context-aware)
- POST /api/ai/neuro-template
- GET /api/export/n8n-workflow
- POST /api/email/send (real Resend)
- POST /api/domains/sync-resend
- PUT /api/email-marketing/automations/{id}
- GET /api/domains/resend-status

## External Integrations
- **Resend**: Real email sending (API key in .env, domain: spectra-metrics.com verified)
- **OpenAI/Claude via Emergent LLM Key**: FlowBot and Neuro Copywriting
- **n8n/Outscraper/Dify**: Configured via tenant settings (user manages externally)
