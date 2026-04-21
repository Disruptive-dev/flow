import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, Mail, Users, Zap, BarChart3, Loader2, Play, Send, ArrowRight, Clock, CheckCircle2, X, FileText, Pencil, Trash2, Rocket, Eye } from 'lucide-react';
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
  const [editingCampaign, setEditingCampaign] = useState(null);
  const [editingList, setEditingList] = useState(null);
  const [sendingReal, setSendingReal] = useState(null);
  const [viewingList, setViewingList] = useState(null);
  const [listLeads, setListLeads] = useState([]);
  const [pickLeadsOpen, setPickLeadsOpen] = useState(null);
  const [availableLeads, setAvailableLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [pickedLeads, setPickedLeads] = useState([]);
  const [editCampaign, setEditCampaign] = useState(null);

  const fetchData = async () => {
    try {
      const [l, c, a, s, t] = await Promise.all([
        api.get('/email-marketing/lists'), api.get('/email-marketing/campaigns'),
        api.get('/email-marketing/automations'), api.get('/email-marketing/stats'), api.get('/templates'),
      ]);
      setLists(l.data); setCampaigns(c.data); setAutomations(a.data); setStats(s.data); setTemplates(t.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };
  useEffect(() => { fetchData(); }, []);

  const createList = async () => { if (!newListName.trim()) return; try { const { data } = await api.post('/email-marketing/lists', { name: newListName }); setLists(prev => [data, ...prev]); setNewListName(''); setShowCreateList(false); toast.success('Lista creada'); } catch { toast.error('Error'); } };
  const deleteList = async (id) => { try { await api.delete(`/email-marketing/lists/${id}`); setLists(prev => prev.filter(l => l.id !== id)); toast.success('Lista eliminada'); } catch { toast.error('Error'); } };
  const createCampaign = async () => { if (!newCampaignName.trim()) return; try { const { data } = await api.post('/email-marketing/campaigns', { name: newCampaignName, template_id: newCampaignTemplate, list_id: newCampaignList }); setCampaigns(prev => [data, ...prev]); setNewCampaignName(''); setNewCampaignTemplate(''); setNewCampaignList(''); setShowCreateCampaign(false); toast.success('Campana creada'); } catch { toast.error('Error'); } };
  const deleteCampaign = async (id) => { try { await api.delete(`/email-marketing/campaigns/${id}`); setCampaigns(prev => prev.filter(c => c.id !== id)); toast.success('Campana eliminada'); } catch { toast.error('Error'); } };
  const simulateCampaign = async (id) => { try { const { data } = await api.post(`/email-marketing/campaigns/${id}/simulate`); setCampaigns(prev => prev.map(c => c.id === id ? data : c)); fetchData(); toast.success(`Simulacion: ${data.sent_count} enviados`); } catch { toast.error('Error'); } };
  const sendRealCampaign = async (id) => {
    setSendingReal(id);
    try {
      const { data } = await api.post(`/email-marketing/campaigns/${id}/send-real`);
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status: 'enviada', sent_count: data.sent } : c));
      toast.success(`${data.sent} emails enviados exitosamente!`);
      if (data.errors?.length) toast.error(`${data.errors.length} errores: ${data.errors[0]}`);
      fetchData();
    } catch (err) { toast.error(err?.response?.data?.detail || 'Error al enviar'); }
    setSendingReal(null);
  };
  const createAutomation = async () => { if (!newAutoName.trim()) return; try { const { data } = await api.post('/email-marketing/automations', { name: newAutoName }); setAutomations(prev => [data, ...prev]); setNewAutoName(''); setShowCreateAutomation(false); toast.success('Automatizacion creada'); } catch { toast.error('Error'); } };
  const deleteAutomation = async (id) => { try { await api.delete(`/email-marketing/automations/${id}`); setAutomations(prev => prev.filter(a => a.id !== id)); toast.success('Eliminada'); } catch { toast.error('Error'); } };
  const toggleAutomationStatus = async (auto) => { const ns = auto.status === 'activa' ? 'borrador' : 'activa'; try { const { data } = await api.put(`/email-marketing/automations/${auto.id}`, { status: ns }); setAutomations(prev => prev.map(a => a.id === auto.id ? data : a)); toast.success(`${ns === 'activa' ? 'Activada' : 'Pausada'}`); } catch { toast.error('Error'); } };
  const autoCreateList = async () => {
    try {
      const { data } = await api.post('/email-marketing/auto-list-from-leads', { name: `Leads calificados - ${new Date().toLocaleDateString()}` });
      setLists(prev => [data, ...prev]);
      toast.success(`Lista creada con ${data.subscriber_count} leads calificados`);
    } catch { toast.error('Error al crear lista automatica'); }
  };
  const addLeadsToList = async (listId) => {
    try {
      const { data } = await api.post(`/email-marketing/lists/${listId}/add-leads`, {});
      setLists(prev => prev.map(l => l.id === listId ? { ...l, subscriber_count: data.total } : l));
      toast.success(`${data.message}`);
    } catch { toast.error('Error'); }
  };
  const viewListLeads = async (list) => {
    setViewingList(list);
    try {
      const { data } = await api.get(`/email-marketing/lists/${list.id}/leads`);
      setListLeads(data.leads || []);
    } catch { setListLeads([]); }
  };
  const removeLeadFromList = async (leadId) => {
    if (!viewingList) return;
    try {
      const { data } = await api.post(`/email-marketing/lists/${viewingList.id}/remove-leads`, { lead_ids: [leadId] });
      setListLeads(prev => prev.filter(l => l.id !== leadId));
      setLists(prev => prev.map(l => l.id === viewingList.id ? { ...l, subscriber_count: data.total } : l));
      toast.success('Lead removido de la lista');
    } catch { toast.error('Error'); }
  };

  const openPickLeads = async (listId) => {
    setPickLeadsOpen(listId);
    setPickedLeads([]);
    setLeadSearch('');
    setLeadSourceFilter('');
    setLeadStatusFilter('');
    try {
      const { data } = await api.get('/leads', { params: { limit: 200 } });
      setAvailableLeads(data.leads || []);
    } catch { setAvailableLeads([]); }
  };
  const confirmPickLeads = async () => {
    if (!pickLeadsOpen || !pickedLeads.length) return;
    try {
      const { data } = await api.post(`/email-marketing/lists/${pickLeadsOpen}/add-manual-leads`, { lead_ids: pickedLeads });
      setLists(prev => prev.map(l => l.id === pickLeadsOpen ? { ...l, subscriber_count: data.total } : l));
      toast.success(`${pickedLeads.length} leads agregados a la lista`);
      setPickLeadsOpen(null);
      setPickedLeads([]);
    } catch { toast.error('Error al agregar leads'); }
  };
  const saveEditCampaign = async () => {
    if (!editCampaign) return;
    try {
      const { data } = await api.put(`/email-marketing/campaigns/${editCampaign.id}`, { name: editCampaign.name, list_id: editCampaign.list_id, template_id: editCampaign.template_id });
      setCampaigns(prev => prev.map(c => c.id === editCampaign.id ? data : c));
      setEditCampaign(null);
      toast.success('Campana actualizada');
    } catch { toast.error('Error'); }
  };

  const startEditAutomation = (auto) => { setEditingAutomation(auto); setEditSteps([...(auto.steps || [])]); setEditTrigger(auto.trigger || 'manual'); };
  const addStep = (type) => { const s = type === 'email' ? { type: 'email', delay_days: 0, subject: 'Nuevo email', template: '' } : type === 'wait' ? { type: 'wait', delay_days: 2, subject: '', template: '' } : { type: 'condition', delay_days: 0, subject: 'Si abrio email', template: '' }; setEditSteps(prev => [...prev, s]); };
  const removeStep = (idx) => setEditSteps(prev => prev.filter((_, i) => i !== idx));
  const updateStep = (idx, f, v) => setEditSteps(prev => prev.map((s, i) => i === idx ? { ...s, [f]: v } : s));
  const saveAutomation = async () => { if (!editingAutomation) return; try { const { data } = await api.put(`/email-marketing/automations/${editingAutomation.id}`, { steps: editSteps, trigger: editTrigger }); setAutomations(prev => prev.map(a => a.id === editingAutomation.id ? data : a)); setEditingAutomation(null); toast.success('Guardada'); } catch { toast.error('Error'); } };

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="email-marketing-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">Email Marketing</h1>
        <FlowBotButton section="email_marketing" />
      </div>
      <GuideBanner section="email_marketing" />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[{ label: 'Listas', value: stats?.lists || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },{ label: 'Campanas', value: stats?.campaigns || 0, icon: Mail, color: 'text-purple-600', bg: 'bg-purple-50' },{ label: 'Total Enviados', value: stats?.total_sent || 0, icon: Send, color: 'text-emerald-600', bg: 'bg-emerald-50' },{ label: 'Tasa Apertura', value: `${stats?.open_rate || 0}%`, icon: BarChart3, color: 'text-amber-600', bg: 'bg-amber-50' },{ label: 'Tasa de Clics', value: `${stats?.click_rate || 0}%`, icon: Zap, color: 'text-cyan-600', bg: 'bg-cyan-50' }].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label} className="border-zinc-200 rounded-xl"><CardContent className="p-4"><div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center mb-2`}><Icon className={`w-4 h-4 ${color}`} /></div><p className="text-xl font-heading font-semibold text-zinc-900">{value}</p><p className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="campaigns">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="campaigns" data-testid="em-tab-campaigns"><Mail className="w-4 h-4 mr-1.5" />Campanas</TabsTrigger>
          <TabsTrigger value="automations" data-testid="em-tab-automations"><Zap className="w-4 h-4 mr-1.5" />Automatizaciones</TabsTrigger>
          <TabsTrigger value="lists" data-testid="em-tab-lists"><Users className="w-4 h-4 mr-1.5" />Listas</TabsTrigger>
        </TabsList>

        {/* Campaigns */}
        <TabsContent value="campaigns">
          <div className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => setShowCreateCampaign(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-email-campaign-btn"><Plus className="w-4 h-4 mr-2" /> Nueva Campana</Button></div>
            {showCreateCampaign && (
              <Card className="border-blue-200 bg-blue-50/30 rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3"><h3 className="font-medium text-zinc-900">Nueva Campana</h3><Button variant="ghost" size="sm" onClick={() => setShowCreateCampaign(false)}><X className="w-4 h-4" /></Button></div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div><Label className="text-xs mb-1 block">Nombre *</Label><Input value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="Campana Q1" data-testid="em-campaign-name-input" /></div>
                    <div><Label className="text-xs mb-1 block">Plantilla</Label>
                      <Select value={newCampaignTemplate} onValueChange={setNewCampaignTemplate}><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger><SelectContent>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select>
                    </div>
                    <div><Label className="text-xs mb-1 block">Lista de Leads</Label>
                      <Select value={newCampaignList} onValueChange={setNewCampaignList}><SelectTrigger><SelectValue placeholder="Seleccionar lista..." /></SelectTrigger><SelectContent>{lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.subscriber_count})</SelectItem>)}</SelectContent></Select>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-4">
                    <Button onClick={createCampaign} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="em-campaign-save-btn">Crear</Button>
                    <Button variant="ghost" size="sm" onClick={() => navigate('/templates')} className="text-blue-600"><FileText className="w-3.5 h-3.5 mr-1" /> Ir a Plantillas</Button>
                  </div>
                </CardContent>
              </Card>
            )}
            {campaigns.map((c, i) => (
              <Card key={c.id} className="border-zinc-200 rounded-xl" data-testid={`em-campaign-${i}`}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-zinc-900">{c.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={c.status === 'enviada' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{c.status}</Badge>
                        {c.list_id ? <span className="text-xs text-emerald-600">Lista: {lists.find(l => l.id === c.list_id)?.name || 'vinculada'}</span> : <span className="text-xs text-red-400">Sin lista</span>}
                        {c.template_id ? <span className="text-xs text-emerald-600">Plantilla: {templates.find(t => t.id === c.template_id)?.name || 'vinculada'}</span> : <span className="text-xs text-red-400">Sin plantilla</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.status === 'borrador' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setEditCampaign(c)} data-testid={`em-edit-campaign-${i}`}><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>
                          <Button size="sm" variant="outline" onClick={() => simulateCampaign(c.id)} data-testid={`em-simulate-${i}`}><Play className="w-3.5 h-3.5 mr-1" /> Simular</Button>
                          {c.list_id && c.template_id && (
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => sendRealCampaign(c.id)} disabled={sendingReal === c.id} data-testid={`em-send-real-${i}`}>
                              {sendingReal === c.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Rocket className="w-3.5 h-3.5 mr-1" />} Enviar
                            </Button>
                          )}
                        </>
                      )}
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteCampaign(c.id)} data-testid={`em-delete-campaign-${i}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
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
            {!campaigns.length && <p className="text-sm text-zinc-400">No hay campanas. Crea la primera.</p>}
          </div>
        </TabsContent>

        {/* Automations */}
        <TabsContent value="automations">
          <div className="space-y-4">
            <div className="flex justify-end"><Button onClick={() => setShowCreateAutomation(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-automation-btn"><Plus className="w-4 h-4 mr-2" /> Nueva Automatizacion</Button></div>
            {showCreateAutomation && (
              <Card className="border-blue-200 bg-blue-50/30 rounded-xl"><CardContent className="p-5">
                <div className="flex items-center justify-between mb-3"><h3 className="font-medium">Nueva Automatizacion</h3><Button variant="ghost" size="sm" onClick={() => setShowCreateAutomation(false)}><X className="w-4 h-4" /></Button></div>
                <form onSubmit={e => { e.preventDefault(); createAutomation(); }} className="flex gap-3"><Input value={newAutoName} onChange={e => setNewAutoName(e.target.value)} placeholder="Nombre" className="flex-1" data-testid="automation-name-input" /><Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="automation-save-btn">Crear</Button></form>
              </CardContent></Card>
            )}
            {automations.map((auto, i) => (
              <Card key={auto.id} className="border-zinc-200 rounded-xl" data-testid={`automation-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div><h3 className="font-heading font-medium text-zinc-900">{auto.name}</h3><div className="flex items-center gap-2 mt-1"><Badge className={auto.status === 'activa' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{auto.status}</Badge><Badge variant="outline" className="text-[10px]">{triggerLabels[auto.trigger] || auto.trigger}</Badge></div></div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => toggleAutomationStatus(auto)}>{auto.status === 'activa' ? 'Pausar' : 'Activar'}</Button>
                      <Button size="sm" variant="outline" onClick={() => startEditAutomation(auto)}><Pencil className="w-3.5 h-3.5 mr-1" /> Editar</Button>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteAutomation(auto.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 overflow-x-auto pb-2">
                    {(auto.steps || []).map((step, si) => { const Icon = stepTypeIcons[step.type] || Mail; return (<div key={si} className="flex items-center gap-1 flex-shrink-0"><div className={`px-3 py-2 rounded-lg border text-xs flex items-center gap-1.5 ${step.type === 'email' ? 'bg-blue-50 border-blue-200 text-blue-700' : step.type === 'wait' ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-purple-50 border-purple-200 text-purple-700'}`}><Icon className="w-3 h-3" /><span>{step.subject || stepTypeLabels[step.type]}</span>{step.delay_days > 0 && <span className="font-medium">({step.delay_days}d)</span>}</div>{si < (auto.steps?.length || 0) - 1 && <ArrowRight className="w-3 h-3 text-zinc-300" />}</div>); })}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!automations.length && <p className="text-sm text-zinc-400">No hay automatizaciones.</p>}
          </div>
          {/* Edit Dialog */}
          <Dialog open={!!editingAutomation} onOpenChange={(o) => !o && setEditingAutomation(null)}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader><DialogTitle className="font-heading">Editar: {editingAutomation?.name}</DialogTitle></DialogHeader>
              <div className="space-y-6 mt-4">
                <div><Label className="text-sm mb-2 block">Disparador</Label><Select value={editTrigger} onValueChange={setEditTrigger}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(triggerLabels).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent></Select></div>
                <Separator />
                <div><Label className="text-sm mb-3 block">Pasos ({editSteps.length})</Label>
                  <div className="space-y-3">
                    {editSteps.map((step, idx) => { const Icon = stepTypeIcons[step.type] || Mail; return (<div key={idx} className={`p-4 rounded-lg border ${step.type === 'email' ? 'border-blue-200 bg-blue-50/50' : step.type === 'wait' ? 'border-amber-200 bg-amber-50/50' : 'border-purple-200 bg-purple-50/50'}`}><div className="flex items-center justify-between mb-3"><Badge variant="outline" className="text-xs"><Icon className="w-3 h-3 mr-1" /> Paso {idx + 1}</Badge><Button size="sm" variant="ghost" className="text-red-400 h-7 w-7 p-0" onClick={() => removeStep(idx)}><X className="w-3.5 h-3.5" /></Button></div><div className="grid grid-cols-3 gap-3"><div><Label className="text-[10px] mb-1 block">Tipo</Label><Select value={step.type} onValueChange={v => updateStep(idx, 'type', v)}><SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="email">Email</SelectItem><SelectItem value="wait">Esperar</SelectItem><SelectItem value="condition">Condicion</SelectItem></SelectContent></Select></div><div><Label className="text-[10px] mb-1 block">{step.type === 'wait' ? 'Dias' : 'Asunto'}</Label>{step.type === 'wait' ? <Input type="number" min={0} value={step.delay_days} onChange={e => updateStep(idx, 'delay_days', parseInt(e.target.value) || 0)} className="h-8 text-xs" /> : <Input value={step.subject} onChange={e => updateStep(idx, 'subject', e.target.value)} className="h-8 text-xs" />}</div>{step.type === 'email' && <div><Label className="text-[10px] mb-1 block">Plantilla</Label><Select value={step.template || ''} onValueChange={v => updateStep(idx, 'template', v)}><SelectTrigger className="h-8 text-xs"><SelectValue placeholder="..." /></SelectTrigger><SelectContent><SelectItem value="">Sin plantilla</SelectItem>{templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent></Select></div>}</div></div>); })}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => addStep('email')} className="text-blue-600 border-blue-200"><Mail className="w-3.5 h-3.5 mr-1" /> + Email</Button>
                    <Button size="sm" variant="outline" onClick={() => addStep('wait')} className="text-amber-600 border-amber-200"><Clock className="w-3.5 h-3.5 mr-1" /> + Espera</Button>
                    <Button size="sm" variant="outline" onClick={() => addStep('condition')} className="text-purple-600 border-purple-200"><Zap className="w-3.5 h-3.5 mr-1" /> + Condicion</Button>
                  </div>
                </div>
                <div className="flex gap-3"><Button onClick={saveAutomation} className="bg-blue-600 hover:bg-blue-700 text-white"><CheckCircle2 className="w-4 h-4 mr-2" /> Guardar</Button><Button variant="outline" onClick={() => setEditingAutomation(null)}>Cancelar</Button></div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Lists */}
        <TabsContent value="lists">
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={autoCreateList} className="border-emerald-200 text-emerald-700" data-testid="auto-list-btn"><Zap className="w-4 h-4 mr-2" /> Auto-lista de Leads Calificados</Button>
              <Button onClick={() => setShowCreateList(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-list-btn"><Plus className="w-4 h-4 mr-2" /> Nueva Lista</Button>
            </div>
            {showCreateList && (
              <Card className="border-blue-200 bg-blue-50/30 rounded-xl"><CardContent className="p-5">
                <div className="flex items-center justify-between mb-3"><h3 className="font-medium">Nueva Lista</h3><Button variant="ghost" size="sm" onClick={() => setShowCreateList(false)}><X className="w-4 h-4" /></Button></div>
                <form onSubmit={e => { e.preventDefault(); createList(); }} className="flex gap-3"><Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Nombre de la lista" className="flex-1" data-testid="list-name-input" /><Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="list-save-btn">Crear</Button></form>
              </CardContent></Card>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {lists.map((list, i) => (
                <Card key={list.id} className="border-zinc-200 rounded-xl" data-testid={`email-list-${i}`}>
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="w-4 h-4 text-blue-600" /></div>
                        <div><h3 className="font-medium text-zinc-900 text-sm">{list.name}</h3><p className="text-xs text-zinc-500">{list.subscriber_count} leads</p></div>
                      </div>
                      <Button size="sm" variant="ghost" className="text-red-500" onClick={() => deleteList(list.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => viewListLeads(list)} data-testid={`view-list-${i}`}><Eye className="w-3 h-3 mr-1" /> Ver Leads</Button>
                      <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openPickLeads(list.id)} data-testid={`pick-leads-list-${i}`}><Plus className="w-3 h-3 mr-1" /> Agregar Leads</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {!lists.length && <p className="text-sm text-zinc-400 col-span-3">No hay listas. Usa "Auto-lista" para crear una con los leads calificados.</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* View List Leads Dialog */}
      <Dialog open={!!viewingList} onOpenChange={(o) => !o && setViewingList(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Lista: {viewingList?.name} ({listLeads.length} leads)</DialogTitle></DialogHeader>
          <div className="space-y-2 mt-4">
            {listLeads.map((lead, i) => (
              <div key={lead.id} className="flex items-center justify-between p-3 bg-zinc-50 rounded-lg" data-testid={`list-lead-${i}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{lead.business_name}</p>
                  <p className="text-xs text-zinc-500">{lead.email || 'Sin email'} · {lead.city} · Score: {lead.ai_score}</p>
                </div>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-600 flex-shrink-0" onClick={() => removeLeadFromList(lead.id)}>
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
            {!listLeads.length && <p className="text-sm text-zinc-400 text-center py-4">Lista vacia</p>}
          </div>
        </DialogContent>
      </Dialog>

      {/* Pick Leads Dialog */}
      <Dialog open={!!pickLeadsOpen} onOpenChange={(o) => !o && setPickLeadsOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-heading">Agregar Leads a la Lista</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Buscar por nombre, email..." className="flex-1" data-testid="pick-leads-search" />
            <Select value={leadSourceFilter || 'all'} onValueChange={v => setLeadSourceFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Fuente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="google_maps">B2B</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="bot">Bot</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={leadStatusFilter || 'all'} onValueChange={v => setLeadStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]"><SelectValue placeholder="Estado" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="scored">Calificados</SelectItem>
                <SelectItem value="approved">Aprobados</SelectItem>
                <SelectItem value="rejected">Rechazados</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {availableLeads.filter(l => {
              if (leadSourceFilter && l.source !== leadSourceFilter) return false;
              if (leadStatusFilter && l.status !== leadStatusFilter) return false;
              if (!leadSearch) return true;
              const q = leadSearch.toLowerCase();
              return (l.business_name||'').toLowerCase().includes(q) || (l.email||'').toLowerCase().includes(q) || (l.city||'').toLowerCase().includes(q);
            }).map((lead, i) => (
              <label key={lead.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${pickedLeads.includes(lead.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-zinc-50 border border-transparent'}`} data-testid={`pick-lead-${i}`}>
                <input type="checkbox" checked={pickedLeads.includes(lead.id)} onChange={e => { if (e.target.checked) setPickedLeads(p => [...p, lead.id]); else setPickedLeads(p => p.filter(id => id !== lead.id)); }} className="rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{lead.business_name}</p>
                  <p className="text-xs text-zinc-500">{lead.email || 'Sin email'} · {lead.city} · Score: {lead.ai_score}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <p className="text-sm text-zinc-500">{pickedLeads.length} leads seleccionados</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPickLeadsOpen(null)}>Cancelar</Button>
              <Button onClick={confirmPickLeads} disabled={!pickedLeads.length} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-pick-leads">Agregar a Lista</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      {/* Edit Campaign Dialog */}
      <Dialog open={!!editCampaign} onOpenChange={(o) => !o && setEditCampaign(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Editar Campana</DialogTitle></DialogHeader>
          {editCampaign && (
            <div className="space-y-4">
              <div><Label>Nombre</Label><Input value={editCampaign.name} onChange={e => setEditCampaign(p => ({...p, name: e.target.value}))} /></div>
              <div>
                <Label>Lista de Leads</Label>
                <Select value={editCampaign.list_id || 'none'} onValueChange={v => setEditCampaign(p => ({...p, list_id: v === 'none' ? '' : v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar lista..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin lista</SelectItem>
                    {lists.map(l => <SelectItem key={l.id} value={l.id}>{l.name} ({l.subscriber_count})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Plantilla</Label>
                <Select value={editCampaign.template_id || 'none'} onValueChange={v => setEditCampaign(p => ({...p, template_id: v === 'none' ? '' : v}))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar plantilla..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin plantilla</SelectItem>
                    {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditCampaign(null)}>Cancelar</Button>
            <Button onClick={saveEditCampaign} className="bg-blue-600 hover:bg-blue-700 text-white">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
