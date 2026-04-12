# Spectra Flow - Guia End-to-End de Integraciones

## URLs Base
- **App**: https://spectra-hub.preview.emergentagent.com
- **API Base**: https://spectra-hub.preview.emergentagent.com/api

---

## 1. FLUJO COMPLETO: Prospeccion → Leads → Email → CRM

### Paso 1: Buscar Prospectos
En **Buscador de Prospectos**, selecciona pais/provincia/ciudad/categoria y crea un trabajo.
- Si n8n esta configurado, dispara el webhook automaticamente.
- Si no, usa el modo demo (genera leads simulados).

### Paso 2: Flow IA procesa los leads
En **Flow IA** ves el progreso en tiempo real. Cuando termina, los leads aparecen en **Leads** con score IA.

### Paso 3: Revisar y Aprobar Leads
En **Leads**, revisa los scores, aprueba los mejores, rechaza los malos.

### Paso 4: Crear Lista de Email
En **Email Marketing → Listas**, clickea **"Auto-lista de Leads Calificados"** para crear automaticamente una lista con todos los leads scored/approved.

### Paso 5: Crear Campana y Enviar
En **Email Marketing → Campanas**, crea una campana vinculando una plantilla y la lista de leads. Clickea **"Enviar Real"** para enviar via Resend.

### Paso 6: Leads al CRM
En **Leads**, selecciona los interesados y envialos al CRM. Se crean como contactos en **Spectra CRM**.

---

## 2. CONFIGURACION n8n

### Webhook de Spectra Flow → n8n
Cuando se crea un prospect job, Spectra envia un POST a tu webhook n8n con:
```json
{
  "job_id": "uuid",
  "tenant_id": "uuid",
  "country": "Argentina",
  "province": "Tucuman",
  "city": "San Miguel de Tucuman",
  "category": "real estate",
  "quantity": 100,
  "postal_code": "",
  "callback_url": "https://spectra-hub.preview.emergentagent.com/api/webhooks/n8n/job-result/{job_id}",
  "progress_url": "https://spectra-hub.preview.emergentagent.com/api/webhooks/n8n/job-progress/{job_id}",
  "api_key": "tu-api-key"
}
```

### Configurar en Spectra
1. Ve a **Configuracion → Integraciones**
2. Habilita **n8n Automation**
3. **Base URL**: Pega la URL de tu webhook de n8n (ej: `https://tu-n8n.com/webhook/spectra-prospeccion`)
4. **API Key**: Una clave que usaras para autenticar callbacks

### Workflow de n8n recomendado
1. **Webhook Trigger** (recibe el job de Spectra)
2. **Outscraper Node** (busca en Google Maps con los parametros)
3. **Loop** por cada resultado:
   a. **Dify API** (clasifica y puntua el lead)
   b. **Formatea** el lead
4. **HTTP Request** (envia resultados a Spectra callback)

### Callback: Enviar resultados a Spectra
```
POST https://spectra-hub.preview.emergentagent.com/api/webhooks/n8n/job-result/{job_id}
Headers: X-Api-Key: tu-api-key
Body:
{
  "raw_count": 150,
  "leads": [
    {
      "business_name": "Inmobiliaria del Sol",
      "category": "Real Estate",
      "city": "San Miguel de Tucuman",
      "province": "Tucuman",
      "website": "www.inmobiliariadelsol.com.ar",
      "email": "info@inmobiliariadelsol.com.ar",
      "phone": "+54 381 422-1234",
      "rating": 4.6,
      "reviews_count": 87,
      "address": "Av. Belgrano 1234",
      "ai_score": 85,
      "quality_level": "excellent",
      "recommendation": "Altamente recomendado",
      "recommended_first_line": "Notamos que su empresa tiene una fuerte presencia en Tucuman."
    }
  ]
}
```

### Callback: Progreso por etapas
```
POST https://spectra-hub.preview.emergentagent.com/api/webhooks/n8n/job-progress/{job_id}
Headers: X-Api-Key: tu-api-key
Body: { "stage": "scraping", "status": "completed", "raw_count": 150 }
```
Stages: `scraping` → `prospects_found` → `ai_cleaning` → `scoring_completed` → `ready_for_review`

