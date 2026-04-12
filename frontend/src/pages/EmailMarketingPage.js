import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { Plus, Mail, Users, Zap, BarChart3, Loader2, Play, Send, ArrowRight, Clock, CheckCircle2, X, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

const stepTypeIcons = { email: Mail, wait: Clock, condition: Zap };
const stepTypeLabels = { email: "Enviar Email", wait: "Esperar", condition: "Condicion" };

export default function EmailMarketingPage() {
  const navigate = useNavigate();
  const [lists, setLists] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [stats, setStats] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateList, setShowCreateList] = useState(false);
  const [showCreateCampaign, setShowCreateCampaign] = useState(false);
  const [showCreateAutomation, setShowCreateAutomation] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newCampaignTemplate, setNewCampaignTemplate] = useState('');
  const [newCampaignList, setNewCampaignList] = useState('');
  const [newAutoName, setNewAutoName] = useState('');

  const fetchData = async () => {
    try {
      const [l, c, a, s, t] = await Promise.all([
        api.get('/email-marketing/lists'),
        api.get('/email-marketing/campaigns'),
        api.get('/email-marketing/automations'),
        api.get('/email-marketing/stats'),
        api.get('/templates'),
      ]);
      setLists(l.data); setCampaigns(c.data); setAutomations(a.data); setStats(s.data); setTemplates(t.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      const { data } = await api.post('/email-marketing/lists', { name: newListName });
      setLists(prev => [data, ...prev]);
      setNewListName(''); setShowCreateList(false);
      toast.success('Lista creada');
    } catch { toast.error('Error al crear lista'); }
  };

  const createCampaign = async () => {
    if (!newCampaignName.trim()) return;
    try {
      const { data } = await api.post('/email-marketing/campaigns', { name: newCampaignName, template_id: newCampaignTemplate, list_id: newCampaignList });
      setCampaigns(prev => [data, ...prev]);
      setNewCampaignName(''); setNewCampaignTemplate(''); setNewCampaignList(''); setShowCreateCampaign(false);
      toast.success('Campana de email creada');
    } catch { toast.error('Error'); }
  };

  const simulateCampaign = async (id) => {
    try {
      const { data } = await api.post(`/email-marketing/campaigns/${id}/simulate`);
      setCampaigns(prev => prev.map(c => c.id === id ? data : c));
      fetchData();
      toast.success(`Simulacion: ${data.sent_count} enviados, ${data.open_count} aperturas, ${data.click_count} clics`);
    } catch { toast.error('Error en simulacion'); }
  };

  const createAutomation = async () => {
    if (!newAutoName.trim()) return;
    try {
      const { data } = await api.post('/email-marketing/automations', { name: newAutoName });
      setAutomations(prev => [data, ...prev]);
      setNewAutoName(''); setShowCreateAutomation(false);
      toast.success('Automatizacion creada con flujo por defecto');
    } catch { toast.error('Error'); }
  };

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Cargando Email Marketing...</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="email-marketing-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">Email Marketing</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Listas', value: stats?.lists || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Campanas', value: stats?.campaigns || 0, icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Enviados', value: stats?.total_sent || 0, icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Tasa Apertura', value: `${stats?.open_rate || 0}%`, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Tasa de Clics', value: `${stats?.click_rate || 0}%`, icon: Zap, color: 'text-cyan-600', bg: 'bg-cyan-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-zinc-200 rounded-xl">
            <CardContent className="p-4">
              <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${color}`} /></div>
              <p className="text-xl font-heading font-semibold text-zinc-900">{value}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="campaigns" data-testid="em-tab-campaigns"><Mail className="w-4 h-4 mr-1.5" />Campanas</TabsTrigger>
          <TabsTrigger value="automations" data-testid="em-tab-automations"><Zap className="w-4 h-4 mr-1.5" />Automatizaciones</TabsTrigger>
          <TabsTrigger value="lists" data-testid="em-tab-lists"><Users className="w-4 h-4 mr-1.5" />Listas</TabsTrigger>
        </TabsList>

        {/* Campaigns Tab */}
        <TabsContent value="campaigns">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateCampaign(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-email-campaign-btn"><Plus className="w-4 h-4 mr-2" /> Nueva Campana</Button>
            </div>
            {showCreateCampaign && (
              <Card className="border-blue-200 bg-blue-50/30 rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-medium text-zinc-900">Nueva Campana de Email</h3><Button variant="ghost" size="sm" onClick={() => setShowCreateCampaign(false)}><X className="w-4 h-4" /></Button></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label className="text-xs mb-1 block">Nombre *</Label>
                      <Input value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="Nombre de la campana" autoFocus data-testid="em-campaign-name-input" />
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Plantilla</Label>
                      <Select value={newCampaignTemplate} onValueChange={setNewCampaignTemplate}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar plantilla" /></SelectTrigger>
                        <SelectContent>
                          {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                          {!templates.length && <SelectItem value="none" disabled>Sin plantillas</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs mb-1 block">Lista</Label>
                      <Select value={newCampaignList} onValueChange={setNewCampaignList}>
                        <SelectTrigger><SelectValue placeholder="Seleccionar lista" /></SelectTrigger>
                        <SelectContent>
                          {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.subscriber_count})</SelectItem>)}
                          {!lists.length && <SelectItem value="none" disabled>Sin listas</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Button onClick={createCampaign} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="em-campaign-save-btn">Crear Campana</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/templates')} className="text-blue-600"><FileText className="w-3.5 h-3.5 mr-1" /> Ir a Plantillas</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            <div className="space-y-3">
              {campaigns.map((c, i) => (
                <Card key={c.id} className="border-zinc-200 rounded-xl" data-testid={`em-campaign-${i}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-zinc-900">{c.name}</h3>
                        <Badge className={c.status === 'enviada' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{c.status}</Badge>
                      </div>
                      {c.status === 'borrador' && (
                        <Button size="sm" variant="outline" onClick={() => simulateCampaign(c.id)}><Play className="w-3.5 h-3.5 mr-1" /> Simular Envio</Button>
                      )}
                    </div>
                    {c.sent_count > 0 && (
                      <div className="grid grid-cols-5 gap-4 text-center">
                        {[{ l: 'Enviados', v: c.sent_count }, { l: 'Aperturas', v: c.open_count }, { l: 'Clics', v: c.click_count }, { l: 'Rebotes', v: c.bounce_count }, { l: 'Desuscripciones', v: c.unsub_count }].map(({ l, v }) => (
                          <div key={l}><p className="text-lg font-heading font-semibold text-zinc-900">{v}</p><p className="text-[10px] text-zinc-500 uppercase">{l}</p></div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {!campaigns.length && <p className="text-sm text-zinc-400">No hay campanas de email. Crea la primera.</p>}
            </div>
          </div>
        </TabsContent>

        {/* Automations Tab */}
        <TabsContent value="automations">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateAutomation(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-automation-btn"><Plus className="w-4 h-4 mr-2" /> Nueva Automatizacion</Button>
            </div>
            {showCreateAutomation && (
              <Card className="border-blue-200 bg-blue-50/30 rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-medium text-zinc-900">Nueva Automatizacion</h3><Button variant="ghost" size="sm" onClick={() => setShowCreateAutomation(false)}><X className="w-4 h-4" /></Button></div>
                  <form onSubmit={e => { e.preventDefault(); createAutomation(); }} className="flex gap-3">
                    <Input value={newAutoName} onChange={e => setNewAutoName(e.target.value)} placeholder="Nombre de la automatizacion" className="flex-1" autoFocus data-testid="automation-name-input" />
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="automation-save-btn">Crear</Button>
                  </form>
                </CardContent>
              </Card>
            )}
            <div className="space-y-4">
              {automations.map((auto, i) => (
                <Card key={auto.id} className="border-zinc-200 rounded-xl" data-testid={`automation-${i}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-heading font-medium text-zinc-900">{auto.name}</h3>
                        <Badge className={auto.status === 'activa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{auto.status}</Badge>
                      </div>
                      <div className="text-xs text-zinc-500">{auto.steps?.length || 0} pasos</div>
                    </div>
                    {/* Visual Workflow */}
                    <div className="flex items-center gap-1 overflow-x-auto pb-2">
                      {(auto.steps || []).map((step, si) => {
                        const Icon = stepTypeIcons[step.type] || Mail;
                        return (
                          <div key={si} className="flex items-center gap-1 flex-shrink-0">
                            <div className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 ${step.type === 'email' ? 'bg-blue-50 border-blue-200 text-blue-700' : step.type === 'wait' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}>
                              <Icon className="w-3 h-3" />
                              <span>{step.subject || stepTypeLabels[step.type]}</span>
                              {step.delay_days > 0 && <span className="font-medium">({step.delay_days}d)</span>}
                            </div>
                            {si < (auto.steps?.length || 0) - 1 && <ArrowRight className="w-3 h-3 text-zinc-300 flex-shrink-0" />}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!automations.length && <p className="text-sm text-zinc-400">No hay automatizaciones. Crea la primera para configurar un flujo de emails.</p>}
            </div>
          </div>
        </TabsContent>

        {/* Lists Tab */}
        <TabsContent value="lists">
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={() => setShowCreateList(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-list-btn"><Plus className="w-4 h-4 mr-2" /> Nueva Lista</Button>
            </div>
            {showCreateList && (
              <Card className="border-blue-200 bg-blue-50/30 rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-medium text-zinc-900">Nueva Lista</h3><Button variant="ghost" size="sm" onClick={() => setShowCreateList(false)}><X className="w-4 h-4" /></Button></div>
                  <form onSubmit={e => { e.preventDefault(); createList(); }} className="flex gap-3">
                    <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Nombre de la lista" className="flex-1" autoFocus data-testid="list-name-input" />
                    <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="list-save-btn">Crear</Button>
                  </form>
                </CardContent>
              </Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map((list, i) => (
                <Card key={list.id} className="border-zinc-200 rounded-xl" data-testid={`email-list-${i}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div>
                      <div>
                        <h3 className="font-medium text-zinc-900 text-sm">{list.name}</h3>
                        <p className="text-xs text-zinc-500">{list.subscriber_count} suscriptores</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!lists.length && <p className="text-sm text-zinc-400 col-span-3">No hay listas. Crea la primera para organizar tus contactos.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
