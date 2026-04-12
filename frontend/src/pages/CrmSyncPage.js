import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RefreshCw, CheckCircle2, XCircle, Loader2, Send, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export default function CrmSyncPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/crm-sync/logs').then(r => setLogs(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRetry = async (logId) => {
    try {
      await api.post(`/crm-sync/retry/${logId}`);
      setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: 'synced', error: '' } : l));
      toast.success('Retry successful');
    } catch { toast.error('Retry failed'); }
  };

  const synced = logs.filter(l => l.status === 'synced').length;
  const errors = logs.filter(l => l.status === 'error').length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="crm-sync-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('crm_sync')}</h1>
          <p className="text-sm text-zinc-500 mt-1">Manage lead handoff to Spectra CRM</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{synced}</p><p className="text-xs text-zinc-500">Synced to CRM</p></div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{errors}</p><p className="text-xs text-zinc-500">Sync Errors</p></div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Send className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{logs.length}</p><p className="text-xs text-zinc-500">Total Sync Logs</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Integration Status */}
      <Card className="border-zinc-200 rounded-xl border-dashed">
        <CardContent className="p-5 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-zinc-700">Spectra CRM Integration</p>
            <p className="text-xs text-zinc-500">Integration placeholder - configure in Settings &gt; Integrations to enable live sync</p>
          </div>
          <Badge className="bg-amber-50 text-amber-700 ml-auto">Not Configured</Badge>
        </CardContent>
      </Card>

      {/* Sync Logs Table */}
      <Card className="border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Lead Name</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('status')}</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Error</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Assigned Owner</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Synced At</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase w-20">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-400">No sync logs yet</TableCell></TableRow>
              ) : logs.map((log, i) => (
                <TableRow key={log.id} data-testid={`sync-log-${i}`}>
                  <TableCell className="font-medium text-zinc-900 text-sm">{log.lead_name}</TableCell>
                  <TableCell>
                    <Badge className={log.status === 'synced' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-red-600">{log.error || '-'}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{log.assigned_owner}</TableCell>
                  <TableCell className="text-sm text-zinc-500">{log.synced_at ? new Date(log.synced_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    {log.status === 'error' && (
                      <Button size="sm" variant="ghost" onClick={() => handleRetry(log.id)} data-testid={`retry-sync-${i}`}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> {t('retry')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}
