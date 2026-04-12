import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Plus, Mail, Eye, Pause, Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

const campaignStatusColors = { draft: "bg-slate-100 text-slate-700", active: "bg-emerald-50 text-emerald-700", paused: "bg-amber-50 text-amber-700", completed: "bg-blue-50 text-blue-700" };

export default function CampaignsPage() {
  const { t } = useLanguage();
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    api.get('/campaigns').then(r => setCampaigns(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { data } = await api.post('/campaigns', { name: newName });
      setCampaigns(prev => [data, ...prev]);
      setDialogOpen(false);
      setNewName('');
      toast.success('Campaign created');
    } catch (err) { toast.error('Failed to create campaign'); }
    setCreating(false);
  };

  const updateStatus = async (id, status) => {
    try {
      const { data } = await api.put(`/campaigns/${id}`, { status });
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
      toast.success(`Campaign ${status}`);
    } catch { toast.error('Failed to update'); }
  };

  return (
    <div className="space-y-6 animate-fade-in" data-testid="campaigns-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('campaigns')}</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-campaign-button"><Plus className="w-4 h-4 mr-2" />{t('create_campaign')}</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-heading">{t('create_campaign')}</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label className="text-sm mb-1.5 block">{t('campaign_name')}</Label>
                <Input data-testid="campaign-name-input" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Real Estate Q1 2026" />
              </div>
              <Button onClick={handleCreate} disabled={creating} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="campaign-save-button">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('create')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading campaigns...</div>
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
                      <p className="text-xs text-zinc-500 mt-0.5">Created by {c.created_by}</p>
                    </div>
                    <Badge className={campaignStatusColors[c.status] || campaignStatusColors.draft}>{c.status}</Badge>
                  </div>
                  <Progress value={sentPct} className="h-1.5 mb-4" />
                  <div className="grid grid-cols-3 gap-3 text-center mb-4">
                    {[
                      { label: 'Sent', value: c.sent_count },
                      { label: 'Opens', value: c.open_count },
                      { label: 'Clicks', value: c.click_count },
                      { label: 'Replies', value: c.reply_count },
                      { label: 'Interested', value: c.interested_count },
                      { label: 'CRM', value: c.crm_count },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-lg font-heading font-semibold text-zinc-900">{value}</p>
                        <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    {c.status === 'draft' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'active')} data-testid={`campaign-activate-${i}`}><Play className="w-3.5 h-3.5 mr-1" /> Activate</Button>
                    )}
                    {c.status === 'active' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'paused')} data-testid={`campaign-pause-${i}`}><Pause className="w-3.5 h-3.5 mr-1" /> Pause</Button>
                    )}
                    {c.status === 'paused' && (
                      <Button size="sm" variant="outline" onClick={() => updateStatus(c.id, 'active')}><Play className="w-3.5 h-3.5 mr-1" /> Resume</Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {!campaigns.length && <p className="text-sm text-zinc-400 col-span-2">No campaigns yet. Create your first campaign to get started.</p>}
        </div>
      )}
    </div>
  );
}
