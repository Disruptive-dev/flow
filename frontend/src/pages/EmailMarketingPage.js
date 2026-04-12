import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Mail, Users, Zap, BarChart3, Loader2, Play, Send, ArrowRight, Clock, CheckCircle2, X, FileText, Pencil, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import FlowBotButton from '@/components/FlowBotButton';
import GuideBanner from '@/components/GuideBanner';

const stepTypeIcons = { email: Mail, wait: Clock, condition: Zap };
const stepTypeLabels = { email: "Enviar Email", wait: "Esperar", condition: "Condicion" };
const triggerLabels = { manual: "Manual", lead_approved: "Lead aprobado", lead_scored: "Lead calificado", contact_created: "Contacto creado", form_submitted: "Formulario enviado" };

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
  const [editingAutomation, setEditingAutomation] = useState(null);
  const [editSteps, setEditSteps] = useState([]);
  const [editTrigger, setEditTrigger] = useState('manual');

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

  const startEditAutomation = (auto) => {
    setEditingAutomation(auto);
    setEditSteps([...(auto.steps || [])]);
    setEditTrigger(auto.trigger || 'manual');
  };

  const addStep = (type) => {
    const newStep = type === 'email'
      ? { type: 'email', delay_days: 0, subject: 'Nuevo email', template: '' }
      : type === 'wait'
      ? { type: 'wait', delay_days: 2, subject: '', template: '' }
      : { type: 'condition', delay_days: 0, subject: 'Si abrio email', template: '' };
    setEditSteps(prev => [...prev, newStep]);
  };

  const removeStep = (idx) => setEditSteps(prev => prev.filter((_, i) => i !== idx));

  const updateStep = (idx, field, value) => {
    setEditSteps(prev => prev.map((s, i) => i === idx ? { ...s, [field]: value } : s));
  };

  const saveAutomation = async () => {
    if (!editingAutomation) return;
    try {
      const { data } = await api.put(`/email-marketing/automations/${editingAutomation.id}`, {
        steps: editSteps,
        trigger: editTrigger
      });
      setAutomations(prev => prev.map(a => a.id === editingAutomation.id ? data : a));
      setEditingAutomation(null);
      toast.success('Automatizacion actualizada');
    } catch { toast.error('Error al guardar'); }
  };

  const deleteAutomation = async (id) => {
    try {
      await api.delete(`/email-marketing/automations/${id}`);
      setAutomations(prev => prev.filter(a => a.id !== id));
      toast.success('Automatizacion eliminada');
    } catch { toast.error('Error al eliminar'); }
  };

  const toggleAutomationStatus = async (auto) => {
    const newStatus = auto.status === 'activa' ? 'borrador' : 'activa';
    try {
      const { data } = await api.put(`/email-marketing/automations/${auto.id}`, { status: newStatus });
      setAutomations(prev => prev.map(a => a.id === auto.id ? data : a));
      toast.success(`Automatizacion ${newStatus === 'activa' ? 'activada' : 'pausada'}`);
    } catch { toast.error('Error'); }
  };

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Cargando Email Marketing...</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="email-marketing-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">Email Marketing</h1>
        <FlowBotButton section="email_marketing" />
      </div>

      <GuideBanner section="email_marketing" />

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

        {/* Automations Tab - Editable */}
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={auto.status === 'activa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{auto.status}</Badge>
                          <Badge variant="outline" className="text-[10px]">{triggerLabels[auto.trigger] || auto.trigger}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleAutomationStatus(auto)} data-testid={`automation-toggle-${i}`}>
                          {auto.status === 'activa' ? 'Pausar' : 'Activar'}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => startEditAutomation(auto)} data-testid={`automation-edit-${i}`}>
                          <Pencil className="w-3.5 h-3.5 mr-1" /> Editar
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700" onClick={() => deleteAutomation(auto.id)} data-testid={`automation-delete-${i}`}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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

          {/* Edit Automation Dialog */}
          <Dialog open={!!editingAutomation} onOpenChange={(open) => !open && setEditingAutomation(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Editar Automatizacion: {editingAutomation?.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Trigger */}
                <div>
                  <Label className="text-sm mb-2 block font-medium">Disparador</Label>
                  <Select value={editTrigger} onValueChange={setEditTrigger}>
                    <SelectTrigger data-testid="edit-trigger"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(triggerLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Steps */}
                <div>
                  <Label className="text-sm mb-3 block font-medium">Pasos del flujo ({editSteps.length})</Label>
                  <div className="space-y-3">
                    {editSteps.map((step, idx) => {
                      const Icon = stepTypeIcons[step.type] || Mail;
                      return (
                        <div key={idx} className={`p-4 rounded-lg border ${step.type === 'email' ? 'border-blue-200 bg-blue-50/50' : step.type === 'wait' ? 'border-amber-200 bg-amber-50/50' : 'border-purple-200 bg-purple-50/50'}`} data-testid={`edit-step-${idx}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs"><Icon className="w-3 h-3 mr-1" /> Paso {idx + 1}</Badge>
                            </div>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 h-7 w-7 p-0" onClick={() => removeStep(idx)}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <Label className="text-[10px] mb-1 block text-zinc-500">Tipo</Label>
                              <Select value={step.type} onValueChange={v => updateStep(idx, 'type', v)}>
                                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="email">Enviar Email</SelectItem>
                                  <SelectItem value="wait">Esperar</SelectItem>
                                  <SelectItem value="condition">Condicion</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-[10px] mb-1 block text-zinc-500">{step.type === 'wait' ? 'Dias de espera' : 'Asunto / Descripcion'}</Label>
                              {step.type === 'wait' ? (
                                <Input type="number" min={0} value={step.delay_days} onChange={e => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)} className="h-8 text-xs" />
                              ) : (
                                <Input value={step.subject} onChange={e => updateStep(idx, 'subject', e.target.value)} className="h-8 text-xs" placeholder={step.type === 'condition' ? 'Ej: Si abrio email' : 'Asunto del email'} />
                              )}
                            </div>
                            {step.type === 'email' && (
                              <div>
                                <Label className="text-[10px] mb-1 block text-zinc-500">Plantilla</Label>
                                <Select value={step.template || 'none'} onValueChange={v => updateStep(idx, 'template', v === 'none' ? '' : v)}>
                                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">Sin plantilla</SelectItem>
                                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Add Step Buttons */}
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => addStep('email')} className="text-blue-600 border-blue-200" data-testid="add-step-email">
                      <Mail className="w-3.5 h-3.5 mr-1" /> + Email
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addStep('wait')} className="text-amber-600 border-amber-200" data-testid="add-step-wait">
                      <Clock className="w-3.5 h-3.5 mr-1" /> + Espera
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => addStep('condition')} className="text-purple-600 border-purple-200" data-testid="add-step-condition">
                      <Zap className="w-3.5 h-3.5 mr-1" /> + Condicion
                    </Button>
                  </div>
                </div>

                <Separator />
                <div className="flex gap-3">
                  <Button onClick={saveAutomation} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-automation-btn">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Guardar Cambios
                  </Button>
                  <Button variant="outline" onClick={() => setEditingAutomation(null)}>Cancelar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
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
