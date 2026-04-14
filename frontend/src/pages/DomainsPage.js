import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Plus, Globe, CheckCircle2, XCircle, Clock, Shield, Loader2, AlertTriangle, ArrowRight, RefreshCw, Send, Copy } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  not_configured: { color: "bg-slate-100 text-slate-700", icon: Clock, label: "Sin configurar" },
  dns_pending: { color: "bg-amber-50 text-amber-700", icon: Clock, label: "DNS Pendiente" },
  verifying: { color: "bg-blue-50 text-blue-700", icon: Loader2, label: "Verificando..." },
  verified: { color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2, label: "Verificado" },
  warmup_recommended: { color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2, label: "Verificado" },
  ready_to_send: { color: "bg-green-50 text-green-700", icon: CheckCircle2, label: "Listo para enviar" },
  configuration_error: { color: "bg-red-50 text-red-700", icon: XCircle, label: "Error de configuracion" },
};

export default function DomainsPage() {
  const { t } = useLanguage();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ domain: '', subdomain: '', sender_name: '', sender_email: '', reply_to: '', signature: '' });
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [testEmailDialog, setTestEmailDialog] = useState(null);
  const [testEmail, setTestEmail] = useState('');
  const [sendingTest, setSendingTest] = useState(false);

  useEffect(() => {
    api.get('/domains').then(r => setDomains(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.domain) return toast.error('El dominio es requerido');
    setCreating(true);
    try {
      const { data } = await api.post('/domains', form);
      setDomains(prev => [data, ...prev]);
      setDialogOpen(false);
      setForm({ domain: '', subdomain: '', sender_name: '', sender_email: '', reply_to: '', signature: '' });
      toast.success('Dominio agregado. Configura los registros DNS.');
    } catch (err) { toast.error('Error al agregar dominio'); }
    setCreating(false);
  };

  const handleVerify = async (domainId) => {
    setVerifying(domainId);
    try {
      const { data } = await api.post(`/domains/${domainId}/verify`);
      setDomains(prev => prev.map(d => d.id === domainId ? data : d));
      const isVerified = data.status === 'warmup_recommended' || data.status === 'verified' || data.status === 'ready_to_send';
      toast.success(isVerified ? 'Dominio verificado!' : 'Verificacion en progreso. Los DNS pueden tardar hasta 72h.');
    } catch { toast.error('Error de verificacion'); }
    setVerifying(null);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const { data } = await api.post('/domains/sync-resend');
      setDomains(data.domains || []);
      toast.success(`${data.synced} dominio(s) sincronizado(s)`);
    } catch (err) { toast.error('Error al sincronizar dominios'); }
    setSyncing(false);
  };

  const handleSendTest = async (domain) => {
    if (!testEmail) return toast.error('Ingresa un email destino');
    setSendingTest(true);
    try {
      const { data } = await api.post('/email/send', {
        to_email: testEmail,
        subject: `Prueba de envio - ${domain.subdomain || domain.domain}`,
        html_body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;"><h2 style="color:#1D4ED8;">Spectra Flow</h2><p>Este es un email de prueba enviado desde <strong>${domain.subdomain || domain.domain}</strong>.</p><p>Si recibes este email, tu dominio esta correctamente configurado para envio.</p><hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;" /><p style="color:#6b7280;font-size:12px;">Enviado para email outreach desde Spectra Flow</p></div>`,
        from_email: domain.sender_email,
        from_name: domain.sender_name || 'Spectra Flow'
      });
      if (data.simulated) {
        toast.info('Email simulado (Email no configurado)');
      } else {
        toast.success(`Email enviado a ${testEmail}`);
      }
      setTestEmailDialog(null);
      setTestEmail('');
    } catch (err) {
      toast.error(err?.response?.data?.detail || 'Error al enviar email');
    }
    setSendingTest(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copiado al portapapeles');
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="domains-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('domains')}</h1>
          <p className="text-sm text-zinc-500 mt-1">Configura tus dominios de envio para email outreach para email outreach</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleSync} disabled={syncing} data-testid="sync-resend-button">
            <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar Dominios
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="add-domain-button"><Plus className="w-4 h-4 mr-2" /> Agregar Dominio</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle className="font-heading">Configurar Dominio de Envio</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-xs text-blue-700">Recomendamos usar un subdominio (ej: mail.tuempresa.com) para proteger la reputacion de tu dominio principal. El dominio se configurara automaticamente.</p>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Dominio Principal</Label>
                  <Input data-testid="domain-input" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="tuempresa.com" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Subdominio (opcional)</Label>
                  <Input value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} placeholder="mail.tuempresa.com" />
                </div>
                <Separator />
                <h4 className="text-sm font-medium">Identidad del Remitente</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div><Label className="text-xs mb-1 block">Nombre Remitente</Label><Input value={form.sender_name} onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))} placeholder="Tu Empresa" /></div>
                  <div><Label className="text-xs mb-1 block">Email Remitente</Label><Input value={form.sender_email} onChange={e => setForm(f => ({ ...f, sender_email: e.target.value }))} placeholder="noreply@mail.empresa.com" /></div>
                  <div><Label className="text-xs mb-1 block">Reply-To</Label><Input value={form.reply_to} onChange={e => setForm(f => ({ ...f, reply_to: e.target.value }))} placeholder="contacto@empresa.com" /></div>
                  <div><Label className="text-xs mb-1 block">Firma</Label><Input value={form.signature} onChange={e => setForm(f => ({ ...f, signature: e.target.value }))} placeholder="El equipo" /></div>
                </div>
                <Button onClick={handleCreate} disabled={creating} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="domain-save-button">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Agregar Dominio
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain, i) => {
            const sc = statusConfig[domain.status] || statusConfig.not_configured;
            const verifiedRecords = domain.dns_records?.filter(r => r.verified || r.status === 'verified').length || 0;
            const totalRecords = domain.dns_records?.length || 1;
            const isVerified = domain.status === 'warmup_recommended' || domain.status === 'verified' || domain.status === 'ready_to_send';
            return (
              <Card key={domain.id} className="border-zinc-200 rounded-xl" data-testid={`domain-card-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isVerified ? 'bg-emerald-50' : 'bg-zinc-100'}`}>
                        <Globe className={`w-5 h-5 ${isVerified ? 'text-emerald-600' : 'text-zinc-600'}`} />
                      </div>
                      <div>
                        <h3 className="font-heading font-medium text-zinc-900">{domain.subdomain || domain.domain}</h3>
                        <p className="text-xs text-zinc-500">{domain.sender_email || 'Sin remitente configurado'}</p>
                      </div>
                    </div>
                    <Badge className={sc.color}>{sc.label}</Badge>
                  </div>

                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Registros DNS</p>
                      <span className="text-xs text-zinc-500">{verifiedRecords}/{totalRecords} verificados</span>
                    </div>
                    <Progress value={(verifiedRecords / Math.max(totalRecords, 1)) * 100} className="h-1.5 mb-3" />
                    <div className="space-y-2">
                      {(domain.dns_records || []).map((record, ri) => (
                        <div key={ri} className="flex items-center gap-3 p-2.5 bg-zinc-50 rounded-lg text-xs">
                          {(record.verified || record.status === 'verified') ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-zinc-300 flex-shrink-0" />}
                          <Badge variant="outline" className="text-[10px]">{record.type}</Badge>
                          <span className="text-zinc-600 truncate flex-1">{record.name}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                          <span className="text-zinc-500 truncate max-w-[250px]" title={record.value}>{record.value}</span>
                          <button onClick={() => copyToClipboard(record.value)} className="text-zinc-400 hover:text-zinc-600 flex-shrink-0" title="Copiar valor"><Copy className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {isVerified && (
                    <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 mb-4 flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5" />
                      <div>
                        <p className="text-xs text-emerald-700 font-medium">Dominio verificado y listo para enviar emails</p>
                        <p className="text-[10px] text-emerald-600 mt-0.5">Recomendamos iniciar con volumenes bajos (10-20 emails/dia) e ir incrementando durante 2-4 semanas.</p>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleVerify(domain.id)} disabled={verifying === domain.id} data-testid={`verify-domain-${i}`}>
                      {verifying === domain.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Shield className="w-3.5 h-3.5 mr-1" />}
                      Verificar DNS
                    </Button>
                    {isVerified && (
                      <>
                        <Dialog open={testEmailDialog === domain.id} onOpenChange={(open) => { setTestEmailDialog(open ? domain.id : null); setTestEmail(''); }}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid={`send-test-${i}`}>
                              <Send className="w-3.5 h-3.5 mr-1" /> Enviar Prueba
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-md">
                            <DialogHeader><DialogTitle>Enviar Email de Prueba</DialogTitle></DialogHeader>
                            <div className="space-y-4 mt-2">
                              <p className="text-sm text-zinc-500">Se enviara un email de prueba desde <strong>{domain.sender_email}</strong> para email outreach.</p>
                              <div>
                                <Label className="text-sm mb-1.5 block">Email destino</Label>
                                <Input value={testEmail} onChange={e => setTestEmail(e.target.value)} placeholder="tu@email.com" data-testid="test-email-input" />
                              </div>
                              <Button onClick={() => handleSendTest(domain)} disabled={sendingTest} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="send-test-confirm">
                                {sendingTest ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />} Enviar Email Real
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!domains.length && (
            <Card className="border-zinc-200 rounded-xl border-dashed">
              <CardContent className="p-12 text-center">
                <Globe className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm text-zinc-500 mb-3">No hay dominios configurados. Agrega tu primer dominio o sincroniza tus dominios.</p>
                <Button variant="outline" onClick={handleSync} disabled={syncing}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar Dominios
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
