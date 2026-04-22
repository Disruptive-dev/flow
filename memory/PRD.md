# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n + Apify (PWA)

## Navigation (8 Sections)
1. Spectra Prospeccion: Buscador (B2B + LinkedIn), Flow IA
2. Leads: Central hub with filters, sorting, editable fields, source tracking
3. Spectra Email Marketing: Plantillas, Listas, Segmentos, Campanas, Formularios(Pronto)
4. Spectra CRM: Pipeline (Kanban + Lista + bulk actions), Contactos, Tareas, Notas, Productos, Etiquetas, Historial
5. Spectra Web: Landing Pages (Pronto)
6. Spectra Performance: Meta Ads, Google Ads, TikTok, SEO, GEO (Pronto)
7. Analisis + Configuracion
8. Super Admin + Productos (OptimIA, Content IA, Brain)

## Auth & Onboarding
- Login/Register with JWT cookies
- Forgot password (email via Resend) + Reset password via JWT token link
- New tenant registration: plan=trial, trial_ends_at=+15 days, only leads+crm modules active
- Role hierarchy: super_admin > tenant_admin > operator
- Super Admin: "Resetear datos demo" button in Configuracion > Empresa (deletes tenant's leads, deals, contacts, tasks, notes, campaigns)

## CRM Detail Features
- 6 tabs: Info, Notas, Tareas, Oportunidades, Productos, Historial
- Tasks: llamar, email, reunion, seguimiento, whatsapp, tarea
- Notes with timestamps and author
- Products linked to deals with auto-total
- Tags on deals with filtering
- Activity log auto-tracking
- Pipeline: Kanban and Lista view toggle + bulk move/delete
- Presupuestos placeholder (Pronto)

## Settings
- Empresa, Usuarios, Integraciones(admin), Dominios, Modulos(admin), Scoring, Productos, Actividad(admin)
- 6 toggleable modules: prospeccion, leads, email_marketing, crm, web, performance

## Responsive / PWA
- Sidebar: fixed on lg+, hidden/slide-in drawer on <lg with hamburger menu
- Main content: px-4 sm:px-6 lg:px-8

## Integrations
- Resend: transactional email (no-reply@spectra-metrics.com)
- Apify: LinkedIn scraper via apify~google-search-scraper actor
- Dify: AI scoring
- n8n: webhook-based prospecting flows
- Emergent LLM Key: Flow IA (Claude/GPT/Gemini)

## Changelog
- 2026-02 (iter 10): Forgot/reset password + 15-day trial + reset demo data + CRM Lista view + mobile sidebar (PASSED 10/10 backend + UI tests)
- 2026-02 (iter 11): Trial expiry middleware (402 on expired) + trial countdown banner + upgrade request flow to info@spectra-metrics.com

## Backlog
- P1: Refactor server.py (>3200 lines) into routes/
- P1: Rate limiting on /api/auth/forgot-password
- P1: Dedicated short-lived reset-password JWT token type (15-60min)
- P2: Performance connectors (Meta/Google/TikTok APIs)
- P2: Landing Pages builder
- P2: Formularios de captura
- P2: Presupuestos funcionales
uth/forgot-password
- P1: Dedicated short-lived reset-password JWT token type (15-60min)
- P1: Trial expiry middleware (block tenants after trial_ends_at)
- P2: Performance connectors (Meta/Google/TikTok APIs)
- P2: Landing Pages builder
- P2: Formularios de captura
- P2: Presupuestos funcionales
