# Spectra Finance — Especificación Técnica Completa
**Para:** Desarrollador / IA asistente externa
**Contexto:** Este módulo se integra dentro de la plataforma **Spectra Flow (Growth OS)**, un SaaS multi-tenant ya existente construido sobre **React + FastAPI + MongoDB (Motor)**, con autenticación JWT y RBAC estricto (`super_admin`, `tenant_admin`, `operator`, `viewer`).
**Idioma de UI:** Español (opción EN disponible vía i18n ya implementado).
**Objetivo:** Entregar a cada tenant un módulo financiero completo tipo "mini-ERP" enfocado en PYMES, con enfoque en flujo de caja, rentabilidad y dashboards ejecutivos.

---

## 1. Contexto técnico obligatorio

### 1.1 Arquitectura existente (NO modificar)
- Backend: `/app/backend/server.py` (FastAPI monolítico, todas las rutas prefijo `/api`).
- Frontend: `/app/frontend/src/pages/` (React + Shadcn UI + Tailwind).
- DB: MongoDB con **Motor** async. Todas las queries deben excluir `_id` (`{"_id": 0}`).
- IDs: siempre **UUID v4 string** (nunca ObjectId en respuestas).
- Fechas: `datetime.now(timezone.utc).isoformat()` al guardar.
- Multi-tenant: **TODOS los documentos financieros llevan `tenant_id`** y las queries deben filtrar por `tenant_id` extraído del JWT vía `get_current_user()`.
- RBAC: `viewer` solo GET; `operator` GET + POST/PUT (sin DELETE); `tenant_admin` full; `super_admin` acceso a todos los tenants.

### 1.2 Activación del módulo
- El módulo Finance debe estar gateado por `tenant.modules.finance === true` (toggle en `TenantAdminPage`).
- Añadir `finance` al set de módulos válidos: `{"prospeccion","leads","crm","email_marketing","finance"}`.
- Si `modules.finance !== true`, el frontend muestra `ComingSoonPage`.
- Añadir `module_limits.finance` opcional (ej: máximo de facturas/mes).

### 1.3 Convenciones UI
- Usar componentes Shadcn ya presentes en `/app/frontend/src/components/ui/`.
- Dark/light mode compatible (variables CSS ya existentes).
- Toasts con `sonner`.
- `data-testid` kebab-case en TODO elemento interactivo.
- Montos: formato `Intl.NumberFormat` con la moneda del tenant.

---

## 2. Entidades y modelos de datos

> Todas las colecciones llevan: `id` (uuid), `tenant_id`, `created_at`, `updated_at`, `created_by` (user_id).
> Todos los montos se guardan en **centavos enteros** (`amount_cents: int`) para evitar float-drift. El frontend convierte a decimal al mostrar.

### 2.1 `finance_settings` (1 por tenant)
```json
{
  "id": "uuid",
  "tenant_id": "uuid",
  "default_currency": "ARS",         // ISO 4217
  "currencies_enabled": ["ARS","USD","EUR"],
  "fx_rates": { "USD": 1050.00, "EUR": 1120.00 },  // contra default_currency
  "fiscal_year_start_month": 1,      // 1=Enero
  "tax_rates": [                     // IVA / impuestos
    { "id":"uuid", "name":"IVA 21%", "rate": 21.0, "is_default": true },
    { "id":"uuid", "name":"IVA 10.5%", "rate": 10.5 }
  ],
  "invoice_numbering": {
    "prefix": "FAC-",
    "next_number": 1,
    "padding": 6                     // FAC-000001
  },
  "bank_accounts": [                 // ver 2.8
  ]
}
```

### 2.2 `business_units` (Unidades de Negocio)
Permite que un tenant tenga varias líneas (ej: "Consultoría", "Productos", "Eventos") y segregue reportes.
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "name": "Consultoría B2B",
  "code": "CONS",
  "color": "#1D4ED8",
  "active": true,
  "description": "…"
}
```

### 2.3 `finance_categories`
Árbol de categorías de ingreso/egreso (jerárquico, máx 3 niveles).
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "name": "Servicios profesionales",
  "parent_id": null,                 // o uuid del padre
  "kind": "income",                  // income | expense | cost
  "color": "#10B981",
  "active": true
}
```
Seed inicial por tenant al activar módulo (15-20 categorías clásicas argentinas/LATAM).

