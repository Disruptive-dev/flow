import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import { COUNTRIES, flagOf } from '@/lib/countries';
import {
  Zap, Search, Mail, Users, BarChart3, RefreshCw, Brain, Bot, WandSparkles,
  ArrowRight, CheckCircle2, Phone, MapPin, Calendar, TrendingUp, Award, Building2,
  Sparkles, Target, Globe, ShieldCheck, Loader2, Sun, Moon, Languages
} from 'lucide-react';

const CALENDAR_URL = 'https://calendar.app.google/2Bz86vszPTXJiznu5';
const PHONE_DISPLAY = '+54 381 4483390';
const PHONE_TEL = '+543814483390';

const I18N = {
  es: {
    nav_products: 'Productos', nav_metrics: 'Métricas', nav_contact: 'Contacto',
    nav_login: 'Ingresar', nav_cta: 'Probar Gratis',
    hero_badge: 'Líderes en Growth OS para PyMEs y agencias en LATAM',
    hero_title_1: 'Encuentra. Clasifica.', hero_title_2: 'Activa. Convierte.',
    hero_desc: 'Spectra Flow es la plataforma todo-en-uno que prospecta, califica con IA, automatiza tus campañas de email y cierra más negocios desde un solo lugar.',
    hero_cta_primary: 'Probar Gratis 15 días', hero_cta_meeting: 'Agendar reunión',
    badge_no_card: 'Sin tarjeta', badge_setup: 'Setup en 5 min', badge_support: 'Soporte en español',
    metrics_kicker: 'Números que respaldan', metrics_title: 'Líderes del mercado en LATAM',
    metric_leads: 'Leads procesados', metric_conv: 'Conversión promedio',
    metric_companies: 'Empresas activas', metric_sat: 'Satisfacción clientes',
    products_kicker: 'Todo en una plataforma',
    products_title: 'El Growth OS que tu empresa estaba esperando',
    products_desc: '8 módulos integrados que cubren todo el ciclo comercial: desde encontrar al lead hasta cerrarlo y fidelizarlo.',
    p1: { title: 'Spectra Prospección', desc: 'Busca empresas en Google Maps y LinkedIn con IA. Califica leads automáticamente.' },
    p2: { title: 'Leads Hub', desc: 'Centro unificado con 19 fuentes (Bot, Forms, Meta Ads, Referidos, etc).' },
    p3: { title: 'Email Marketing', desc: 'Plantillas, listas, segmentos y campañas estilo Brevo. Envío con dominio propio.' },
    p4: { title: 'Spectra CRM', desc: 'Pipeline visual editable. Tareas, notas, productos, presupuestos y facturación.' },
    p5: { title: 'Spectra Performance', desc: 'Meta Ads, Google Ads, TikTok, SEO y GEO en un solo dashboard. (Pronto)' },
    p6: { title: 'Spectra Finance', desc: 'Control financiero, caja, rentabilidad y punto de equilibrio. (Pronto)' },
    eco_kicker: 'Ecosistema', eco_title: 'Conectado con toda la suite Spectra',
    contact_kicker: 'Contacto', contact_title_a: 'Hablemos de tu', contact_title_b: 'crecimiento',
    contact_desc: 'Completá el formulario o agendá una reunión directa con nuestro equipo. Te respondemos en menos de 24h.',
    schedule_title: 'Agendar reunión', schedule_sub: '30 minutos · Sin compromiso',
    label_phone: 'Teléfono', label_email: 'Email', label_office: 'Oficina',
    form_title: 'Solicitar demo', form_required: 'Campos con * son obligatorios',
    f_name: 'Nombre completo', f_email: 'Email', f_dial: 'Código', f_whatsapp: 'WhatsApp',
    f_country: 'País', f_city: 'Ciudad', f_company: 'Empresa', f_industry: 'Rubro',
    f_industry_ph: 'Ej: Software, Retail', f_employees: 'Cantidad de empleados',
    f_employees_ph: 'Seleccionar...', f_notes: 'Notas',
    f_notes_ph: 'Contanos brevemente qué necesitás', f_submit: 'Enviar solicitud',
    f_sending: 'Enviando...', f_legal: 'Al enviar aceptas que te contactemos al email/teléfono indicados.',
    sent_title: 'Mensaje enviado', sent_desc: 'Te contactaremos en menos de 24h al email que dejaste.',
    sent_again: 'Enviar otro',
    err_required: 'Nombre, email y teléfono son obligatorios',
    err_send: 'Error al enviar. Probá de nuevo o llamanos.',
    ok_send: 'Mensaje enviado. Te contactaremos en breve.',
    footer_safe: 'Datos seguros',
  },
  en: {
    nav_products: 'Products', nav_metrics: 'Metrics', nav_contact: 'Contact',
    nav_login: 'Sign in', nav_cta: 'Try Free',
    hero_badge: 'Leading Growth OS for SMBs and agencies in LATAM',
    hero_title_1: 'Find. Classify.', hero_title_2: 'Activate. Convert.',
    hero_desc: 'Spectra Flow is the all-in-one platform that prospects, qualifies with AI, automates your email campaigns and closes more deals from a single place.',
    hero_cta_primary: 'Free 15-day Trial', hero_cta_meeting: 'Book a meeting',
    badge_no_card: 'No credit card', badge_setup: '5-min setup', badge_support: 'Support in Spanish',
    metrics_kicker: 'Numbers that back us', metrics_title: 'Market leaders in LATAM',
    metric_leads: 'Leads processed', metric_conv: 'Average conversion',
    metric_companies: 'Active companies', metric_sat: 'Customer satisfaction',
    products_kicker: 'Everything on one platform',
    products_title: 'The Growth OS your business was waiting for',
    products_desc: '8 integrated modules covering the full commercial cycle: from finding leads to closing and retention.',
    p1: { title: 'Spectra Prospecting', desc: 'Find companies on Google Maps and LinkedIn with AI. Auto-qualify leads.' },
    p2: { title: 'Leads Hub', desc: 'Unified center with 19 sources (Bot, Forms, Meta Ads, Referrals, etc).' },
    p3: { title: 'Email Marketing', desc: 'Templates, lists, segments and Brevo-style campaigns. Send with your own domain.' },
    p4: { title: 'Spectra CRM', desc: 'Editable visual pipeline. Tasks, notes, products, quotes and invoicing.' },
    p5: { title: 'Spectra Performance', desc: 'Meta Ads, Google Ads, TikTok, SEO & GEO in a single dashboard. (Soon)' },
    p6: { title: 'Spectra Finance', desc: 'Financial control, cashflow, profitability and break-even. (Soon)' },
    eco_kicker: 'Ecosystem', eco_title: 'Connected with the full Spectra suite',
    contact_kicker: 'Contact', contact_title_a: "Let's talk about your", contact_title_b: 'growth',
    contact_desc: 'Fill in the form or book a meeting directly with our team. We reply within 24h.',
    schedule_title: 'Book a meeting', schedule_sub: '30 minutes · No commitment',
    label_phone: 'Phone', label_email: 'Email', label_office: 'Office',
    form_title: 'Request demo', form_required: 'Fields with * are required',
    f_name: 'Full name', f_email: 'Email', f_dial: 'Code', f_whatsapp: 'WhatsApp',
    f_country: 'Country', f_city: 'City', f_company: 'Company', f_industry: 'Industry',
    f_industry_ph: 'E.g.: Software, Retail', f_employees: 'Company size',
    f_employees_ph: 'Select...', f_notes: 'Notes',
    f_notes_ph: 'Briefly tell us what you need', f_submit: 'Send request',
    f_sending: 'Sending...', f_legal: 'By sending you accept being contacted at the provided email/phone.',
    sent_title: 'Message sent', sent_desc: "We'll contact you within 24h at the email you left.",
    sent_again: 'Send another',
    err_required: 'Name, email and phone are required',
    err_send: 'Failed to send. Try again or call us.',
    ok_send: 'Message sent. We will contact you shortly.',
    footer_safe: 'Secure data',
  },
};

