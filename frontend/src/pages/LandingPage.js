import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import api from '@/lib/api';
import {
  Zap, Search, Mail, Users, BarChart3, RefreshCw, Brain, Bot, WandSparkles,
  ArrowRight, CheckCircle2, Phone, MapPin, Calendar, TrendingUp, Award, Building2,
  Sparkles, Target, Globe, ShieldCheck, Loader2
} from 'lucide-react';

const CALENDAR_URL = 'https://calendar.app.google/2Bz86vszPTXJiznu5';
const PHONE = '+54 381 4483390';
const PHONE_TEL = '+543814483390';
const ADDRESS = 'Hilton Cowork, Tucumán, Argentina';

export default function LandingPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', company: '', industry: '', employees: '', country: 'Argentina', city: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast.error('Nombre, email y telefono son obligatorios');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/public/contact', form);
      setSent(true);
      toast.success('Mensaje enviado. Te contactaremos en breve.');
    } catch {
      toast.error('Error al enviar. Probá de nuevo o llamanos.');
    }
    setSubmitting(false);
  };

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  return (
    <div className="min-h-screen bg-zinc-950 text-white overflow-x-hidden" data-testid="landing-page">
      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-sm border-b border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-heading font-semibold">Spectra Flow</span>
          </div>
          <div className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <a href="#productos" className="hover:text-white transition-colors">Productos</a>
            <a href="#metricas" className="hover:text-white transition-colors">Metricas</a>
            <a href="#contacto" className="hover:text-white transition-colors">Contacto</a>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm" className="text-zinc-300 hover:text-white hover:bg-zinc-800" data-testid="landing-login-btn">Ingresar</Button></Link>
            <a href="#contacto"><Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="landing-cta-nav">Probar Gratis</Button></a>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-20 sm:pt-32 pb-16 sm:pb-24 px-4 sm:px-8">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(59,130,246,0.15),transparent_50%)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-1.5 text-xs text-zinc-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Lideres en Growth OS para PyMEs y agencias en LATAM
          </div>
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-heading font-bold tracking-tight leading-[1.05]">
            Encuentra. Limpia.
            <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Activa. Convierte.</span>
          </h1>
          <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Spectra Flow es la plataforma todo-en-uno que prospecta, califica con IA, automatiza tus campañas de email y cierra más negocios desde un solo lugar.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <a href="#contacto"><Button size="lg" className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-12 px-7 text-base shadow-lg shadow-blue-500/30" data-testid="landing-hero-cta-primary">
              Probar Gratis 15 dias <ArrowRight className="w-4 h-4" />
            </Button></a>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer">
              <Button size="lg" variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white gap-2 h-12 px-7 text-base" data-testid="landing-hero-cta-meeting">
                <Calendar className="w-4 h-4" /> Agendar reunion
              </Button>
            </a>
          </div>
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Sin tarjeta</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Setup en 5 min</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Soporte en español</span>
          </div>
        </div>
      </section>

      {/* MÉTRICAS */}
      <section id="metricas" className="py-16 px-4 sm:px-8 border-y border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">Numeros que respaldan</p>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold">Lideres del mercado en LATAM</h2>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: '2.5M+', label: 'Leads procesados', icon: Target, color: 'text-blue-400' },
              { value: '40%', label: 'Conversion promedio', icon: TrendingUp, color: 'text-emerald-400' },
              { value: '500+', label: 'Empresas activas', icon: Building2, color: 'text-purple-400' },
              { value: '97%', label: 'Satisfaccion clientes', icon: Award, color: 'text-amber-400' },
            ].map(({ value, label, icon: Icon, color }) => (
              <Card key={label} className="bg-zinc-900 border-zinc-800 rounded-2xl">
                <CardContent className="p-6 text-center space-y-2">
                  <Icon className={`w-7 h-7 ${color} mx-auto`} />
                  <p className={`text-3xl sm:text-4xl font-heading font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PRODUCTOS / FEATURES */}
      <section id="productos" className="py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">Todo en una plataforma</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold leading-tight">El Growth OS que tu empresa estaba esperando</h2>
            <p className="text-zinc-400 mt-4 max-w-2xl mx-auto">8 modulos integrados que cubren todo el ciclo comercial: desde encontrar al lead hasta cerrarlo y fidelizarlo.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: Search, title: 'Spectra Prospeccion', desc: 'Busca empresas en Google Maps y LinkedIn con IA. Califica leads automaticamente.', color: 'blue' },
              { icon: Users, title: 'Leads Hub', desc: 'Centro unificado con 19 fuentes (Bot, Forms, Meta Ads, Referidos, etc).', color: 'indigo' },
              { icon: Mail, title: 'Email Marketing', desc: 'Plantillas, listas, segmentos y campañas estilo Brevo. Envio con dominio propio.', color: 'purple' },
              { icon: RefreshCw, title: 'Spectra CRM', desc: 'Pipeline visual editable. Tareas, notas, productos, presupuestos y facturacion.', color: 'emerald' },
              { icon: BarChart3, title: 'Spectra Performance', desc: 'Meta Ads, Google Ads, TikTok, SEO y GEO en un solo dashboard. (Pronto)', color: 'red' },
              { icon: Sparkles, title: 'Spectra Finance', desc: 'Control financiero, caja, rentabilidad y punto de equilibrio. (Pronto)', color: 'amber' },
            ].map(({ icon: Icon, title, desc, color }) => (
              <Card key={title} className="bg-zinc-900 border-zinc-800 hover:border-zinc-700 transition-colors rounded-2xl group">
                <CardContent className="p-6 space-y-3">
                  <div className={`w-11 h-11 rounded-xl bg-${color}-500/10 border border-${color}-500/30 flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <Icon className={`w-5 h-5 text-${color}-400`} />
                  </div>
                  <h3 className="font-heading font-semibold text-lg">{title}</h3>
                  <p className="text-sm text-zinc-400 leading-relaxed">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ECOSISTEMA */}
      <section className="py-20 px-4 sm:px-8 border-t border-zinc-800 bg-zinc-900/40">
        <div className="max-w-6xl mx-auto text-center space-y-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">Ecosistema</p>
            <h2 className="text-3xl sm:text-4xl font-heading font-bold">Conectado con toda la suite Spectra</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 max-w-4xl mx-auto">
            {[
              { icon: Zap, label: 'Spectra Metrics', url: 'https://www.spectra-metrics.com', color: 'rose' },
              { icon: Brain, label: 'Spectra Brain', url: 'https://brain.spectra-metrics.com', color: 'pink' },
              { icon: WandSparkles, label: 'Content IA', url: 'https://content-ia.spectra-metrics.com', color: 'purple' },
              { icon: Bot, label: 'OptimIA BOT', url: 'https://inbox.optimia.disruptive-sw.com', color: 'emerald' },
            ].map(({ icon: Icon, label, url, color }) => (
              <a key={label} href={url} target="_blank" rel="noopener noreferrer"
                className={`bg-zinc-900 border border-zinc-800 rounded-xl p-4 sm:p-5 hover:border-${color}-500/50 hover:bg-zinc-900/60 transition-all`}>
                <Icon className={`w-7 h-7 text-${color}-400 mx-auto mb-2`} />
                <p className={`text-${color}-400 font-semibold text-sm`}>{label}</p>
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
              <p className="text-xs uppercase tracking-widest text-blue-400 font-semibold mb-2">Contacto</p>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold leading-tight">
                Hablemos de tu <span className="text-blue-400">crecimiento</span>
              </h2>
              <p className="text-zinc-400 mt-4 max-w-md">Completá el formulario o agendá una reunión directa con nuestro equipo. Te respondemos en menos de 24h.</p>
            </div>
            <a href={CALENDAR_URL} target="_blank" rel="noopener noreferrer" className="block">
              <Card className="bg-gradient-to-br from-blue-600 to-indigo-700 border-0 rounded-2xl hover:scale-[1.01] transition-transform" data-testid="landing-calendar-cta">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center"><Calendar className="w-6 h-6 text-white" /></div>
                  <div className="flex-1">
                    <h3 className="font-heading font-semibold text-white text-lg">Agendar reunion</h3>
                    <p className="text-blue-100 text-sm">30 minutos · Sin compromiso</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-white" />
                </CardContent>
              </Card>
            </a>
            <div className="space-y-4 text-sm">
              <a href={`tel:${PHONE_TEL}`} className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center"><Phone className="w-4 h-4 text-blue-400" /></div>
                <div><p className="text-xs text-zinc-500">Telefono</p><p>{PHONE}</p></div>
              </a>
              <a href="mailto:info@spectra-metrics.com" className="flex items-center gap-3 text-zinc-300 hover:text-white transition-colors">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center"><Mail className="w-4 h-4 text-blue-400" /></div>
                <div><p className="text-xs text-zinc-500">Email</p><p>info@spectra-metrics.com</p></div>
              </a>
              <div className="flex items-center gap-3 text-zinc-300">
                <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center"><MapPin className="w-4 h-4 text-blue-400" /></div>
                <div><p className="text-xs text-zinc-500">Oficina</p><p>{ADDRESS}</p></div>
              </div>
            </div>
          </div>

          {/* FORM */}
          <Card className="bg-zinc-900 border-zinc-800 rounded-2xl" data-testid="landing-form">
            <CardContent className="p-6 sm:p-8">
              {sent ? (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="text-2xl font-heading font-semibold">Mensaje enviado</h3>
                  <p className="text-zinc-400">Te contactaremos en menos de 24h al email que dejaste.</p>
                  <Button onClick={() => { setSent(false); setForm({ name: '', email: '', phone: '', company: '', industry: '', employees: '', country: 'Argentina', city: '', notes: '' }); }} variant="outline" className="border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-white">Enviar otro</Button>
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <h3 className="text-xl font-heading font-semibold mb-1">Solicitar demo</h3>
                  <p className="text-xs text-zinc-500 mb-4">Campos con * son obligatorios</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="sm:col-span-2"><Label className="text-zinc-300 text-xs">Nombre completo *</Label><Input value={form.name} onChange={e => update('name', e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1.5" required data-testid="landing-form-name" /></div>
                    <div><Label className="text-zinc-300 text-xs">Email *</Label><Input type="email" value={form.email} onChange={e => update('email', e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1.5" required data-testid="landing-form-email" /></div>
                    <div><Label className="text-zinc-300 text-xs">Telefono *</Label><Input value={form.phone} onChange={e => update('phone', e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1.5" required data-testid="landing-form-phone" /></div>
                    <div><Label className="text-zinc-300 text-xs">Empresa</Label><Input value={form.company} onChange={e => update('company', e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1.5" data-testid="landing-form-company" /></div>
                    <div><Label className="text-zinc-300 text-xs">Rubro</Label><Input value={form.industry} onChange={e => update('industry', e.target.value)} placeholder="Ej: Software, Retail" className="bg-zinc-950 border-zinc-800 text-white mt-1.5" data-testid="landing-form-industry" /></div>
                    <div className="sm:col-span-2">
                      <Label className="text-zinc-300 text-xs">Cantidad de empleados</Label>
                      <select value={form.employees} onChange={e => update('employees', e.target.value)} className="w-full h-10 mt-1.5 rounded-md bg-zinc-950 border border-zinc-800 text-white px-3 text-sm" data-testid="landing-form-employees">
                        <option value="">Seleccionar...</option>
                        <option value="1-5">1-5</option><option value="6-20">6-20</option><option value="21-50">21-50</option><option value="51-200">51-200</option><option value="200+">200+</option>
                      </select>
                    </div>
                    <div><Label className="text-zinc-300 text-xs">Pais</Label><Input value={form.country} onChange={e => update('country', e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1.5" data-testid="landing-form-country" /></div>
                    <div><Label className="text-zinc-300 text-xs">Ciudad</Label><Input value={form.city} onChange={e => update('city', e.target.value)} className="bg-zinc-950 border-zinc-800 text-white mt-1.5" data-testid="landing-form-city" /></div>
                    <div className="sm:col-span-2"><Label className="text-zinc-300 text-xs">Notas</Label><Textarea value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="Contanos brevemente que necesitas" rows={3} className="bg-zinc-950 border-zinc-800 text-white mt-1.5 resize-none" data-testid="landing-form-notes" /></div>
                  </div>
                  <Button type="submit" disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium gap-2" data-testid="landing-form-submit">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <>Enviar solicitud <ArrowRight className="w-4 h-4" /></>}
                  </Button>
                  <p className="text-[10px] text-zinc-500 text-center">Al enviar aceptas que te contactemos al email/telefono indicados.</p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-800 py-10 px-4 sm:px-8 bg-zinc-950">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center"><Zap className="w-3.5 h-3.5 text-white" /></div>
            <span>© 2026 Spectra Flow · Disruptive SW</span>
          </div>
          <div className="flex items-center gap-5">
            <a href="https://www.spectra-metrics.com" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors flex items-center gap-1.5"><Globe className="w-3 h-3" /> spectra-metrics.com</a>
            <span className="flex items-center gap-1.5"><ShieldCheck className="w-3 h-3" /> Datos seguros</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