### 2.4 `suppliers` (Proveedores)
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "legal_name": "ACME SRL",
  "tax_id": "30-12345678-9",         // CUIT / RUT / RFC
  "tax_id_type": "CUIT",
  "email": "...", "phone": "...",
  "address": { "street":"", "city":"", "state":"", "country":"AR", "zip":"" },
  "payment_terms_days": 30,
  "default_category_id": "uuid",
  "bank_info": { "bank":"", "cbu":"", "alias":"" },
  "notes": "…",
  "active": true
}
```

### 2.5 `customers_finance` (puede reutilizar `crm_contacts` con flag)
**Recomendación:** reutilizar `crm_contacts` existente agregando campos `tax_id`, `tax_id_type`, `billing_address`, `is_customer` para evitar duplicación. Si se separa, mismo shape que suppliers.

### 2.6 `incomes` (Ingresos — registros contables)
Operación que **afecta flujo de caja** cuando está en estado `paid`.
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "business_unit_id": "uuid",
  "category_id": "uuid",
  "customer_id": "uuid|null",        // contacto CRM
  "invoice_id": "uuid|null",         // si proviene de una factura
  "date": "2026-02-15",              // fecha del hecho económico (YYYY-MM-DD)
  "due_date": "2026-03-15",
  "description": "Consultoría Enero",
  "amount_cents": 5000000,           // 50.000,00
  "currency": "ARS",
  "fx_rate_snapshot": 1.0,           // al default
  "tax_cents": 1050000,              // IVA calculado
  "tax_rate_id": "uuid",
  "total_cents": 6050000,            // amount + tax
  "status": "pending",               // pending | paid | partial | cancelled
  "payment_method": null,            // transfer | cash | card | mercado_pago | other
  "bank_account_id": "uuid|null",
  "paid_at": null,
  "paid_amount_cents": 0,
  "attachments": ["url1"],           // adjuntos (ver sección 5)
  "tags": ["recurrente"],
  "recurrence": {                    // opcional
    "enabled": false,
    "frequency": "monthly",          // monthly|weekly|yearly
    "interval": 1,
    "end_date": null
  }
}
```

### 2.7 `expenses` (Egresos) y `costs` (Costos directos / COGS)
Mismo shape que `incomes` pero con `supplier_id` en lugar de `customer_id`.
**Diferencia Expense vs Cost:**
- **Cost**: directamente atribuible a la producción/servicio (materia prima, horas subcontratadas). Entra en cálculo de margen bruto.
- **Expense**: gasto operativo (alquiler, sueldos no directos, marketing, software). Entra en gastos operativos.
- Campo `type` = `"expense" | "cost"` puede unificarlas en una sola colección `expenses` con flag.

**Recomendado:** una única colección `expenses` con campo `type: "expense"|"cost"` para simplificar queries.

### 2.8 `bank_accounts` (Cuentas / Billeteras)
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "name": "Banco Galicia ARS",
  "type": "bank",                    // bank | cash | wallet | card
  "currency": "ARS",
  "opening_balance_cents": 0,
  "account_number": "…",
  "cbu": "…", "alias": "…",
  "active": true,
  "color": "#1D4ED8"
}
```

### 2.9 `cash_movements` (Movimientos de caja)
Tabla **derivada**: cada `income.paid` o `expense.paid` genera un movimiento. También se usa para transferencias entre cuentas.
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "date": "2026-02-15",
  "bank_account_id": "uuid",
  "direction": "in",                 // in | out | transfer
  "amount_cents": 5000000,
  "currency": "ARS",
  "source_type": "income",           // income | expense | transfer | manual
  "source_id": "uuid|null",
  "description": "Cobro FAC-000123",
  "counterpart_account_id": "uuid|null"  // para transferencias
}
```

### 2.10 `invoices` (Facturación — opcional fase 2)
Emisión de comprobantes al cliente (puede ser ProForma/Presupuesto o Factura legal).
```json
{
  "id": "uuid", "tenant_id": "uuid",
  "number": "FAC-000123",
  "type": "invoice",                 // quote | invoice | credit_note
  "status": "draft",                 // draft | sent | paid | overdue | cancelled
  "customer_id": "uuid",
  "issue_date": "2026-02-15",
  "due_date": "2026-03-15",
  "items": [
    { "description":"", "quantity":1, "unit_price_cents":5000000, "tax_rate_id":"uuid", "discount_percent":0, "subtotal_cents":5000000 }
  ],
  "subtotal_cents": 5000000,
  "tax_cents": 1050000,
  "discount_cents": 0,
  "total_cents": 6050000,
  "currency": "ARS",
  "notes": "…",
  "pdf_url": null,
  "sent_at": null, "paid_at": null
}
```
Al marcar `paid` → crea `income` automático con `invoice_id` linkeado.

