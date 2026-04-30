# Guía de integraciones n8n — Spectra Flow

Este documento describe **exactamente qué nodos editar** en cada template de n8n cuando das de alta un cliente nuevo (un tenant). El objetivo es que tengas **1 workflow n8n por cliente** con sus propias credenciales, todo gestionado desde el panel **Admin Tenants → Configurar**.

---

## Arquitectura oficial (a partir de ahora)

Para cada cliente vas a tener **5 credenciales** bajo su tenant, configurables desde el modal **"Configurar"** en `/admin/tenants`:

| Slot | Qué es | Dónde obtenerlo |
|---|---|---|
| **n8n Prospección** | URL del webhook del workflow *"Spectra Flow - Prospeccion v2"* duplicado por cliente | En tu instancia de n8n, copiás el webhook URL del nodo `Webhook` del flow duplicado |
| **n8n Bot Optimia** | URL del webhook del workflow *"Optimia 2026"* duplicado por cliente | En tu instancia de n8n, copiás el webhook URL del nodo `Webhook Entrante1` del flow duplicado |
| **Outscraper API** | API key del cliente (o tuya compartida) | https://app.outscraper.com/profile |
| **Dify AI** | App key del cliente (o tuya compartida) | Dify → Apps → tu app → API Access → Bearer `app-xxxxx` |
| **Resend Email** | API key Resend (opcional, si el cliente quiere enviar con dominio propio) | https://resend.com/api-keys |

> **Outscraper reemplaza a Apify** como scraper oficial. El workflow Prospeccion v2 ya usa Outscraper; no hay que cambiar de servicio, solo unificar los datos.

---

## 1) Workflow **"Spectra Flow - Prospeccion v2"**

### Qué hace
1. Recibe un webhook desde Spectra Flow con `job_id`, `category`, `city`, `country`, `quantity`, `callback_url`, `progress_url`, `api_key`.
2. Notifica al backend que arrancó (`POST {{ $json.progress_url }}`).
3. Llama a **Outscraper** (`/maps/search-v3`) con la query y cantidad.
4. Devuelve resultados al backend de Spectra (`POST {{ $json.callback_url }}`).

### 🔧 Nodos a editar por cliente

| Nodo | Cambio requerido |
|---|---|
| **Webhook** (trigger) | Ninguno. La URL del webhook que genera n8n **la copiás y la pegás en** `Admin Tenants → Configurar → n8n Prospección → Base URL`. |
| **Outscraper Buscar** | En la pestaña **Headers**, cambiar el valor de `X-API-KEY` por la API key del cliente (o tu key master). El valor actual hardcodeado es `ZWI3ZmE4YmI4Z...` — reemplazalo. |
| **Notificar Inicio** | No tocar. Usa `{{ $json.progress_url }}` que llega dinámico en el body. |
| **Callback Spectra** | No tocar. Usa `{{ $json.callback_url }}` y `{{ $json.api_key }}` dinámicos. |

**Proceso paso a paso cuando das de alta un cliente:**
1. En n8n → duplicar workflow "Spectra Flow - Prospeccion v2" → renombrar a `Prospeccion - <NombreCliente>`.
2. Abrir nodo **Outscraper Buscar** → Headers → reemplazar `X-API-KEY` por la key del cliente.
3. Activar el workflow (switch en n8n).
4. Copiar la URL completa del Webhook (algo como `https://n8n.tudominio.com/webhook/abc123…`).
5. En Spectra Flow → `/admin/tenants` → fila del cliente → **Configurar** → sección **Integraciones** → `n8n Prospección` → pegar URL en Base URL → switch ON → botón **Probar**.
6. (Opcional) Cargar también la `Outscraper API` key en el tenant por si querés que Spectra la use directa en el futuro.

---

## 2) Workflow **"Optimia 2026 - con corte bot_pausado"**

### Qué hace
1. Recibe mensajes entrantes de **Chatwoot** (bot de WhatsApp / web widget).
2. Revisa si la conversación tiene label `bot_pausado` → si sí, no responde.
3. Llama a **Dify** (endpoint `/v1/chat-messages`) para generar la respuesta.
4. Responde en Chatwoot + actualiza contact.
5. Busca en **EspoCRM** si el lead existe → si no, lo crea.
6. **Envía el lead a Spectra Flow** vía webhook `/api/webhooks/chatwoot/lead/{tenant_id}`.
7. Si el operador humano responde, aplica label `bot_pausado` para pausar el bot.

### 🔧 Nodos a editar por cliente

| Nodo | Cambio requerido |
|---|---|
| **Webhook Entrante1** | Ninguno. Copiás la URL que genera n8n y la pegás en `n8n Bot Optimia → Base URL`. Esta URL es la que configurás en **Chatwoot → Account Settings → Integrations → Webhook**. |
| **Cerebro Dify** | Header `Authorization` → cambiar `Bearer app-yakABiaccuXqKHysnspZwaYX` por la key de la app Dify del cliente. |
| **Datos del Cliente - Chatwoot**, **Enviar Respuesta**, **Update Contact**, **Leer Conversación Actual**, **Aplicar Label bot_pausado**, **Set bot_status paused**, **Revisar Pausa Antes de Responder**, **HTTP Request**, **HTTP Request1** | Todos usan la misma cuenta Chatwoot. Cambiar header `api_access_token` de `uwH8W8e2eQN5ppjjtSRGrNUa` al token Chatwoot del cliente. |
| URLs Chatwoot | Todos los nodos apuntan a `https://inbox.optimia.disruptive-sw.com/...`. Si el cliente tiene su propia instancia Chatwoot, reemplazá ese host. Si usás la misma instancia compartida, no tocás nada. |
| **Buscar en EspoCRM** y **Crear Lead** | Header `X-Api-Key` → cambiar `d0455611fe454faf62f5d459436d0699` por la key EspoCRM del cliente (si el cliente usa EspoCRM; si no, desactivá estos nodos y conectá directo "Enviar a Spectra Flow"). |
| **Enviar a Spectra Flow** | URL termina en `/api/webhooks/chatwoot/lead/a6027a8d-f21b-4568-...`. Reemplazar ese UUID final por el **Tenant ID del cliente** (lo ves en Admin Tenants → Configurar, botón Copiar). |

