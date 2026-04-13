import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, TrendingUp, Users, Mail, MousePointerClick, MessageSquare, Send, ThumbsUp, Briefcase, CheckCircle2, XCircle, Calendar } from 'lucide-react';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, FunnelChart, Funnel, LabelList, Legend } from 'recharts';
import FlowBotButton from '@/components/FlowBotButton';

const COLORS = ['#1D4ED8', '#DC2626', '#F59E0B', '#6366F1', '#06B6D4', '#EC4899', '#10B981', '#8B5CF6'];
const QUALITY_COLORS = { excellent: '#10B981', good: '#3B82F6', average: '#F59E0B', poor: '#EF4444' };

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [crmStats, setCrmStats] = useState(null);
  const [timeSeries, setTimeSeries] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tsPeriod, setTsPeriod] = useState('week');
  const [leadsPeriod, setLeadsPeriod] = useState('all');
  const [crmPeriod, setCrmPeriod] = useState('all');

  const fetchStats = (lp, cp) => {
    const params = {};
    if (lp && lp !== 'all') params.period = lp;
    const crmParams = {};
    if (cp && cp !== 'all') crmParams.period = cp;
    Promise.all([
      api.get('/analytics', { params }),
      api.get('/crm/stats', { params: crmParams }).catch(() => ({ data: null })),
    ]).then(([a, c]) => { setStats(a.data); setCrmStats(c.data); }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => { fetchStats(leadsPeriod, crmPeriod); }, [leadsPeriod, crmPeriod]);

  useEffect(() => {
    api.get('/analytics/time-series', { params: { period: tsPeriod } }).then(r => setTimeSeries(r.data)).catch(console.error);
  }, [tsPeriod]);

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Cargando analisis...</div>;

  const pipelineData = [
    { name: 'Sin procesar', value: stats?.raw_leads || 0 },
    { name: 'Limpiados', value: stats?.cleaned_leads || 0 },
    { name: 'Calificados', value: stats?.scored_leads || 0 },
    { name: 'Aprobados', value: stats?.approved_leads || 0 },
    { name: 'Rechazados', value: stats?.rejected_leads || 0 },
  ];
  const emailData = [
    { name: 'Enviados', value: stats?.emails_sent || 0 },
    { name: 'Aperturas', value: stats?.opens || 0 },
    { name: 'Clics', value: stats?.clicks || 0 },
    { name: 'Respuestas', value: stats?.replies || 0 },
    { name: 'Interesados', value: stats?.interested || 0 },
    { name: 'CRM', value: stats?.crm_handoffs || 0 },
  ];
  const sc = crmStats?.stage_counts || {};
  const funnelData = [
    { name: 'Nuevo', value: sc.nuevo || 0, fill: '#94a3b8' },
    { name: 'Contactado', value: sc.contactado || 0, fill: '#3b82f6' },
    { name: 'Propuesta', value: sc.propuesta || 0, fill: '#8b5cf6' },
    { name: 'Negociacion', value: sc.negociacion || 0, fill: '#f59e0b' },
    { name: 'Ganado', value: sc.ganado || 0, fill: '#10b981' },
    { name: 'Perdido', value: sc.perdido || 0, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="analytics-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('analytics')}</h1>
        <FlowBotButton section="analytics" />
      </div>

      <Tabs defaultValue="leads">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="leads"><Users className="w-4 h-4 mr-1.5" />Leads</TabsTrigger>
          <TabsTrigger value="timeline"><TrendingUp className="w-4 h-4 mr-1.5" />Evolucion</TabsTrigger>
          <TabsTrigger value="crm"><Briefcase className="w-4 h-4 mr-1.5" />CRM</TabsTrigger>
        </TabsList>

        {/* LEADS TAB */}
        <TabsContent value="leads" className="space-y-6">
          <div className="flex items-center gap-3">
            <Select value={leadsPeriod} onValueChange={setLeadsPeriod}>
              <SelectTrigger className="w-[180px] h-9" data-testid="leads-period-select"><Calendar className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="week">Ultima semana</SelectItem>
                <SelectItem value="month">Ultimo mes</SelectItem>
                <SelectItem value="quarter">Ultimo trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {[
              { key: 'total_leads', label: 'Total Leads', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { key: 'qualified_leads', label: 'Calificados', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
              { key: 'approved_leads', label: 'Aprobados', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
              { key: 'rejected_leads', label: 'Rechazados', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
              { key: 'emails_sent', label: 'Emails', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50' },
              { key: 'crm_handoffs', label: 'Al CRM', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
            ].map(({ key, label, icon: Icon, color, bg }) => (
              <Card key={key} className="border-zinc-200 rounded-xl"><CardContent className="p-4">
                <div className={`w-7 h-7 rounded-md ${bg} flex items-center justify-center mb-2`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
                <p className="text-xl font-heading font-semibold text-zinc-900">{stats?.[key]?.toLocaleString() ?? 0}</p>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
              </CardContent></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { label: 'Tasa Calificacion', value: `${stats?.qualification_rate || 0}%`, color: 'text-indigo-600' },
              { label: 'Tasa Aprobacion', value: `${stats?.approval_rate || 0}%`, color: 'text-green-600' },
              { label: 'Tasa Apertura Email', value: `${stats?.email_open_rate || 0}%`, color: 'text-teal-600' },
              { label: 'Tasa Respuesta', value: `${stats?.reply_rate || 0}%`, color: 'text-orange-600' },
            ].map(({ label, value, color }) => (
              <Card key={label} className="border-zinc-200 rounded-xl"><CardContent className="p-5 text-center">
                <p className={`text-3xl font-heading font-semibold ${color}`}>{value}</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </CardContent></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
              <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Pipeline de Leads</h3>
              <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={pipelineData}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} /><YAxis tick={{ fontSize: 11, fill: '#71717a' }} /><Tooltip /><Bar dataKey="value" fill="#1D4ED8" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </CardContent></Card>
            <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
              <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Engagement Email</h3>
              <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={emailData}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} /><YAxis tick={{ fontSize: 11, fill: '#71717a' }} /><Tooltip /><Bar dataKey="value" fill="#16A34A" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
            </CardContent></Card>
          </div>
        </TabsContent>

        {/* TIME SERIES TAB */}
        <TabsContent value="timeline" className="space-y-6">
          <div className="flex items-center gap-3">
            <Select value={tsPeriod} onValueChange={setTsPeriod}>
              <SelectTrigger className="w-[180px] h-9" data-testid="ts-period-select"><Calendar className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="week">Ultima semana</SelectItem>
                <SelectItem value="month">Ultimo mes</SelectItem>
                <SelectItem value="quarter">Ultimo trimestre</SelectItem>
                <SelectItem value="year">Ultimo ano</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {timeSeries && (
            <>
              {/* Leads Over Time */}
              <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
                <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Leads por Dia</h3>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={timeSeries.time_series}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                      <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '12px' }} />
                      <Legend />
                      <Area type="monotone" dataKey="leads" name="Total leads" fill="#1D4ED8" fillOpacity={0.15} stroke="#1D4ED8" strokeWidth={2} />
                      <Area type="monotone" dataKey="scored" name="Calificados" fill="#10B981" fillOpacity={0.15} stroke="#10B981" strokeWidth={2} />
                      <Area type="monotone" dataKey="rejected" name="Rechazados" fill="#EF4444" fillOpacity={0.1} stroke="#EF4444" strokeWidth={1.5} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent></Card>

              {/* Jobs + Contacts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
                  <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Jobs de Prospeccion</h3>
                  <div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeSeries.time_series}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} /><YAxis tick={{ fontSize: 11, fill: '#71717a' }} /><Tooltip /><Line type="monotone" dataKey="jobs" name="Jobs" stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
                </CardContent></Card>
                <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
                  <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Contactos CRM Nuevos</h3>
                  <div className="h-[240px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={timeSeries.time_series}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" /><XAxis dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} /><YAxis tick={{ fontSize: 11, fill: '#71717a' }} /><Tooltip /><Line type="monotone" dataKey="contacts" name="Contactos" stroke="#10B981" strokeWidth={2} dot={{ r: 3 }} /></LineChart></ResponsiveContainer></div>
                </CardContent></Card>
              </div>

              {/* Top Categories + Quality */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
                  <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Top Categorias</h3>
                  {timeSeries.top_categories?.length > 0 ? (
                    <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={timeSeries.top_categories} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" /><XAxis type="number" tick={{ fontSize: 11, fill: '#71717a' }} /><YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: '#71717a' }} width={120} /><Tooltip /><Bar dataKey="count" name="Leads" fill="#6366F1" radius={[0, 4, 4, 0]} /></BarChart></ResponsiveContainer></div>
                  ) : <p className="text-sm text-zinc-400">Sin datos de categorias</p>}
                </CardContent></Card>
                <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
                  <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Distribucion de Calidad</h3>
                  {timeSeries.quality_distribution?.length > 0 ? (
                    <div className="h-[280px]"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={timeSeries.quality_distribution} cx="50%" cy="50%" outerRadius={95} innerRadius={60} dataKey="count" label={({ name, count }) => `${name}: ${count}`}>{timeSeries.quality_distribution.map((entry, i) => <Cell key={i} fill={QUALITY_COLORS[entry.name] || COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer></div>
                  ) : <p className="text-sm text-zinc-400">Sin datos de calidad</p>}
                </CardContent></Card>
              </div>
            </>
          )}
        </TabsContent>

        {/* CRM TAB */}
        <TabsContent value="crm" className="space-y-6">
          <div className="flex items-center gap-3">
            <Select value={crmPeriod} onValueChange={setCrmPeriod}>
              <SelectTrigger className="w-[180px] h-9" data-testid="crm-period-select"><Calendar className="w-3.5 h-3.5 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo el tiempo</SelectItem>
                <SelectItem value="week">Ultima semana</SelectItem>
                <SelectItem value="month">Ultimo mes</SelectItem>
                <SelectItem value="quarter">Ultimo trimestre</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Contactos CRM', value: crmStats?.total_contacts || 0, color: 'text-blue-600' },
              { label: 'Oportunidades', value: crmStats?.total_deals || 0, color: 'text-purple-600' },
              { label: 'Ganadas', value: sc.ganado || 0, color: 'text-emerald-600' },
              { label: 'Perdidas', value: sc.perdido || 0, color: 'text-red-600' },
              { label: 'Valor Ganado', value: `$${(crmStats?.won_value || 0).toLocaleString()}`, color: 'text-amber-600' },
            ].map(({ label, value, color }) => (
              <Card key={label} className="border-zinc-200 rounded-xl"><CardContent className="p-5 text-center">
                <p className={`text-3xl font-heading font-semibold ${color}`}>{value}</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </CardContent></Card>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
              <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Embudo Pipeline</h3>
              {funnelData.some(d => d.value > 0) ? (
                <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><FunnelChart><Tooltip /><Funnel dataKey="value" data={funnelData} isAnimationActive><LabelList position="right" fill="#27272a" stroke="none" dataKey="name" fontSize={12} /><LabelList position="center" fill="#fff" stroke="none" dataKey="value" fontSize={14} fontWeight={600} /></Funnel></FunnelChart></ResponsiveContainer></div>
              ) : <p className="text-sm text-zinc-400">Sin datos en pipeline</p>}
            </CardContent></Card>
            <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6">
              <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Oportunidades por Etapa</h3>
              <div className="h-[300px]"><ResponsiveContainer width="100%" height="100%"><BarChart data={funnelData}><CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" /><XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} /><YAxis tick={{ fontSize: 11, fill: '#71717a' }} /><Tooltip /><Bar dataKey="value" radius={[4, 4, 0, 0]}>{funnelData.map((e, i) => <Cell key={i} fill={e.fill} />)}</Bar></BarChart></ResponsiveContainer></div>
            </CardContent></Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
