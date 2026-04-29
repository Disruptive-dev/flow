# Spectra Flow - PRD

## Original Problem Statement
Premium multi-tenant SaaS "Spectra Flow" (Growth OS): AI prospecting, CRM, Email Marketing, Analytics, multi-tenancy, RBAC. Pre-launch hardening (15-day trial middleware, forgot password, dynamic CRM stages and lead taxonomies, dark/light theme, collapsible sidebar, "Próximamente" placeholders, public landing at `/landing` with contact form to `info@spectra-metrics.com`).

## Stack
React + FastAPI + MongoDB. Tailwind dark mode (class strategy). Resend for transactional email. Emergent LLM key for IA. n8n/Chatwoot webhook ingestion. JWT auth.

## User
Spanish-speaking, budget-conscious. Deploys via "Save to GitHub" → EasyPanel. Owner email: `info@spectra-metrics.com`.

## Implemented (Done)
- Auth (login/register/forgot/reset password) — JWT + bcrypt
- 15-day trial expiry middleware + countdown banner
- Conversion funnel tracking + analytics widget
- "Reset Demo Data" gated by `is_demo=true`
- Dynamic CRM pipeline stages (per tenant)
- Dynamic lead taxonomies (sources, categories, statuses, channels, provinces, cities)
- Responsive Kanban scaling by stage count
- Sidebar reorder + 5 "Próximamente" placeholders + desktop expand/collapse + Ecosistema links
- Dark/Light theme toggle, login Spanish translations
- n8n/Chatwoot webhook ingestion endpoints
- Public Landing Page `/landing` (premium dark UI, métricas, productos, ecosistema, contact form)
- `POST /api/public/contact` → Resend email to `info@spectra-metrics.com` + persist in `landing_submissions` (Feb 2026)
- Resend SDK upgrade fix: `resend.Emails.send` (was `resend.emails.send`, broken)

## Roadmap (Pending)
- P1: Spectra Finance Module (Income, Expenses, Costs, Suppliers, Business Units, Cashflow, Dashboards) — deferred by user (credits)
- P1: Refactor `/app/backend/server.py` (>3450 lines) → routers/ architecture
- P2: Email Marketing Automations (workflow builder)
- P2: Spectra Performance / Project Management / Fidelity modules (currently `ComingSoonPage`)
- P2: Presupuestos & Facturación inside CRM

## Mocked / Placeholder
Finance, Performance, Fidelity, Project Management, Budgets, Invoicing → routed to `ComingSoonPage`.

## Key Endpoints
- `POST /api/auth/login|register|forgot-password|reset-password`
- `POST /api/public/contact` — public landing form (no auth, exempt from trial middleware)
- `GET /api/tenant/status` — trial countdown
- `POST /api/admin/reset-demo-data`
- `POST /api/webhooks/chatwoot/lead/{tenant_token}`
- `POST /api/webhooks/n8n/job-result/{job_id}`

## DB Collections
`tenants`, `users`, `leads`, `crm_deals`, `crm_tasks`, `crm_notes`, `crm_products`, `campaigns`, `templates`, `landing_submissions` (new).

## Critical Notes for Next Agent
- SPANISH ONLY responses
- Budget-constrained: prefer parallel calls, small targeted edits
- Resend SDK 2.27 → use `resend.Emails.send` (capital E)
- `/api/public/*` and `/api/auth/*` exempt from trial middleware
- Owner credentials in `/app/memory/test_credentials.md`