---

## 3. CONFIGURACION DIFY

### Endpoint de scoring directo
```
POST https://spectra-hub.preview.emergentagent.com/api/ai/dify-score-lead
Headers: Authorization: Bearer {token}
Body: { "lead_id": "uuid" }
```
O con datos directos:
```json
{
  "business_data": "Nombre: Inmobiliaria del Sol\nDireccion: Av. Belgrano 1234, SMT\nTelefono: +54 381 422-1234\nWebsite: www.inmobiliariadelsol.com.ar\nEmail: info@inmobiliariadelsol.com.ar\nRating: 4.6\nReviews: 87\nCategoria: Real estate"
}
```

### Tu workflow de Dify debe:
1. Recibir variable `business_data` (Paragraph, max 2000+ caracteres)
2. Procesarla con un LLM (GPT-4o-mini o similar)
3. Devolver JSON en variable `result` del nodo de salida:
```json
{
  "ai_score": 85,
  "quality_level": "excellent",
  "normalized_category": "Inmobiliaria",
  "recommendation": "Altamente recomendado - presencia web solida",
  "recommended_first_line": "Su empresa destaca en el mercado inmobiliario de Tucuman."
}
```

### Configurar en Spectra
1. **Configuracion → Integraciones → Dify**
2. **Base URL**: `http://tu-dify.com/v1`
3. **API Key**: `app-xxxx` (la API key de tu app de Dify)

---

## 4. CONFIGURACION RESEND

### Ya configurado y funcionando
- **Dominio**: spectra-metrics.com (verificado en Resend, region sa-east-1)
- **API Key**: Configurada en backend .env
- **Email remitente**: noreply@spectra-metrics.com

### Endpoints disponibles
- **Enviar email directo**: `POST /api/email/send`
- **Enviar campana real**: `POST /api/email-marketing/campaigns/{id}/send-real`
- **Email de prueba por plantilla**: `POST /api/templates/{id}/send-test`
- **Sincronizar dominios**: `POST /api/domains/sync-resend`

---

## 5. CONFIGURACION CHATWOOT / OPTIMIA BOT

### Webhook para recibir leads del bot
```
POST https://spectra-hub.preview.emergentagent.com/api/webhooks/chatwoot/lead
Content-Type: application/json
Body:
{
  "name": "Juan Perez",
  "contact_name": "Juan Perez",
  "email": "juan@empresa.com",
  "phone": "+54 381 555-1234",
  "business_name": "Empresa de Juan",
  "city": "Tucuman",
  "category": "Consultoria",
  "message": "Me interesa saber mas sobre sus servicios"
}
```

### Comportamiento:
- Si ya existe un contacto con ese email o telefono: **actualiza** y agrega tag `bot`
- Si es nuevo: **crea** contacto con `source="bot"` y `tags=["bot"]`
- En el CRM veras estos contactos con la etiqueta BOT para identificarlos

### En n8n (Chatwoot → Spectra):
1. **Chatwoot Trigger** (cuando se crea contacto o conversacion)
2. **Extraer datos** (nombre, email, telefono, mensaje)
3. **HTTP Request** al webhook de Spectra

---

## 6. CONFIGURACION OUTSCRAPER

### Configurar en Spectra
1. **Configuracion → Integraciones → Outscraper**
2. **Base URL**: `https://api.app.outscraper.com/maps/search-v3`
3. **API Key**: Tu key de Outscraper

### En n8n, el nodo de Outscraper busca:
```
Query: "{category} in {city}, {province}, {country}"
Limit: {quantity}
```

---

## RESUMEN DE WEBHOOKS

| Webhook | Metodo | URL | Descripcion |
|---------|--------|-----|-------------|
| Job Result | POST | /api/webhooks/n8n/job-result/{job_id} | Envia leads procesados |
| Job Progress | POST | /api/webhooks/n8n/job-progress/{job_id} | Actualiza progreso |
| Chatwoot Lead | POST | /api/webhooks/chatwoot/lead | Crea/actualiza contacto del bot |
| Dify Score | POST | /api/ai/dify-score-lead | Califica un lead via Dify |
