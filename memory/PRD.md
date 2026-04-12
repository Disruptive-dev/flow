# Spectra Flow - Product Requirements Document

## Original Problem Statement
Build a premium multi-tenant SaaS web application called Spectra Flow - an AI-powered prospecting, lead qualification, email outreach, and CRM handoff platform.

## Architecture
- **Frontend**: React 19 + Tailwind CSS + Shadcn UI + Recharts
- **Backend**: FastAPI + Motor (MongoDB async driver)
- **Database**: MongoDB
- **Auth**: JWT with httpOnly cookies + bcrypt password hashing
- **Multi-tenancy**: Row-level using tenant_id

## User Personas
1. **Super Admin** - Full system access, manages all tenants
2. **Tenant Admin** - Full access within tenant, manages users and settings
3. **Operator** - Manages leads, campaigns, operational workflows
4. **Viewer** - Read-only access to dashboards and reports

## Core Requirements
- Multi-tenant architecture with role-based access control
- AI-powered prospecting workflow (simulated for MVP)
- Lead lifecycle management (15 statuses)
- Campaign management with email templates
- Domain/sender setup with DNS verification
- CRM sync to Espo CRM (placeholder)
- Bilingual UI (English/Spanish)
- Premium B2B SaaS design aesthetic

## What's Been Implemented (Feb 12, 2026)
### Backend
- Complete JWT auth system with login, register, logout, refresh
- Multi-tenant data architecture
- All CRUD endpoints: prospect jobs, leads, campaigns, templates, domains, CRM sync, analytics, settings, users
- Seed data with realistic Argentine business data (20 leads, 3 jobs, 3 campaigns, 3 templates, 1 domain)
- Integration configuration placeholders (n8n, Dify, Resend, Espo CRM, Chatwoot)

### Frontend
- Dark sidebar + light content hybrid theme
- Login/Register page with premium dark design
- Dashboard with 11 KPI cards, pipeline chart, recent activity
- Prospect Finder with province/city/category search form
- Jobs list + detail view with visual progress timeline (6 stages)
- Leads Review Center with sortable table, status filters, search, bulk actions, detail drawer
- Campaign Center with create, activate, pause, status tracking
- Email Templates with create/edit/delete, variable system, HTML preview
- Domains page with DNS records, verification simulation, warmup recommendations
- CRM Sync Center with sync logs, retry functionality
- Analytics with pipeline charts, email engagement, conversion rates
- Settings with branding, user management, integration configuration tabs
- Bilingual support (EN/ES toggle)

## Prioritized Backlog

### P0 (Critical - Next)
- Connect real n8n webhooks for job execution
- Implement Dify AI lead cleaning/scoring
- Connect Resend for actual email sending
- Connect Espo CRM for live lead handoff

### P1 (Important)
- Email sequence builder (multi-step campaigns)
- Lead import/export (CSV)
- Real domain DNS verification via Resend API
- Email warmup scheduling
- Audit log viewer page

### P2 (Nice to Have)
- Dashboard date range filters
- Lead scoring customization
- A/B testing for email templates
- Chatwoot bot integration
- Webhook events from Resend (opens, clicks, bounces)
- Advanced analytics with time-series charts

## Next Tasks
1. Integrate real n8n orchestration for prospecting jobs
2. Connect Dify AI for lead cleaning and scoring
3. Set up Resend for email delivery
4. Implement Espo CRM sync
5. Build email sequence builder
6. Add CSV import/export for leads