**Proceso paso a paso cuando das de alta un cliente:**
1. En n8n → duplicar workflow "Optimia 2026" → renombrar a `Optimia - <NombreCliente>`.
2. Cambiar en todos los nodos de Chatwoot el `api_access_token` (9 nodos).
3. Cambiar en **Cerebro Dify** el bearer token.
4. Cambiar en **Buscar/Crear Lead EspoCRM** la `X-Api-Key` (solo si aplica).
5. Cambiar en **Enviar a Spectra Flow** el `{tenant_id}` al final de la URL por el del cliente.
6. Activar el workflow.
7. Copiar la URL del **Webhook Entrante1**.
8. En Chatwoot del cliente → Settings → Integrations → Webhook → pegar URL.
9. En Spectra Flow → `/admin/tenants → Configurar → n8n Bot Optimia → Base URL` → pegar URL → switch ON → Probar.

---

## 3) Cómo se cargan las credenciales desde la UI

1. Ingresás como `superadmin@spectra-metrics.com` (o con tu cuenta Pablo).
2. Sidebar → **"Admin Tenants"**.
3. Fila del cliente → botón **Configurar** (ícono de ojo + texto).
4. Se abre el modal. Scrolleá hasta la sección **"Integraciones (solo Super Admin)"**.
5. Hay **5 tarjetas** (n8n Prospección, n8n Bot Optimia, Outscraper, Dify, Resend).
6. En cada una:
   - Activá el switch.
   - Pegá **Base URL** (blur = guarda automático).
   - Pegá **API Key** (blur = guarda automático).
   - Botón **Probar** → test HTTP real contra el servicio.

El cliente (rol `Administrador`) NO ve esos valores. En `Settings → Conexiones` solo ve el estado "Conectado" / "Sin conectar" y un botón **"Solicitar conexión"** que te envía un email a `info@spectra-metrics.com` con todo lo necesario (tenant ID, usuario, integración).

---

## 4) Flujo de onboarding sugerido

```
Cliente nuevo entra al Tenant
 → Ve Settings → Conexiones → servicios en "Sin conectar"
 → Click en "Solicitar conexión" en n8n Prospección (por ejemplo)
 → Llega mail a info@spectra-metrics.com + registro en DB
 → Vos entrás en Admin Tenants → Configurar
 → Duplicás los workflows n8n → cambiás las keys en los nodos listados arriba
 → Pegás URLs + keys en el panel → Probás → activás
 → Cliente vuelve a Settings → Conexiones y ve "Conectado"
 → Listo para scrapear / recibir mensajes del bot
```

Para ver todas las solicitudes pendientes: `GET /api/admin/integration-requests` (solo super_admin).

---

## 5) Opción futura más automática (no implementada aún)

Para evitar el paso manual de duplicar workflows, se puede usar la **API de n8n**:

- `POST https://n8n.tudominio.com/api/v1/workflows` → duplicar el template.
- `PATCH https://n8n.tudominio.com/api/v1/workflows/{id}/nodes` → reemplazar las credenciales por variables.

Con eso, al apretar "Solicitar conexión" en Spectra, se podría disparar un job que:
1. Clone el template.
2. Rellene automáticamente `X-API-KEY`, `api_access_token`, `{tenant_id}` con los valores correctos del cliente.
3. Active el workflow.
4. Devuelva la URL del webhook y la guarde en `integration_configs`.

**Esto lo dejamos como feature para Junio** según tu indicación.

---

## Anexo: credenciales hardcodeadas actuales (para tener referencia)

| Servicio | Key actual en el JSON | Hay que reemplazar por |
|---|---|---|
| Outscraper | `ZWI3ZmE4YmI4ZWMyNDJjYTlhNjIyMGNiZGFkNDZkNDR\|OGU4NDEwNmJjZQ` | Key del cliente o tu master |
| Chatwoot | `uwH8W8e2eQN5ppjjtSRGrNUa` | Access token del cliente |
| Dify | `app-yakABiaccuXqKHysnspZwaYX` | App key del cliente |
| EspoCRM | `d0455611fe454faf62f5d459436d0699` | Key EspoCRM del cliente |
| Spectra tenant | `a6027a8d-f21b-4568-915f-a687782...` | Tenant ID del cliente |

**⚠️ Importante**: Esas keys del JSON template son **de tu instancia Optimia actual**. Si las dejás tal cual para un cliente nuevo, todas las conversaciones del cliente las vas a ver mezcladas en tu Chatwoot/Dify/EspoCRM. SIEMPRE reemplazarlas por las del cliente.
