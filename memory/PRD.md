# Spectra Flow - PRD

## Architecture
React 19 + FastAPI + MongoDB + Resend + Emergent LLM + Dify + n8n (PWA)

## E2E Integrations Working
- **Resend**: Real email sending (spectra-metrics.com verified). Campaign send + test emails
- **Dify**: Lead scoring endpoint calls workflow/run (user needs to configure output mapping)
- **n8n**: Webhook trigger on prospect job creation + callbacks for results/progress
- **Chatwoot**: Webhook upserts contacts with "bot" tag
- **FlowBot AI**: Context-aware chat via Emergent LLM

## All Features
- Multi-tenant auth, Demo Mode, Spanish UI, PWA
- CRM Kanban with auto-deal creation
- Email Marketing: Full CRUD, auto-list from leads, real send via Resend
- A/B template testing, editable automations
- Customizable dashboard (dates, compare mode, rates on top)
- Contextual guide banners, lead status lifecycle
- Scoring customization, API key masking

## Key Webhooks
- POST /api/webhooks/n8n/job-result/{job_id}
- POST /api/webhooks/n8n/job-progress/{job_id}
- POST /api/webhooks/chatwoot/lead (upsert + bot tag)
- POST /api/ai/dify-score-lead

## Backlog
- EasyPanel deployment
- Advanced time-series analytics
