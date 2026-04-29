import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Briefcase, Users, Mail, MousePointerClick, MessageSquare,
  ThumbsUp, Send, TrendingUp, TrendingDown, BarChart3, Zap, Settings2, RotateCcw, Calendar, ArrowUpDown
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import FlowBotButton from '@/components/FlowBotButton';
import { COUNTRIES, flagOf } from '@/lib/countries';
import { Link } from 'react-router-dom';

const allKpis = [
  { key: 'jobs_this_month', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Trabajos' },
  { key: 'total_leads', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Total leads' },
  { key: 'qualified_leads', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50', label: 'Calificados' },
  { key: 'emails_sent', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Emails enviados' },
  { key: 'opens', icon: Mail, color: 'text-teal-600', bg: 'bg-teal-50', label: 'Aperturas' },
  { key: 'clicks', icon: MousePointerClick, color: 'text-cyan-600', bg: 'bg-cyan-50', label: 'Clics' },
  { key: 'replies', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50', label: 'Respuestas' },
  { key: 'interested', icon: ThumbsUp, color: 'text-orange-600', bg: 'bg-orange-50', label: 'Interesados' },
  { key: 'leads_sent_to_crm', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50', label: 'Al CRM' },
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
  try { const s = localStorage.getItem('spectra_dashboard_prefs'); if (s) return JSON.parse(s); } catch {}
  return { kpis: defaultKpiVisibility, panels: defaultPanelVisibility };
}
function savePrefs(p) { localStorage.setItem('spectra_dashboard_prefs', JSON.stringify(p)); }

function getDateRange(preset) {
  const now = new Date();
  const fmt = (d) => d.toISOString().split('T')[0] + 'T00:00:00';
  const fmtEnd = (d) => d.toISOString().split('T')[0] + 'T23:59:59';
  switch (preset) {
    case 'today': return { from: fmt(now), to: fmtEnd(now) };
    case 'week': { const d = new Date(now); d.setDate(d.getDate() - 7); return { from: fmt(d), to: fmtEnd(now) }; }
    case 'month': { const d = new Date(now); d.setMonth(d.getMonth() - 1); return { from: fmt(d), to: fmtEnd(now) }; }
    case 'quarter': { const d = new Date(now); d.setMonth(d.getMonth() - 3); return { from: fmt(d), to: fmtEnd(now) }; }
    case 'year': { const d = new Date(now); d.setFullYear(d.getFullYear() - 1); return { from: fmt(d), to: fmtEnd(now) }; }
    default: return { from: null, to: null };
  }
}

function getPrevRange(preset) {
  const now = new Date();
  const fmt = (d) => d.toISOString().split('T')[0] + 'T00:00:00';
  const fmtEnd = (d) => d.toISOString().split('T')[0] + 'T23:59:59';
  switch (preset) {
    case 'today': { const d = new Date(now); d.setDate(d.getDate() - 1); return { from: fmt(d), to: fmtEnd(d) }; }
    case 'week': { const s = new Date(now); s.setDate(s.getDate() - 14); const e = new Date(now); e.setDate(e.getDate() - 7); return { from: fmt(s), to: fmtEnd(e) }; }
    case 'month': { const s = new Date(now); s.setMonth(s.getMonth() - 2); const e = new Date(now); e.setMonth(e.getMonth() - 1); return { from: fmt(s), to: fmtEnd(e) }; }
    case 'quarter': { const s = new Date(now); s.setMonth(s.getMonth() - 6); const e = new Date(now); e.setMonth(e.getMonth() - 3); return { from: fmt(s), to: fmtEnd(e) }; }
    case 'year': { const s = new Date(now); s.setFullYear(s.getFullYear() - 2); const e = new Date(now); e.setFullYear(e.getFullYear() - 1); return { from: fmt(s), to: fmtEnd(e) }; }
    default: return { from: null, to: null };
  }
}

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [prevStats, setPrevStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [configOpen, setConfigOpen] = useState(false);
  const [datePreset, setDatePreset] = useState('all');
  const [compareMode, setCompareMode] = useState(false);

  const fetchStats = async (preset) => {
    setLoading(true);
    try {
      const range = getDateRange(preset);
      const params = {};
      if (range.from) params.from_date = range.from;
      if (range.to) params.to_date = range.to;
      const { data } = await api.get('/dashboard/stats', { params });
      setStats(data);
      if (compareMode && preset !== 'all') {
        const prev = getPrevRange(preset);
        const { data: pd } = await api.get('/dashboard/stats', { params: { from_date: prev.from, to_date: prev.to } });
        setPrevStats(pd);
      } else {
        setPrevStats(null);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { fetchStats(datePreset); }, [datePreset, compareMode]);

  const updatePrefs = (np) => { setPrefs(np); savePrefs(np); };
  const toggleKpi = (key) => updatePrefs({ ...prefs, kpis: { ...prefs.kpis, [key]: !prefs.kpis[key] } });
  const togglePanel = (key) => updatePrefs({ ...prefs, panels: { ...prefs.panels, [key]: !prefs.panels[key] } });
  const resetPrefs = () => updatePrefs({ kpis: defaultKpiVisibility, panels: defaultPanelVisibility });

  const visibleKpis = allKpis.filter(k => prefs.kpis[k.key] !== false);

  const getDelta = (key) => {
    if (!prevStats || !stats) return null;
    const cur = stats[key] || 0;
    const prev = prevStats[key] || 0;
    if (prev === 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };

  if (loading && !stats) {
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
    { name: 'Leads', actual: stats?.raw_leads || 0, anterior: prevStats?.raw_leads || 0 },
    { name: 'Calificados', actual: stats?.qualified_leads || 0, anterior: prevStats?.qualified_leads || 0 },
    { name: 'Enviados', actual: stats?.emails_sent || 0, anterior: prevStats?.emails_sent || 0 },
    { name: 'Aperturas', actual: stats?.opens || 0, anterior: prevStats?.opens || 0 },
    { name: 'Respuestas', actual: stats?.replies || 0, anterior: prevStats?.replies || 0 },
    { name: 'Interesados', actual: stats?.interested || 0, anterior: prevStats?.interested || 0 },
    { name: 'Al CRM', actual: stats?.leads_sent_to_crm || 0, anterior: prevStats?.leads_sent_to_crm || 0 },
  ];

  const openRate = stats?.emails_sent > 0 ? ((stats?.opens || 0) / stats.emails_sent * 100).toFixed(1) : '0';
  const replyRate = stats?.emails_sent > 0 ? ((stats?.replies || 0) / stats.emails_sent * 100).toFixed(1) : '0';
  const convRate = stats?.total_leads > 0 ? ((stats?.leads_sent_to_crm || 0) / stats.total_leads * 100).toFixed(1) : '0';

  const ganados = stats?.opportunities || 0;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="dashboard-page">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('dashboard')}</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={datePreset} onValueChange={setDatePreset}>
            <SelectTrigger className="w-[160px] h-9 text-sm" data-testid="date-filter">
              <Calendar className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="week">Ultima semana</SelectItem>
              <SelectItem value="month">Ultimo mes</SelectItem>
              <SelectItem value="quarter">Ultimo trimestre</SelectItem>
              <SelectItem value="year">Ultimo ano</SelectItem>
            </SelectContent>
          </Select>
          {datePreset !== 'all' && (
            <Button variant={compareMode ? 'default' : 'outline'} size="sm" onClick={() => setCompareMode(!compareMode)} data-testid="compare-toggle" className={compareMode ? 'bg-blue-600 text-white' : ''}>
              <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" /> Comparar
            </Button>
          )}
          <FlowBotButton section="dashboard" />
          <Dialog open={configOpen} onOpenChange={setConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" data-testid="dashboard-config-btn"><Settings2 className="w-4 h-4 mr-1.5" /> Personalizar</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-heading">Personalizar Dashboard</DialogTitle></DialogHeader>
              <div className="space-y-6 mt-4">
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
                <div>
                  <h4 className="text-sm font-medium text-zinc-900 mb-3">Metricas (KPIs)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {allKpis.map(k => (
                      <div key={k.key} className="flex items-center justify-between p-2.5 bg-zinc-50 rounded-lg" data-testid={`kpi-toggle-${k.key}`}>
                        <div className="flex items-center gap-2"><k.icon className={`w-3.5 h-3.5 ${k.color}`} /><Label className="text-xs">{k.label}</Label></div>
                        <Switch checked={prefs.kpis[k.key] !== false} onCheckedChange={() => toggleKpi(k.key)} />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={resetPrefs} data-testid="reset-dashboard-btn"><RotateCcw className="w-3.5 h-3.5 mr-1.5" /> Restaurar</Button>
                  <Button size="sm" onClick={() => setConfigOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white">Listo</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Top Row: Rates + Ganados (4 columns) */}
      {prefs.panels.rates !== false && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4" data-testid="dashboard-rates">
          <Card className="border-teal-200 rounded-xl bg-teal-50/30">
            <CardContent className="p-5">
              <p className="text-[10px] font-medium text-teal-600 uppercase tracking-wider mb-1">Tasa de Apertura</p>
              <p className="text-3xl font-heading font-semibold text-teal-700">{openRate}%</p>
              <p className="text-xs text-zinc-400 mt-1">{stats?.opens || 0} de {stats?.emails_sent || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-green-200 rounded-xl bg-green-50/30">
            <CardContent className="p-5">
              <p className="text-[10px] font-medium text-green-600 uppercase tracking-wider mb-1">Tasa de Respuesta</p>
              <p className="text-3xl font-heading font-semibold text-green-700">{replyRate}%</p>
              <p className="text-xs text-zinc-400 mt-1">{stats?.replies || 0} respuestas</p>
            </CardContent>
          </Card>
          <Card className="border-purple-200 rounded-xl bg-purple-50/30">
            <CardContent className="p-5">
              <p className="text-[10px] font-medium text-purple-600 uppercase tracking-wider mb-1">Conversion a CRM</p>
              <p className="text-3xl font-heading font-semibold text-purple-700">{convRate}%</p>
              <p className="text-xs text-zinc-400 mt-1">{stats?.leads_sent_to_crm || 0} de {stats?.total_leads || 0}</p>
            </CardContent>
          </Card>
          <Card className="border-emerald-300 rounded-xl bg-emerald-50/50">
            <CardContent className="p-5">
              <p className="text-[10px] font-medium text-emerald-600 uppercase tracking-wider mb-1">Contactos Ganados</p>
              <p className="text-3xl font-heading font-semibold text-emerald-700">{ganados}</p>
              <p className="text-xs text-zinc-400 mt-1">Oportunidades cerradas</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Separator */}
      <div className="border-t border-zinc-200" />

      {/* KPI Grid (Leads metrics) */}
      {prefs.panels.kpis !== false && visibleKpis.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3" data-testid="dashboard-kpi-grid">
          {visibleKpis.map(({ key, icon: Icon, color, bg, label }) => {
            const delta = getDelta(key);
            return (
              <Card key={key} className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-xl font-heading font-semibold text-zinc-900">{stats?.[key]?.toLocaleString() ?? 0}</p>
                      {delta !== null && compareMode && (
                        <div className={`flex items-center gap-1 mt-0.5 text-[10px] ${delta >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {delta >= 0 ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                          <span>{delta >= 0 ? '+' : ''}{delta}%</span>
                        </div>
                      )}
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {prefs.panels.pipeline !== false && (
          <Card className="lg:col-span-2 border-zinc-200 rounded-xl">
            <CardContent className="p-6">
              <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Pipeline General {compareMode && prevStats ? '(Comparativo)' : ''}</h3>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                    <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }} />
                    <Bar dataKey="actual" fill="#1D4ED8" radius={[4, 4, 0, 0]} name="Actual" />
                    {compareMode && prevStats && <Bar dataKey="anterior" fill="#cbd5e1" radius={[4, 4, 0, 0]} name="Anterior" />}
                    {compareMode && prevStats && <Legend />}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {prefs.panels.activity !== false && (
          <Card className="border-zinc-200 rounded-xl">
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
                {(!stats?.recent_activity?.length) && <p className="text-sm text-zinc-400">Sin actividad reciente</p>}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Top 5 paises por leads */}
        <Card className="border-zinc-200 rounded-xl" data-testid="leads-by-country-widget">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-heading font-medium text-zinc-900">Leads por pais</h3>
              <Badge variant="secondary" className="text-[10px]">Top 5</Badge>
            </div>
            {(() => {
              const list = stats?.leads_by_country || [];
              if (!list.length) return <p className="text-sm text-zinc-400">Aun no hay leads geolocalizados.</p>;
              const max = Math.max(...list.map(x => x.count), 1);
              return (
                <div className="space-y-3">
                  {list.map((row, i) => {
                    const meta = COUNTRIES.find(c => c.es === row.country || c.en === row.country);
                    const pct = (row.count / max) * 100;
                    return (
                      <Link
                        key={row.country}
                        to={`/leads?country=${encodeURIComponent(row.country)}`}
                        className="block group"
                        data-testid={`country-row-${i}`}
                      >
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-xl leading-none w-7" aria-hidden>{meta ? flagOf(meta.c) : '\u{1F310}'}</span>
                          <span className="flex-1 text-zinc-700 group-hover:text-blue-600 transition-colors truncate">{row.country}</span>
                          <span className="text-xs font-semibold text-zinc-900 tabular-nums">{row.count}</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600" style={{ width: `${pct}%` }} />
                        </div>
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