### 2.11 `budgets` (Presupuestos proyectados — fase 2)
Presupuesto mensual/anual por categoría para comparar real vs presupuestado.
```json
{
  "id":"uuid","tenant_id":"uuid",
  "period":"2026-02",               // YYYY-MM o YYYY
  "business_unit_id":"uuid|null",
  "category_id":"uuid",
  "planned_cents": 10000000,
  "notes":""
}
```

---

## 3. Endpoints REST (FastAPI)

Todos bajo `/api/finance/*`. Todos requieren JWT, aplican RBAC y filtran por `tenant_id` del usuario.

### 3.1 Settings
| Método | Ruta | Rol mínimo | Descripción |
|---|---|---|---|
| GET | `/api/finance/settings` | viewer | Obtiene config + tax_rates + monedas |
| PUT | `/api/finance/settings` | tenant_admin | Actualiza moneda, FX, IVA, numeración |

### 3.2 Business Units
| GET | `/api/finance/business-units` | viewer |
| POST | `/api/finance/business-units` | operator |
| PUT | `/api/finance/business-units/{id}` | operator |
| DELETE | `/api/finance/business-units/{id}` | tenant_admin |

### 3.3 Categories
CRUD estándar en `/api/finance/categories` con query `?kind=income|expense|cost`.

### 3.4 Suppliers
CRUD en `/api/finance/suppliers` con búsqueda `?q=` y paginación `?page=&limit=`.

### 3.5 Incomes / Expenses
Para cada uno: `/api/finance/incomes` y `/api/finance/expenses`.
- `GET /` con filtros: `?from=&to=&status=&category_id=&business_unit_id=&supplier_id=&customer_id=&type=&q=&page=&limit=`
- `POST /` crear
- `PUT /{id}` editar
- `DELETE /{id}` (tenant_admin)
- `POST /{id}/pay` → marca como pagado, crea `cash_movement`, actualiza `status`
  - Body: `{ bank_account_id, paid_at, paid_amount_cents, payment_method }`
- `POST /{id}/cancel` → `status=cancelled`, revierte cash_movement si aplica

### 3.6 Bank Accounts
CRUD en `/api/finance/bank-accounts`.
- `GET /{id}/balance` → calcula saldo = opening_balance + Σ(cash_movements) con filtro fecha opcional.

### 3.7 Cash Movements
- `GET /api/finance/cash-movements` con filtros fecha/cuenta/dirección.
- `POST /api/finance/cash-movements/transfer` → crea 2 movimientos atómicos (out + in) entre dos cuentas.
- `POST /api/finance/cash-movements/manual` → ajuste manual (solo tenant_admin).

### 3.8 Invoices (fase 2)
CRUD + `POST /{id}/send` (usa Resend) + `POST /{id}/mark-paid` + `GET /{id}/pdf`.
Numeración atómica: usar `find_one_and_update` con `$inc` sobre `finance_settings.invoice_numbering.next_number`.

### 3.9 Budgets (fase 2)
CRUD + `GET /api/finance/budgets/compare?period=2026-02` → real vs presupuestado.

### 3.10 Reportes / Dashboards (read-only, viewer OK)
| GET | `/api/finance/reports/cashflow` | `?from=&to=&bank_account_id=&granularity=day\|week\|month` → serie temporal in/out/net |
| GET | `/api/finance/reports/pnl` | P&L: ingresos - costos (margen bruto) - egresos = resultado |
| GET | `/api/finance/reports/by-category` | `?kind=&from=&to=` → ranking |
| GET | `/api/finance/reports/by-business-unit` | comparativa entre unidades |
| GET | `/api/finance/reports/accounts-receivable` | cuentas a cobrar (incomes pending) |
| GET | `/api/finance/reports/accounts-payable` | cuentas a pagar (expenses pending) |
| GET | `/api/finance/reports/dashboard-summary` | KPIs del mes: ingresos, egresos, neto, por cobrar, por pagar, saldo total |
| GET | `/api/finance/reports/top-customers` | top N clientes por facturación |
| GET | `/api/finance/reports/top-suppliers` | top N proveedores por gasto |

Todos los reportes deben soportar **multi-moneda** convirtiendo a `default_currency` via `fx_rates`.

### 3.11 Importación/Exportación
- `POST /api/finance/import/csv` → expenses/incomes desde CSV (con mapeo de columnas).
- `GET /api/finance/export/csv?type=incomes&from=&to=` → export CSV/Excel.
- `GET /api/finance/export/pdf?report=pnl&from=&to=` → PDF con branding del tenant.

---

## 4. Páginas / Pantallas Frontend

Estructura en `/app/frontend/src/pages/finance/`:

