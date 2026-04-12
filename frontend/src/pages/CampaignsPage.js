import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Plus, Mail, Pause, Play, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

const campaignStatusColors = { draft: "bg-slate-100 text-slate-700", active: "bg-emerald-50 text-emerald-700", paused: "bg-amber-50 text-amber-700", completed: "bg-blue-50 text-blue-700" };

export default function CampaignsPage() {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    api.get('/campaigns').then(r => setCampaigns(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e) => {
    e?.preventDefault();
    if (!newName.trim()) return toast.error('Ingresa un nombre para la campana');
    setCreating(true);
    try {
      const { data } = await api.post('/campaigns', { name: newName });
      setCampaigns(prev => [data, ...prev]);
      setShowCreate(false);
      setNewName('');
      toast.success('Campana creada exitosamente');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear campana');
    }
    setCreating(false);
  };

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/campaigns/${id}`, { status });
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
      toast.success(`Campana ${status === 'active' ? 'activada' : status === 'paused' ? 'pausada' : status}`);
    } catch { toast.error('Error al actualizar'); }
  };

  const simulateSending = async (id) => {
    try {
      const { data } = await api.post(`/campaigns/${id}/simulate`);
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
      toast.success(`Simulacion completa: ${data.sent_count} enviados, ${data.open_count} aperturas, ${data.reply_count} respuestas, ${data.interested_count} interesados`);
    } catch { toast.error('Error en simulacion'); }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="campaigns-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('campaigns')}</h1>
        <Button onClick={() => setShowCreate(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-campaign-button">
          <Plus className="w-4 h-4 mr-2" />{t('create_campaign')}
        </Button>
      </div>

      {/* Create Campaign Inline Form */}
      {showCreate && (
        <Card className="border-blue-200 bg-blue-50/30 rounded-xl" data-testid="create-campaign-form">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-medium text-zinc-900">{t('create_campaign')}</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowCreate(false)}><X className="w-4 h-4" /></Button>
            </div>
            <form onSubmit={handleCreate} className="flex items-end gap-4">
              <div className="flex-1">
                <Label className="text-sm mb-1.5 block">{t('campaign_name')}</Label>
                <Input
                  data-testid="campaign-name-input"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Ej: Real Estate Tucuman Q1 2026"
                  autoFocus
                  className="h-11"
                />
              </div>
              <Button type="submit" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-6" data-testid="campaign-save-button">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('create')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /> Cargando campanas...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {campaigns.map((c, i) => {
            const total = c.lead_count || 1;
            const sentPct = Math.round((c.sent_count / total) * 100);
            return (
              <Card key={c.id} className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors" data-testid={`campaign-card-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-heading font-medium text-zinc-900">{c.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">Creada por {c.created_by} &middot; {c.lead_count} leads</p>
                    </div>
                    <Badge className={campaignStatusColors[c.status] || campaignStatusColors.draft}>{c.status}</Badge>
                  </div>
                  {c.sent_count > 0 && <Progress value={sentPct} className="h-1.5 mb-4" />}
                  <div className="grid grid-cols-3 gap-3 text-center mb-4">
                    {[
                      { label: 'Enviados', value: c.sent_count },
                      { label: 'Aperturas', value: c.open_count },
                      { label: 'Clics', value: c.click_count },
                      { label: 'Respuestas', value: c.reply_count },
                      { label: 'Interesados', value: c.interested_count },
                      { label: 'CRM', value: c.crm_count },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-lg font-heading font-semibold text-zinc-900">{value}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {c.status === 'draft' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'active')} data-testid={`campaign-activate-${i}`}><Play className="w-3.5 h-3.5 mr-1" /> Activar</Button>
                        <Button size="sm" variant="outline" onClick={() => simulateSending(c.id)} data-testid={`campaign-simulate-${i}`}><Mail className="w-3.5 h-3.5 mr-1" /> Simular Envio</Button>
                      </>
                    )}
                    {c.status === 'active' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'paused')} data-testid={`campaign-pause-${i}`}><Pause className="w-3.5 h-3.5 mr-1" /> Pausar</Button>
                        <Button size="sm" variant="outline" onClick={() => simulateSending(c.id)} data-testid={`campaign-simulate-${i}`}><Mail className="w-3.5 h-3.5 mr-1" /> Simular Envio</Button>
                      </>
                    )}
                    {c.status === 'paused' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'active')}><Play className="w-3.5 h-3.5 mr-1" /> Reanudar</Button>
                    )}
                    {c.status === 'completed' && c.sent_count > 0 && (
                      <span className="text-xs text-zinc-400 py-1">Campana completada</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!campaigns.length && <p className="text-sm text-zinc-400 col-span-2">No hay campanas todavia. Crea tu primera campana para comenzar.</p>}
        </div>
      )}
    </div>
  );
}
