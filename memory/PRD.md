# Spectra Flow — PRD (Growth OS)

## Problema original
SaaS multi-tenant premium con IA para prospección, CRM, Email Marketing, Analytics y RBAC estricto, con Super Admin que centraliza integraciones (n8n, Outscraper, Dify, Resend, Apify) ocultas a los clientes.

## Stack
React + FastAPI + MongoDB (Motor). JWT auth. Shadcn UI. i18n ES/EN. Dark/light mode. Emergent LLM Key para Neuro Flow IA.

## Personas / Roles (RBAC)
- **super_admin**: cross-tenant, gestiona integraciones, precios, módulos, límites, tenants.
- **tenant_admin**: full dentro de su tenant.
- **operator**: CRUD sin DELETE ni settings.
- **viewer**: read-only.

## Módulos implementados
- Prospección (Outscraper + Apify + n8n + Demo Mode con data sintética)
- Leads (tabla con filtros país/fecha, mini-widget por país)
- CRM (contactos, embudo)
- Email Marketing (Resend, campañas, plantillas)
- Admin de Tenants (módulos, precios dinámicos, cupones, trial, 100% free, límites por módulo)
- Integraciones Super Admin (masked para clientes, rename a marca propia: OptimIA Bot, Spectra Prospection, etc.)
- Landing Page pública con formulario de contacto (Resend)
- Flow IA (bot modal responsive)

## Completado en esta sesión (fork)
- **2026-05-01**: Verificación de límites por módulo (`module_limits`) y reactivación Apify — OK vía curl.
- **2026-05-01**: Documento técnico completo **Spectra Finance** generado en `/app/SPECTRA_FINANCE_SPEC.md` (para pasar a otra IA — no implementado aún).

## Backlog priorizado
### P0 (bloqueantes)
- Ninguno.

### P1
- **Spectra Finance** — ver `/app/SPECTRA_FINANCE_SPEC.md` (spec completo listo).
- Impersonation (Super Admin "Log in as").
- Refactor `server.py` (>4000 líneas) → `/app/backend/routes/*`.

### P2
- Email Marketing Automations (workflow builder).
- Spectra Performance (módulo pronto).
- Spectra Project Management (pronto).
- Spectra Fidelity (pronto).
- Presupuestos + Facturación en CRM (parte integrada en Finance spec).

## Archivos clave
- `/app/backend/server.py` (monolítico, P1 refactor)
- `/app/frontend/src/pages/TenantAdminPage.js` (módulos + límites + pricing)
- `/app/frontend/src/pages/SettingsPage.js`
- `/app/frontend/src/components/FlowBotButton.js`
- `/app/SPECTRA_FLOW_IA_PROMPT.md` (prompt maestro IA)
- `/app/SPECTRA_N8N_INTEGRATIONS_GUIDE.md` (guía integraciones)
- `/app/SPECTRA_FINANCE_SPEC.md` (nuevo — spec módulo Finance)
- `/app/n8n_templates/Spectra_Prospeccion_TEMPLATE.json`
- `/app/n8n_templates/OptimIA_BOT_TEMPLATE.json`

## Restricciones de sesión
- **Idioma**: Español.
- **Créditos**: alto foco en ahorro. No ejecutar refactors grandes ni test suites masivos sin aprobación explícita.
- **No compartir URLs de preview al usuario.**
- **Integraciones**: solo Super Admin, clientes ven `****`.
