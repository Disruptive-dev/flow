import { useEffect, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Briefcase, Users, Mail, MousePointerClick, MessageSquare,
  ThumbsUp, Send, TrendingUp, BarChart3, Zap
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const kpiConfig = [
  { key: 'jobs_this_month', icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'total_leads', icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  { key: 'qualified_leads', icon: TrendingUp, color: 'text-indigo-600', bg: 'bg-indigo-50' },
  { key: 'emails_sent', icon: Mail, color: 'text-amber-600', bg: 'bg-amber-50' },
  { key: 'opens', icon: Mail, color: 'text-teal-600', bg: 'bg-teal-50' },
  { key: 'clicks', icon: MousePointerClick, color: 'text-cyan-600', bg: 'bg-cyan-50' },
  { key: 'replies', icon: MessageSquare, color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'interested', icon: ThumbsUp, color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'leads_sent_to_crm', icon: Send, color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'opportunities', icon: Zap, color: 'text-fuchsia-600', bg: 'bg-fuchsia-50' },
  { key: 'active_campaigns', icon: BarChart3, color: 'text-rose-600', bg: 'bg-rose-50' },
];

export default function DashboardPage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/stats').then(r => setStats(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

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
    { name: t('raw_leads'), value: stats?.raw_leads || 0 },
    { name: t('qualified_leads'), value: stats?.qualified_leads || 0 },
    { name: t('emails_sent'), value: stats?.emails_sent || 0 },
    { name: t('opens'), value: stats?.opens || 0 },
    { name: t('replies'), value: stats?.replies || 0 },
    { name: t('interested'), value: stats?.interested || 0 },
    { name: t('sent_to_crm'), value: stats?.leads_sent_to_crm || 0 },
  ];

  return (
    <div className="space-y-8 animate-fade-in" data-testid="dashboard-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('dashboard')}</h1>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4" data-testid="dashboard-kpi-grid">
        {kpiConfig.map(({ key, icon: Icon, color, bg }) => (
          <Card key={key} className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors">
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1">{t(key)}</p>
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

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 border-zinc-200 rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">{t('pipeline_overview')}</h3>
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

        {/* Recent Activity */}
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-6">
            <h3 className="text-base font-heading font-medium text-zinc-900 mb-4">{t('recent_activity')}</h3>
            <div className="space-y-3">
              {(stats?.recent_activity || []).slice(0, 6).map((activity, i) => (
                  <div className="flex items-start gap-3 text-sm animate-slide-in" style={{ animationDelay: `${i * 50}ms` }}>
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
                <p className="text-sm text-zinc-400">No recent activity</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
