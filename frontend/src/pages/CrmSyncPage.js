import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, CheckCircle2, XCircle, Loader2, Send, ExternalLink, Save } from 'lucide-react';
import { toast } from 'sonner';

export default function CrmSyncPage() {
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [crmUrl, setCrmUrl] = useState('');
  const [savedUrl, setSavedUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [integrations, setIntegrations] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/crm-sync/logs'),
      api.get('/settings/integrations'),
    ]).then(([logsRes, intRes]) => {
      setLogs(logsRes.data);
      setIntegrations(intRes.data);
      const espoCrm = intRes.data.find(i => i.name === 'espo_crm');
      if (espoCrm?.base_url) {
        setCrmUrl(espoCrm.base_url);
        setSavedUrl(espoCrm.base_url);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleRetry = async (logId) => {
    try {
      await api.post(`/crm-sync/retry/${logId}`);
      setLogs(prev => prev.map(l => l.id === logId ? { ...l, status: 'synced', error: '' } : l));
      toast.success('Reintento exitoso');
    } catch { toast.error('Error en reintento'); }
  };

  const saveCrmUrl = async () => {
    setSaving(true);
    try {
      await api.put('/settings/integrations/espo_crm', { base_url: crmUrl, enabled: true });
      setSavedUrl(crmUrl);
      toast.success('URL del CRM guardada');
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const synced = logs.filter(l => l.status === 'synced').length;
  const errors = logs.filter(l => l.status === 'error').length;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="crm-sync-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">Spectra CRM</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona el traspaso de leads calificados al CRM</p>
        </div>
        {savedUrl && (
          <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="go-to-crm-button">
            <a href={savedUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-2" /> Ir al CRM
            </a>
          </Button>
        )}
      </div>

      {/* CRM URL Configuration */}
      <Card className="border-zinc-200 rounded-xl">
        <CardContent className="p-6">
          <h3 className="font-heading font-medium text-zinc-900 mb-4">Configuracion del CRM</h3>
          <p className="text-sm text-zinc-500 mb-4">Ingresa la URL de Spectra CRM de este tenant. Cada cliente tiene su propio dominio.</p>
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="text-sm mb-1.5 block">URL del Spectra CRM</Label>
              <Input
                data-testid="crm-url-input"
                value={crmUrl}
                onChange={e => setCrmUrl(e.target.value)}
                placeholder="https://crm.micliente.com"
                className="h-11"
              />
            </div>
            <Button onClick={saveCrmUrl} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6" data-testid="save-crm-url-button">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Guardar
            </Button>
          </div>
          {savedUrl && (
            <div className="mt-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span className="text-sm text-emerald-600">CRM configurado: {savedUrl}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><CheckCircle2 className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{synced}</p><p className="text-xs text-zinc-500">Sincronizados</p></div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center"><XCircle className="w-5 h-5 text-red-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{errors}</p><p className="text-xs text-zinc-500">Errores de Sync</p></div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Send className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{logs.length}</p><p className="text-xs text-zinc-500">Total de Registros</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Sync Logs Table */}
      <Card className="border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Nombre del Lead</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Error</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Asignado a</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Fecha de Sync</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase w-20">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : logs.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-400">No hay registros de sincronizacion</TableCell></TableRow>
              ) : logs.map((log, i) => (
                <TableRow key={log.id} data-testid={`sync-log-${i}`}>
                  <TableCell className="font-medium text-zinc-900 text-sm">{log.lead_name}</TableCell>
                  <TableCell>
                    <Badge className={log.status === 'synced' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>
                      {log.status === 'synced' ? 'Sincronizado' : 'Error'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-red-600">{log.error || '-'}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{log.assigned_owner}</TableCell>
                  <TableCell className="text-sm text-zinc-500">{log.synced_at ? new Date(log.synced_at).toLocaleString() : '-'}</TableCell>
                  <TableCell>
                    {log.status === 'error' && (
                      <Button size="sm" variant="ghost" onClick={() => handleRetry(log.id)} data-testid={`retry-sync-${i}`}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1" /> Reintentar
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