### 4.1 `FinanceDashboardPage.jsx` — `/finance`
- 4 KPI cards arriba: Ingresos mes, Egresos mes, Neto mes, Saldo total (suma cuentas).
- Gráfico de **Cashflow** (line/area) últimos 12 meses (recharts).
- Gráfico de **Ingresos por categoría** (donut).
- Gráfico de **Egresos por categoría** (donut).
- Tabla "Próximos vencimientos" (próximos 30 días: a cobrar y a pagar).
- Selector global: Rango fechas + Unidad de Negocio.

### 4.2 `IncomesPage.jsx` — `/finance/incomes`
- Tabla con filtros: fecha, estado (pending/paid/overdue/cancelled), categoría, cliente, BU.
- Botón "+ Nuevo ingreso" → modal/drawer con form.
- Acciones por fila: Ver, Editar, **Marcar pagado** (modal selecciona cuenta destino), Cancelar, Eliminar (admin).
- Badges coloreados por estado.
- Totalizadores al pie: total filtrado, total pendiente, total pagado.

### 4.3 `ExpensesPage.jsx` — `/finance/expenses`
Igual a Incomes pero con proveedores y toggle tipo `expense|cost`.

### 4.4 `SuppliersPage.jsx` — `/finance/suppliers`
CRUD tabla + drawer de detalle. Al entrar a proveedor: historial de egresos + total gastado YTD.

### 4.5 `BankAccountsPage.jsx` — `/finance/accounts`
Lista de cuentas con saldo actual. Click → detalle con libro de movimientos filtrable, botón "Transferir", botón "Ajuste manual".

### 4.6 `CashflowPage.jsx` — `/finance/cashflow`
Reporte dedicado de flujo de caja: tabla mes a mes con columnas Ingresos / Egresos / Neto / Acumulado. Export CSV/PDF.

### 4.7 `PnlPage.jsx` — `/finance/pnl`
Estado de Resultados: Ingresos → (Costos) → Margen bruto → (Egresos) → Resultado neto. Con %. Comparativa período anterior.

### 4.8 `BusinessUnitsPage.jsx` — `/finance/business-units`
CRUD simple.

### 4.9 `CategoriesPage.jsx` — `/finance/categories`
Árbol jerárquico con drag-drop opcional.

### 4.10 `FinanceSettingsPage.jsx` — `/finance/settings`
Moneda default, FX rates (editables manualmente, fase 2 auto-fetch), tasas de impuestos, numeración de facturas.

### 4.11 `InvoicesPage.jsx` — `/finance/invoices` (fase 2)
Listado + editor de factura (items, totales, preview PDF, enviar por email vía Resend).

### 4.12 `BudgetsPage.jsx` — `/finance/budgets` (fase 2)
Grid: categorías × meses, input de monto planificado, comparación real vs plan con semáforo.

---

## 5. Adjuntos (facturas escaneadas, recibos)
- Endpoint `POST /api/finance/attachments` multipart.
- Almacenar en GridFS de Mongo o en disco `/app/uploads/finance/{tenant_id}/` con UUID.
- Validar tipo: PDF, JPG, PNG, WEBP. Máx 10 MB.
- Referenciar URL en `incomes.attachments` / `expenses.attachments`.

---

## 6. Seguridad y validaciones críticas

1. **Siempre** filtrar por `tenant_id` del JWT. No confiar en `tenant_id` del body.
2. RBAC estricto:
   - `viewer`: GET only.
   - `operator`: GET + POST + PUT (no DELETE, no cambios en settings).
   - `tenant_admin`: todo dentro de su tenant.
   - `super_admin`: acceso cross-tenant solo vía endpoints `/admin/*`.
3. **Integridad**: no permitir eliminar una categoría si tiene ingresos/egresos asociados (soft-delete `active=false`).
4. **No borrar** `cash_movements` directamente. Solo se revierten al cancelar el income/expense padre.
5. Validar monedas: si el movimiento es en moneda distinta al default, guardar `fx_rate_snapshot` al momento del hecho.
6. Concurrencia en numeración de facturas: `find_one_and_update` atómico con `$inc`.
7. Sanitizar CSV al importar (límite de filas: 5000 por archivo).
8. Logs de auditoría: tabla `finance_audit_log` con quién cambió qué (opcional fase 2).

---

## 7. Cálculos clave

```
Saldo cuenta = opening_balance + Σ(movements.in) - Σ(movements.out)
Ingreso neto = total_cents - tax_cents (si IVA no incluido) ó total_cents (si incluido)
Margen bruto % = (Ingresos - Costos) / Ingresos * 100
Resultado neto = Ingresos - Costos - Egresos operativos
Días de cobranza (DSO) = Σ(días entre issue_date y paid_at) / N facturas pagadas
```