export default function LandingPage() {
  // --- THEME & LANG ---
  const [theme, setTheme] = useState(() => localStorage.getItem('landing_theme') || 'dark');
  const [lang, setLang] = useState(() => localStorage.getItem('landing_lang') || 'es');
  const t = I18N[lang];

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    localStorage.setItem('landing_theme', theme);
  }, [theme]);

  useEffect(() => { localStorage.setItem('landing_lang', lang); }, [lang]);

  // --- COUNTRIES SORTED BY CURRENT LANG ---
  const sortedCountries = useMemo(
    () => [...COUNTRIES].sort((a, b) => a[lang].localeCompare(b[lang], lang)),
    [lang]
  );

  // --- FORM STATE ---
  const [form, setForm] = useState({
    name: '', email: '', phoneCountry: 'AR', phone: '',
    country: 'AR', city: '', company: '', industry: '', employees: '', notes: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const dialCode = useMemo(
    () => COUNTRIES.find(c => c.c === form.phoneCountry)?.d || '+54',
    [form.phoneCountry]
  );
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // When phone country changes, auto-update country selector
  const onPhoneCountryChange = (iso) => {
    setForm(p => ({ ...p, phoneCountry: iso, country: iso }));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error(t.err_required);
      return;
    }
    setSubmitting(true);
    try {
      const country = COUNTRIES.find(c => c.c === form.country);
      await api.post('/public/contact', {
        name: form.name, email: form.email,
        phone: `${dialCode} ${form.phone}`,
        company: form.company, industry: form.industry, employees: form.employees,
        country: country ? country[lang] : form.country,
        city: form.city, notes: form.notes,
      });
      setSent(true);
      toast.success(t.ok_send);
    } catch {
      toast.error(t.err_send);
    }
    setSubmitting(false);
  };

  // --- TAILWIND TOKENS (light vs dark via dark: variants) ---
  const inputCls = "bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white mt-1.5";
  const selectCls = "w-full h-10 mt-1.5 rounded-md bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 text-zinc-900 dark:text-white px-3 text-sm";

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white overflow-x-hidden transition-colors" data-testid="landing-page">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-semibold">Spectra Flow</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
            <a href="#productos" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{t.nav_products}</a>
            <a href="#metricas" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{t.nav_metrics}</a>
            <a href="#contacto" className="hover:text-zinc-900 dark:hover:text-white transition-colors">{t.nav_contact}</a>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="h-9 px-3 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              data-testid="landing-lang-toggle" aria-label="Toggle language"
            >
              <Languages className="w-3.5 h-3.5" /> {lang.toUpperCase()}
            </button>
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-md border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
              data-testid="landing-theme-toggle" aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <Link to="/login"><Button variant="ghost" size="sm" className="text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" data-testid="landing-login-btn">{t.nav_login}</Button></Link>
            <a href="#contacto"><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="landing-cta-nav">{t.nav_cta}</Button></a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-20 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.18),transparent_50%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {t.hero_badge}
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-heading font-bold tracking-tight leading-[1.05]">
            {t.hero_title_1}
            <br />
            <span className="bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 bg-clip-text text-transparent">{t.hero_title_2}</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            {t.hero_desc}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <a href="#contacto"><Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-7 text-base shadow-lg shadow-blue-500/30" data-testid="landing-hero-cta-primary">
              {t.hero_cta_primary} <ArrowRight className="w-4 h-4" />
            </Button></a>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white gap-2 h-12 px-7 text-base" data-testid="landing-hero-cta-meeting">
                <Calendar className="w-4 h-4" /> {t.hero_cta_meeting}
              </Button>
            </a>
          </div>
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500 dark:text-zinc-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {t.badge_no_card}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {t.badge_setup}</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> {t.badge_support}</span>
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <section id="metricas" className="py-16 px-4 sm:px-8 border-y border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-2">{t.metrics_kicker}</p>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold">{t.metrics_title}</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: '2.5M+', label: t.metric_leads, icon: Target, color: 'text-blue-500 dark:text-blue-400' },
              { value: '40%', label: t.metric_conv, icon: TrendingUp, color: 'text-emerald-500 dark:text-emerald-400' },
              { value: '500+', label: t.metric_companies, icon: Building2, color: 'text-purple-500 dark:text-purple-400' },
              { value: '97%', label: t.metric_sat, icon: Award, color: 'text-amber-500 dark:text-amber-400' },
            ].map(({ value, label, icon: Icon, color }) => (
              <Card key={label} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl">
                <CardContent className="p-6 text-center space-y-2">
                  <Icon className={`w-7 h-7 ${color} mx-auto`} />
                  <p className={`text-3xl sm:text-4xl font-heading font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTOS */}
      <section id="productos" className="py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-2">{t.products_kicker}</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold leading-tight">{t.products_title}</h2>
            <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-2xl mx-auto">{t.products_desc}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Search, ...t.p1, iconBg: 'bg-blue-500/10 border-blue-500/30', iconColor: 'text-blue-500 dark:text-blue-400' },
              { icon: Users, ...t.p2, iconBg: 'bg-indigo-500/10 border-indigo-500/30', iconColor: 'text-indigo-500 dark:text-indigo-400' },
              { icon: Mail, ...t.p3, iconBg: 'bg-purple-500/10 border-purple-500/30', iconColor: 'text-purple-500 dark:text-purple-400' },
              { icon: RefreshCw, ...t.p4, iconBg: 'bg-emerald-500/10 border-emerald-500/30', iconColor: 'text-emerald-500 dark:text-emerald-400' },
              { icon: BarChart3, ...t.p5, iconBg: 'bg-red-500/10 border-red-500/30', iconColor: 'text-red-500 dark:text-red-400' },
              { icon: Sparkles, ...t.p6, iconBg: 'bg-amber-500/10 border-amber-500/30', iconColor: 'text-amber-500 dark:text-amber-400' },
            ].map(({ icon: Icon, title, desc, iconBg, iconColor }) => (
              <Card key={title} className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors rounded-2xl group">
                <CardContent className="p-6 space-y-3">
                  <div className={`w-11 h-11 rounded-xl ${iconBg} border flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 ${iconColor}`} />
                  </div>
                  <h3 className="font-heading font-semibold text-lg text-zinc-900 dark:text-white">{title}</h3>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSISTEMA */}
      <section className="py-20 px-4 sm:px-8 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/40">
        <div className="max-w-6xl mx-auto text-center space-y-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-2">{t.eco_kicker}</p>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold">{t.eco_title}</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {[
              { icon: Zap, label: 'Spectra Metrics', url: 'https://www.spectra-metrics.com', iconColor: 'text-rose-500 dark:text-rose-400', textColor: 'text-rose-600 dark:text-rose-400', hoverBorder: 'hover:border-rose-500/50' },
              { icon: Brain, label: 'Spectra Brain', url: 'https://brain.spectra-metrics.com', iconColor: 'text-pink-500 dark:text-pink-400', textColor: 'text-pink-600 dark:text-pink-400', hoverBorder: 'hover:border-pink-500/50' },
              { icon: WandSparkles, label: 'Content IA', url: 'https://content-ia.spectra-metrics.com', iconColor: 'text-purple-500 dark:text-purple-400', textColor: 'text-purple-600 dark:text-purple-400', hoverBorder: 'hover:border-purple-500/50' },
              { icon: Bot, label: 'OptimIA BOT', url: 'https://inbox.optimia.disruptive-sw.com', iconColor: 'text-emerald-500 dark:text-emerald-400', textColor: 'text-emerald-600 dark:text-emerald-400', hoverBorder: 'hover:border-emerald-500/50' },
            ].map(({ icon: Icon, label, url, iconColor, textColor, hoverBorder }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                className={`bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 ${hoverBorder} transition-all`}>
                <Icon className={`w-7 h-7 ${iconColor} mx-auto mb-2`} />
                <p className={`${textColor} font-semibold text-sm`}>{label}</p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section id="contacto" className="py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* INFO */}
          <div className="space-y-7">
            <div>
              <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-2">{t.contact_kicker}</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold leading-tight">
                {t.contact_title_a} <span className="text-blue-600 dark:text-blue-400">{t.contact_title_b}</span>
              </h2>
              <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-md">{t.contact_desc}</p>
            </div>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 rounded-2xl hover:scale-[1.01] transition-transform" data-testid="landing-calendar-cta">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Calendar className="w-6 h-6 text-white" /></div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-white text-lg">{t.schedule_title}</h3>
                    <p className="text-blue-100 text-sm">{t.schedule_sub}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white" />
                </CardContent>
              </Card>
            </a>
            <div className="space-y-4 text-sm">
              <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><Phone className="w-4 h-4 text-blue-500 dark:text-blue-400" /></div>
                <div><p className="text-xs text-zinc-500">{t.label_phone}</p><p>{PHONE_DISPLAY}</p></div>
              </a>
              <a href="mailto:info@spectra-metrics.com" className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-500 dark:text-blue-400" /></div>
                <div><p className="text-xs text-zinc-500">{t.label_email}</p><p>info@spectra-metrics.com</p></div>
              </a>
              <div className="flex items-center gap-3 text-zinc-700 dark:text-zinc-300">
                <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex items-center justify-center"><MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400" /></div>
                <div><p className="text-xs text-zinc-500">{t.label_office}</p><p>Hilton Cowork, Tucumán, Argentina</p></div>
              </div>
            </div>
          </div>

          {/* FORM */}
          <Card className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 rounded-2xl" data-testid="landing-form">
            <CardContent className="p-6 sm:p-8">
              {sent ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-heading font-semibold">{t.sent_title}</h3>
                  <p className="text-zinc-600 dark:text-zinc-400">{t.sent_desc}</p>
                  <Button onClick={() => { setSent(false); setForm({ name: '', email: '', phoneCountry: 'AR', phone: '', country: 'AR', city: '', company: '', industry: '', employees: '', notes: '' }); }} variant="outline" className="border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-900 dark:text-white">{t.sent_again}</Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h3 className="text-xl font-heading font-semibold mb-1">{t.form_title}</h3>
                  <p className="text-xs text-zinc-500 mb-4">{t.form_required}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Nombre */}
                    <div className="sm:col-span-2">
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_name} *</Label>
                      <Input value={form.name} onChange={e => update('name', e.target.value)} className={inputCls} required data-testid="landing-form-name" />
                    </div>
                    {/* Email */}
                    <div className="sm:col-span-2">
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_email} *</Label>
                      <Input type="email" value={form.email} onChange={e => update('email', e.target.value)} className={inputCls} required data-testid="landing-form-email" />
                    </div>
                    {/* Phone code + number */}
                    <div className="sm:col-span-2 grid grid-cols-[140px_1fr] gap-2">
                      <div>
                        <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_dial}</Label>
                        <select
                          value={form.phoneCountry}
                          onChange={e => onPhoneCountryChange(e.target.value)}
                          className={selectCls}
                          data-testid="landing-form-phone-code"
                        >
                          {sortedCountries.map(c => (
                            <option key={`d-${c.c}`} value={c.c}>{flagOf(c.c)} {c.c} {c.d}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_whatsapp} *</Label>
                        <Input
                          value={form.phone}
                          onChange={e => update('phone', e.target.value.replace(/[^\d\s-]/g, ''))}
                          className={inputCls}
                          placeholder={dialCode + ' ...'}
                          required
                          data-testid="landing-form-phone"
                        />
                      </div>
                    </div>
                    {/* Country + City */}
                    <div>
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_country}</Label>
                      <select
                        value={form.country}
                        onChange={e => update('country', e.target.value)}
                        className={selectCls}
                        data-testid="landing-form-country"
                      >
                        {sortedCountries.map(c => (
                          <option key={`c-${c.c}`} value={c.c}>{flagOf(c.c)} {c[lang]}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_city}</Label>
                      <Input value={form.city} onChange={e => update('city', e.target.value)} className={inputCls} data-testid="landing-form-city" />
                    </div>
                    {/* Company + Industry */}
                    <div>
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_company}</Label>
                      <Input value={form.company} onChange={e => update('company', e.target.value)} className={inputCls} data-testid="landing-form-company" />
                    </div>
                    <div>
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_industry}</Label>
                      <Input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder={t.f_industry_ph} className={inputCls} data-testid="landing-form-industry" />
                    </div>
                    {/* Employees */}
                    <div className="sm:col-span-2">
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_employees}</Label>
                      <select value={form.employees} onChange={e => update('employees', e.target.value)} className={selectCls} data-testid="landing-form-employees">
                        <option value="">{t.f_employees_ph}</option>
                        <option value="1-5">1-5</option><option value="6-20">6-20</option><option value="21-50">21-50</option><option value="51-200">51-200</option><option value="200+">200+</option>
                      </select>
                    </div>
                    {/* Notes */}
                    <div className="sm:col-span-2">
                      <Label className="text-zinc-700 dark:text-zinc-300 text-xs">{t.f_notes}</Label>
                      <Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder={t.f_notes_ph} rows={3} className={`${inputCls} resize-none`} data-testid="landing-form-notes" />
                    </div>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium gap-2" data-testid="landing-form-submit">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.f_sending}</> : <>{t.f_submit} <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                  <p className="text-[10px] text-zinc-500 text-center">{t.f_legal}</p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-10 px-4 sm:px-8 bg-white dark:bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
            <span>© 2026 Spectra Flow · Disruptive SW</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://www.spectra-metrics.com" target="_blank" rel="noopener noreferrer" className="hover:text-zinc-900 dark:hover:text-white transition-colors flex items-center gap-1.5"><Globe className="w-3 h-3" /> spectra-metrics.com</a>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> {t.footer_safe}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
