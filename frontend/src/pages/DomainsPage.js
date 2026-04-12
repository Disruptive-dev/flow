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
import { Plus, Globe, CheckCircle2, XCircle, Clock, Shield, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

const statusConfig = {
  not_configured: { color: "bg-slate-100 text-slate-700", icon: Clock },
  dns_pending: { color: "bg-amber-50 text-amber-700", icon: Clock },
  verifying: { color: "bg-blue-50 text-blue-700", icon: Loader2 },
  verified: { color: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  warmup_recommended: { color: "bg-purple-50 text-purple-700", icon: Shield },
  ready_to_send: { color: "bg-green-50 text-green-700", icon: CheckCircle2 },
  configuration_error: { color: "bg-red-50 text-red-700", icon: XCircle },
};

export default function DomainsPage() {
  const { t } = useLanguage();
  const [domains, setDomains] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ domain: '', subdomain: '', sender_name: '', sender_email: '', reply_to: '', signature: '' });
  const [creating, setCreating] = useState(false);
  const [verifying, setVerifying] = useState(null);

  useEffect(() => {
    api.get('/domains').then(r => setDomains(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.domain) return toast.error('Domain is required');
    setCreating(true);
    try {
      const { data } = await api.post('/domains', form);
      setDomains(prev => [data, ...prev]);
      setDialogOpen(false);
      setForm({ domain: '', subdomain: '', sender_name: '', sender_email: '', reply_to: '', signature: '' });
      toast.success('Domain added! Configure DNS records below.');
    } catch (err) { toast.error('Failed to add domain'); }
    setCreating(false);
  };

  const handleVerify = async (domainId) => {
    setVerifying(domainId);
    try {
      const { data } = await api.post(`/domains/${domainId}/verify`);
      setDomains(prev => prev.map(d => d.id === domainId ? data : d));
      toast.success(data.status === 'warmup_recommended' ? 'Domain verified! Warmup recommended.' : 'Verification in progress...');
    } catch { toast.error('Verification failed'); }
    setVerifying(null);
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="domains-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('domains')}</h1>
          <p className="text-sm text-zinc-500 mt-1">Configure your sending domains for email outreach</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="add-domain-button"><Plus className="w-4 h-4 mr-2" /> Add Domain</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle className="font-heading">{t('domain_setup')}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-700">We recommend using a subdomain (e.g., mail.yourcompany.com) for email sending to protect your main domain reputation.</p>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Main Domain</Label>
                <Input data-testid="domain-input" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} placeholder="yourcompany.com" />
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Subdomain (recommended)</Label>
                <Input value={form.subdomain} onChange={e => setForm(f => ({ ...f, subdomain: e.target.value }))} placeholder="mail.yourcompany.com" />
              </div>
              <Separator />
              <h4 className="text-sm font-medium">{t('sender_identity')}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs mb-1 block">{t('sender_name')}</Label><Input value={form.sender_name} onChange={e => setForm(f => ({ ...f, sender_name: e.target.value }))} placeholder="Your Company" /></div>
                <div><Label className="text-xs mb-1 block">{t('sender_email')}</Label><Input value={form.sender_email} onChange={e => setForm(f => ({ ...f, sender_email: e.target.value }))} placeholder="noreply@mail.company.com" /></div>
                <div><Label className="text-xs mb-1 block">{t('reply_to')}</Label><Input value={form.reply_to} onChange={e => setForm(f => ({ ...f, reply_to: e.target.value }))} placeholder="contact@company.com" /></div>
                <div><Label className="text-xs mb-1 block">{t('signature')}</Label><Input value={form.signature} onChange={e => setForm(f => ({ ...f, signature: e.target.value }))} placeholder="The Team" /></div>
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="domain-save-button">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Add Domain
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : (
        <div className="space-y-4">
          {domains.map((domain, i) => {
            const sc = statusConfig[domain.status] || statusConfig.not_configured;
            const verifiedRecords = domain.dns_records?.filter(r => r.verified).length || 0;
            const totalRecords = domain.dns_records?.length || 3;
            return (
              <Card key={domain.id} className="border-zinc-200 rounded-xl" data-testid={`domain-card-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                        <Globe className="w-5 h-5 text-zinc-600" />
                      </div>
                      <div>
                        <h3 className="font-heading font-medium text-zinc-900">{domain.subdomain || domain.domain}</h3>
                        <p className="text-xs text-zinc-500">{domain.sender_email || 'No sender configured'}</p>
                      </div>
                    </div>
                    <Badge className={sc.color}>{domain.status.replace(/_/g, ' ')}</Badge>
                  </div>

                  {/* DNS Records */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">DNS Records</p>
                      <span className="text-xs text-zinc-500">{verifiedRecords}/{totalRecords} verified</span>
                    </div>
                    <Progress value={(verifiedRecords / totalRecords) * 100} className="h-1.5 mb-3" />
                    <div className="space-y-2">
                      {(domain.dns_records || []).map((record, ri) => (
                        <div key={ri} className="flex items-center gap-3 p-2.5 bg-zinc-50 rounded-lg text-xs">
                          {record.verified ? <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-zinc-300 flex-shrink-0" />}
                          <Badge variant="outline" className="text-[10px]">{record.type}</Badge>
                          <span className="text-zinc-600 truncate flex-1">{record.name}</span>
                          <ArrowRight className="w-3 h-3 text-zinc-400 flex-shrink-0" />
                          <span className="text-zinc-500 truncate max-w-[200px]">{record.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Warmup Status */}
                  {domain.status === 'warmup_recommended' && (
                    <div className="p-3 bg-purple-50 rounded-lg border border-purple-100 mb-4 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-purple-600 mt-0.5" />
                      <p className="text-xs text-purple-700">Domain verified! We recommend starting with lower sending volumes (10-20 emails/day) and gradually increasing over 2-4 weeks.</p>
                    </div>
                  )}

                  <Button size="sm" variant="outline" onClick={() => handleVerify(domain.id)} disabled={verifying === domain.id} data-testid={`verify-domain-${i}`}>
                    {verifying === domain.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Shield className="w-3.5 h-3.5 mr-1" />}
                    {t('verify')}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
          {!domains.length && (
            <Card className="border-zinc-200 rounded-xl border-dashed">
              <CardContent className="p-12 text-center">
                <Globe className="w-10 h-10 text-zinc-300 mx-auto mb-3" />
                <p className="text-sm text-zinc-500">No domains configured yet. Add your first domain to start sending emails.</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