Todo en `default_currency` aplicando `fx_rate_snapshot` de cada documento (NO re-convertir con FX actual para no distorsionar el pasado).

---

## 8. Fases de implementación sugeridas

**Fase 1 — MVP (2-3 semanas dev)**
- Settings, BusinessUnits, Categories, Suppliers
- Incomes + Expenses (CRUD + marcar pagado)
- BankAccounts + CashMovements automáticos
- Dashboard con KPIs + Cashflow + P&L
- Export CSV

**Fase 2 — Facturación y Automatizaciones (2-3 semanas)**
- Invoices (CRUD + PDF + envío Resend)
- Quotes (Presupuestos) convertibles a Invoice
- Budgets + comparación real vs plan
- Recurrencia automática (cron diario que genera ingresos/egresos recurrentes)
- Import CSV

**Fase 3 — Avanzado (opcional)**
- Conciliación bancaria (import extracto bancario y match con movements)
- Multi-moneda con FX auto desde API
- Credit Notes
- Integración AFIP (Argentina) u otro ente fiscal
- Reportes a medida + IA para predecir cashflow

---

## 9. Testing

- Crear `/app/backend/tests/test_finance.py` con pytest para:
  - CRUD completo de cada entidad con RBAC (viewer rechazado en POST, operator rechazado en DELETE).
  - Consistencia: al marcar ingreso pagado, saldo de cuenta sube exacto.
  - Cancelar ingreso pagado revierte movement.
  - Multi-tenant: usuario de tenant A no ve nada de tenant B.
  - Numeración de facturas atómica bajo concurrencia.
- Usar `testing_agent_v3_fork` después de cada fase para validar frontend + backend.

---

## 10. UX / UI — guías finales

- Paleta: usar variables CSS ya presentes (`--primary`, `--accent`, `--destructive`).
- Montos: siempre alineados a la derecha, formato local, verde para ingresos, rojo para egresos.
- Filtros de fecha: componente `DateRangePicker` de Shadcn ya disponible.
- Tablas: usar `@tanstack/react-table` con paginación server-side cuando >100 rows.
- Loading: skeletons, no spinners.
- Empty states: ilustración + CTA "Crear primer ingreso".
- Toasts `sonner` para cada acción (crear/editar/marcar pagado/error).
- Accesibilidad: todos los inputs con `aria-label`, todos los botones con `data-testid`.

---

## 11. Dependencias sugeridas (ya instaladas o a instalar)

- Frontend: `recharts` (gráficos), `date-fns`, `@tanstack/react-table`, `react-hook-form` + `zod` (validación), `jspdf` + `jspdf-autotable` (PDFs cliente-side fase 2).
- Backend: `pandas` (reportes CSV), `reportlab` o `weasyprint` (PDF server-side), `python-dateutil` (recurrencia).

---

## 12. Puntos donde pedir aclaración al usuario antes de empezar

1. **Régimen fiscal**: ¿sólo Argentina o multi-país desde día 1? (afecta IVA, numeración, CUIT/RFC/RUT).
2. **¿Facturación legal (AFIP/SII) o solo interna?** Si es legal, es un capítulo aparte (webservices fiscales).
3. **¿Multi-moneda obligatorio en MVP o fase 2?**
4. **¿Importación desde extracto bancario en MVP?** (alto esfuerzo).
5. **¿Reportes exportables en PDF con branding del tenant o solo CSV en MVP?**
6. **¿Recurrencia automática (suscripciones) en MVP?** Requiere cron/scheduler (APScheduler o worker n8n).
7. **Permisos granulares**: ¿basta el RBAC actual de 4 roles o se necesita un rol "contador" con permisos específicos?

---

## 13. Resumen ejecutivo para el desarrollador

> Spectra Finance es un mini-ERP financiero multi-tenant. Las 3 entidades centrales son **Incomes**, **Expenses** y **BankAccounts**, conectadas por **CashMovements** automáticos. Todo lo demás (Suppliers, Categories, BusinessUnits, Invoices, Budgets, Reports) orbita alrededor. La clave de calidad está en: (1) **atomicidad** al pagar/cancelar, (2) **multi-tenant estricto**, (3) **dashboards útiles** desde el día 1, y (4) **no romper** el `server.py` monolítico existente — idealmente este módulo se crea ya como un **router separado** (`/app/backend/routes/finance.py`) y se incluye en `server.py` con `api_router.include_router(finance_router)`. Esto además empuja el refactor pendiente del backend sin romper lo existente.

**Fin del documento.**
