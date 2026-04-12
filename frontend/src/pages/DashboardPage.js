import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Briefcase, Users, Mail, MousePointerClick, MessageSquare,
  ThumbsUp, Send, TrendingUp, BarChart3, Zap, Settings2, X, GripVertical, Eye, EyeOff, RotateCcw
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import FlowBotButton from '@/components/FlowBotButton';

const allKpis = [
  { key: 'jobs_this_month', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Trabajos del mes' },
  { key: 'total_leads', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Total leads' },
  { key: 'qualified_leads', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Leads calificados' },
  { key: 'emails_sent', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Emails enviados' },
  { key: 'opens', icon: Mail, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Aperturas' },
  { key: 'clicks', icon: MousePointerClick, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Clics' },
  { key: 'replies', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', label: 'Respuestas' },
  { key: 'interested', icon: ThumbsUp, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Interesados' },
  { key: 'leads_sent_to_crm', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Enviados al CRM' },
  { key: 'opportunities', icon: Zap, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50', label: 'Oportunidades' },
  { key: 'active_campaigns', icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-50', label: 'Campanas activas' },
];

const allPanels = [
  { key: 'kpis', label: 'KPIs / Metricas', defaultVisible: true },
  { key: 'pipeline', label: 'Grafico de Pipeline', defaultVisible: true },
  { key: 'activity', label: 'Actividad Reciente', defaultVisible: true },
  { key: 'rates', label: 'Tasas de Conversion', defaultVisible: true },
];

const defaultKpiVisibility = Object.fromEntries(allKpis.map(k => [k.key, true]));
const defaultPanelVisibility = Object.fromEntries(allPanels.map(p => [p.key, p.defaultVisible]));

function loadPrefs() {
  try {
    const saved = localStorage.getItem('spectra_dashboard_prefs');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { kpis: defaultKpiVisibility, panels: defaultPanelVisibility };
}

function savePrefs(prefs) {
  localStorage.setItem('spectra_dashboard_prefs', JSON.stringify(prefs));
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [configOpen, setConfigOpen] = useState(false);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const updatePrefs = (newPrefs) => {
    setPrefs(newPrefs);
    savePrefs(newPrefs);
  };

  const toggleKpi = (key) => {
    const updated = { ...prefs, kpis: { ...prefs.kpis, [key]: !prefs.kpis[key] } };
    updatePrefs(updated);
  };

  const togglePanel = (key) => {
    const updated = { ...prefs, panels: { ...prefs.panels, [key]: !prefs.panels[key] } };
    updatePrefs(updated);
  };

  const resetPrefs = () => {
    const defaults = { kpis: defaultKpiVisibility, panels: defaultPanelVisibility };
    updatePrefs(defaults);
  };

  const visibleKpis = allKpis.filter(k => prefs.kpis[k.key] !== false);

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('dashboard')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="border-zinc-200 rounded-xl"><CardContent className="p-5"><div className="h-16 bg-zinc-100 rounded animate-pulse" /></CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  const chartData = [
    { name: 'Leads', value: stats?.raw_leads || 0 },
    { name: 'Calificados', value: stats?.qualified_leads || 0 },
    { name: 'Enviados', value: stats?.emails_sent || 0 },
    { name: 'Aperturas', value: stats?.opens || 0 },
    { name: 'Respuestas', value: stats?.replies || 0 },
    { name: 'Interesados', value: stats?.interested || 0 },
    { name: 'Al CRM', value: stats?.leads_sent_to_crm || 0 },
  ];

  const openRate = stats?.emails_sent > 0 ? ((stats?.opens || 0) / stats.emails_sent * 100).toFixed(1) : '0';
  const replyRate = stats?.emails_sent > 0 ? ((stats?.replies || 0) / stats.emails_sent * 100).toFixed(1) : '0';
  const convRate = stats?.total_leads > 0 ? ((stats?.leads_sent_to_crm || 0) / stats.total_leads * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('dashboard')}</h1>
        <div className="flex items-center gap-2">
          <FlowBotButton section="dashboard" />
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="dashboard-config-btn">
                <Settings2 className="w-4 h-4 mr-1.5" /> Personalizar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Personalizar Dashboard</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Panels */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 mb-3">Secciones</h4>
                  <div className="space-y-2">
                    {allPanels.map(p => (
                      <div key={p.key} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg" data-testid={`panel-toggle-${p.key}`}>
                        <Label className="text-sm">{p.label}</Label>
                        <Switch checked={prefs.panels[p.key] !== false} onCheckedChange={() => togglePanel(p.key)} />
                      </div>
                    ))}
                  </div>
                </div>

                {/* KPIs */}
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 mb-3">Metricas (KPIs)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {allKpis.map(k => (
                      <div key={k.key} className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-lg" data-testid={`kpi-toggle-${k.key}`}>
                        <div className="flex items-center gap-2">
                          <k.icon className={`w-3.5 h-3.5 ${k.color}`} />
                          <Label className="text-xs">{k.label}</Label>
                        </div>
                        <Switch checked={prefs.kpis[k.key] !== false} onCheckedChange={() => toggleKpi(k.key)} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetPrefs} data-testid="reset-dashboard-btn">
                    <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restaurar por defecto
                  </Button>
                  <Button size="sm" onClick={() => setConfigOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    Listo
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* KPI Grid */}
      {prefs.panels.kpis !== false && visibleKpis.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="dashboard-kpi-grid">
          {visibleKpis.map(({ key, icon: Icon, color, bg, label }) => (
            <Card key={key} className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                    <p className="text-2xl font-heading font-semibold text-zinc-900">{stats?.[key]?.toLocaleString() ?? 0}</p>
                  </div>
                  <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center`}>
                    <Icon className={`w-4 h-4 ${color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {prefs.panels.pipeline !== false && (
          <Card className={`border-zinc-200 rounded-xl ${prefs.panels.activity !== false ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <CardContent className="p-6">
              <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Pipeline General</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }} />
                    <Bar dataKey="value" fill="#1D4ED8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {prefs.panels.activity !== false && (
          <Card className={`border-zinc-200 rounded-xl ${prefs.panels.pipeline !== false ? '' : 'lg:col-span-3'}`}>
            <CardContent className="p-6">
              <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Actividad Reciente</h3>
              <div className="space-y-3">
                {(stats?.recent_activity || []).slice(0, 6).map((activity, i) => (
                  <div key={i} className="flex items-start gap-3 text-sm animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                    <div>
                      <span className="text-zinc-700 block">{activity.details}</span>
                      <span className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5">
                        {activity.user_name} &middot; <Badge variant="secondary" className="text-[10px] px-1.5 py-0">{activity.action.replace(/_/g, ' ')}</Badge>
                      </span>
                    </div>
                  </div>
                ))}
                {(!stats?.recent_activity?.length) && (
                  <p className="text-sm text-zinc-400">Sin actividad reciente</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Conversion Rates Panel */}
      {prefs.panels.rates !== false && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="dashboard-rates">
          {[
            { label: 'Tasa de Apertura', value: `${openRate}%`, desc: `${stats?.opens || 0} de ${stats?.emails_sent || 0} emails`, color: 'text-teal-600', bg: 'bg-teal-50' },
            { label: 'Tasa de Respuesta', value: `${replyRate}%`, desc: `${stats?.replies || 0} respuestas`, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Conversion a CRM', value: `${convRate}%`, desc: `${stats?.leads_sent_to_crm || 0} de ${stats?.total_leads || 0} leads`, color: 'text-purple-600', bg: 'bg-purple-50' },
          ].map(({ label, value, desc, color, bg }) => (
            <Card key={label} className="border-zinc-200 rounded-xl">
              <CardContent className="p-5">
                <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                <p className={`text-3xl font-heading font-semibold ${color}`}>{value}</p>
                <p className="text-xs text-zinc-400 mt-1">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
