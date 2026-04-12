import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, TrendingUp, Users, Mail, MousePointerClick, MessageSquare, Send, ThumbsUp, Briefcase, CheckCircle2, XCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1D4ED8', '#16A34A', '#F59E0B', '#DC2626', '#6366F1', '#06B6D4', '#EC4899'];

export default function AnalyticsPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/analytics').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

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

  const pieData = [
    { name: 'Calificados', value: stats?.qualified_leads || 0 },
    { name: 'Rechazados', value: stats?.rejected_leads || 0 },
    { name: 'Otros', value: Math.max(0, (stats?.total_leads || 0) - (stats?.qualified_leads || 0) - (stats?.rejected_leads || 0)) },
  ];

  const metricCards = [
    { key: 'jobs_created', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'total_leads', label: 'Total de Leads', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { key: 'qualified_leads', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { key: 'approved_leads', icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'rejected_leads', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { key: 'emails_sent', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50' },
    { key: 'opens', icon: Mail, color: 'text-teal-600', bg: 'bg-teal-50' },
    { key: 'clicks', icon: MousePointerClick, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { key: 'replies', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
    { key: 'interested', icon: ThumbsUp, color: 'text-orange-600', bg: 'bg-orange-50' },
    { key: 'crm_handoffs', label: 'Enviados al CRM', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="analytics-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('analytics')}</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {metricCards.map(({ key, label, icon: Icon, color, bg }) => (
          <Card key={key} className="border-zinc-200 rounded-xl">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-7 h-7 rounded-md ${bg} flex items-center justify-center`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
              </div>
              <p className="text-xl font-heading font-semibold text-zinc-900">{stats?.[key]?.toLocaleString() ?? 0}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">{label || t(key)}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Conversion Rates */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Tasa de Calificacion', value: `${stats?.qualification_rate || 0}%` },
          { label: 'Tasa de Aprobacion', value: `${stats?.approval_rate || 0}%` },
          { label: 'Tasa de Apertura Email', value: `${stats?.email_open_rate || 0}%` },
          { label: 'Tasa de Respuesta', value: `${stats?.reply_rate || 0}%` },
        ].map(({ label, value }) => (
          <Card key={label} className="border-zinc-200 rounded-xl">
            <CardContent className="p-5 text-center">
              <p className="text-3xl font-heading font-semibold text-blue-600">{value}</p>
              <p className="text-xs text-zinc-500 mt-1">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Pipeline de Leads</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pipelineData}>
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

        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Engagement de Email</h3>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={emailData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#71717a' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }} />
                  <Bar dataKey="value" fill="#16A34A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-zinc-200 rounded-xl">
        <CardContent className="p-6">
          <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">Distribucion de Leads</h3>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} innerRadius={55} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                  {pieData.map((_, index) => <Cell key={index} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e4e4e7', fontSize: '13px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
