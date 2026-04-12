import { createContext, useContext, useState } from 'react';

const translations = {
  en: {
    dashboard: "Dashboard", prospect_finder: "Prospect Finder", jobs: "Jobs", leads: "Leads",
    campaigns: "Campaigns", templates: "Templates", domains: "Domains", crm_sync: "CRM Sync",
    analytics: "Analytics", settings: "Settings", search_prospects: "Search Prospects",
    province: "Province", city: "City / Locality", category: "Industry / Category",
    quantity: "Target Quantity", filters: "Optional Filters", start_job: "Launch Job",
    recent_jobs: "Recent Jobs", job_progress: "Job Progress", raw_leads: "Raw Leads",
    qualified_leads: "Qualified Leads", emails_sent: "Emails Sent", opens: "Opens",
    clicks: "Clicks", replies: "Replies", interested: "Interested", sent_to_crm: "Sent to CRM",
    opportunities: "Opportunities", active_campaigns: "Active Campaigns", recent_activity: "Recent Activity",
    business_name: "Business Name", score: "AI Score", status: "Status", actions: "Actions",
    approve: "Approve", reject: "Reject", send_to_sequence: "Send to Sequence",
    send_to_crm_action: "Send to CRM", view_details: "View Details", export: "Export",
    bulk_actions: "Bulk Actions", approve_selected: "Approve Selected",
    reject_selected: "Reject Selected", create_campaign: "Create Campaign",
    campaign_name: "Campaign Name", template: "Template", sender: "Sender",
    draft: "Draft", active: "Active", paused: "Paused", completed: "Completed",
    template_name: "Template Name", subject: "Subject", body: "Body",
    variables: "Variables", save: "Save", cancel: "Cancel", delete: "Delete",
    domain_setup: "Domain Setup", verification_status: "Verification Status",
    sender_identity: "Sender Identity", sender_name: "Sender Name", sender_email: "Sender Email",
    reply_to: "Reply-to", signature: "Signature", verify: "Verify Domain",
    sync_logs: "Sync Logs", push_to_crm: "Push to CRM", retry: "Retry",
    branding: "Branding", company_name: "Company Name", logo: "Logo",
    primary_color: "Primary Color", secondary_color: "Secondary Color",
    user_management: "User Management", integrations: "Integrations",
    login: "Login", register: "Register", email: "Email", password: "Password",
    name: "Full Name", organization: "Organization Name", welcome_back: "Welcome back",
    sign_in_continue: "Sign in to continue to Spectra Flow",
    create_account: "Create your account", no_account: "Don't have an account?",
    have_account: "Already have an account?", sign_up: "Sign Up",
    jobs_this_month: "Jobs This Month", total_leads: "Total Leads",
    qualification_rate: "Qualification Rate", approval_rate: "Approval Rate",
    searching: "Searching prospects in", prospects_found: "prospects found",
    cleaning_scoring: "Cleaning and scoring leads with AI...",
    leads_ready: "qualified leads ready for review",
    lead_details: "Lead Details", quality_level: "Quality Level",
    recommendation: "Recommendation", first_line: "Recommended First Line",
    event_history: "Event History", phone: "Phone", website: "Website",
    normalized_category: "Normalized Category", raw_category: "Raw Category",
    processing: "Processing", pending: "Pending", search: "Search...",
    create: "Create", edit: "Edit", close: "Close",
  },
  es: {
    dashboard: "Panel Principal", prospect_finder: "Buscador de Prospectos", jobs: "Trabajos",
    leads: "Leads", campaigns: "Campanas", templates: "Plantillas", domains: "Dominios",
    crm_sync: "Sincronizacion CRM", analytics: "Analisis", settings: "Configuracion",
    search_prospects: "Buscar Prospectos", province: "Provincia", city: "Ciudad / Localidad",
    category: "Industria / Categoria", quantity: "Cantidad Objetivo",
    filters: "Filtros Opcionales", start_job: "Iniciar Busqueda",
    recent_jobs: "Trabajos Recientes", job_progress: "Progreso del Trabajo",
    raw_leads: "Leads Sin Procesar", qualified_leads: "Leads Calificados",
    emails_sent: "Emails Enviados", opens: "Aperturas", clicks: "Clics",
    replies: "Respuestas", interested: "Interesados", sent_to_crm: "Enviados al CRM",
    opportunities: "Oportunidades", active_campaigns: "Campanas Activas",
    recent_activity: "Actividad Reciente", business_name: "Nombre del Negocio",
    score: "Puntaje IA", status: "Estado", actions: "Acciones",
    approve: "Aprobar", reject: "Rechazar", send_to_sequence: "Enviar a Secuencia",
    send_to_crm_action: "Enviar al CRM", view_details: "Ver Detalles",
    export: "Exportar", bulk_actions: "Acciones Masivas",
    approve_selected: "Aprobar Seleccionados", reject_selected: "Rechazar Seleccionados",
    create_campaign: "Crear Campana", campaign_name: "Nombre de Campana",
    template: "Plantilla", sender: "Remitente", draft: "Borrador",
    active: "Activa", paused: "Pausada", completed: "Completada",
    template_name: "Nombre de Plantilla", subject: "Asunto", body: "Cuerpo",
    variables: "Variables", save: "Guardar", cancel: "Cancelar", delete: "Eliminar",
    domain_setup: "Configuracion de Dominio", verification_status: "Estado de Verificacion",
    sender_identity: "Identidad del Remitente", sender_name: "Nombre del Remitente",
    sender_email: "Email del Remitente", reply_to: "Responder a", signature: "Firma",
    verify: "Verificar Dominio", sync_logs: "Registros de Sincronizacion",
    push_to_crm: "Enviar al CRM", retry: "Reintentar",
    branding: "Marca", company_name: "Nombre de Empresa", logo: "Logo",
    primary_color: "Color Primario", secondary_color: "Color Secundario",
    user_management: "Gestion de Usuarios", integrations: "Integraciones",
    login: "Iniciar Sesion", register: "Registrarse", email: "Email",
    password: "Contrasena", name: "Nombre Completo", organization: "Nombre de Organizacion",
    welcome_back: "Bienvenido de nuevo", sign_in_continue: "Inicia sesion para continuar en Spectra Flow",
    create_account: "Crea tu cuenta", no_account: "No tienes cuenta?",
    have_account: "Ya tienes cuenta?", sign_up: "Registrarse",
    jobs_this_month: "Trabajos del Mes", total_leads: "Total de Leads",
    qualification_rate: "Tasa de Calificacion", approval_rate: "Tasa de Aprobacion",
    searching: "Buscando prospectos en", prospects_found: "prospectos encontrados",
    cleaning_scoring: "Limpiando y calificando leads con IA...",
    leads_ready: "leads calificados listos para revision",
    lead_details: "Detalles del Lead", quality_level: "Nivel de Calidad",
    recommendation: "Recomendacion", first_line: "Primera Linea Recomendada",
    event_history: "Historial de Eventos", phone: "Telefono", website: "Sitio Web",
    normalized_category: "Categoria Normalizada", raw_category: "Categoria Original",
    processing: "Procesando", pending: "Pendiente", search: "Buscar...",
    create: "Crear", edit: "Editar", close: "Cerrar",
  }
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');
  const t = (key) => translations[lang]?.[key] || translations.en[key] || key;
  const toggleLang = () => setLang(l => l === 'en' ? 'es' : 'en');

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, toggleLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
