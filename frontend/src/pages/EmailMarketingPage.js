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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { Plus, Mail, Users, Zap, BarChart3, Loader2, Play, Send, Clock, CheckCircle2, X, FileText, Pencil, Trash2, Rocket, Eye, Filter, Target } from 'lucide-react';
import { toast } from 'sonner';
import FlowBotButton from '@/components/FlowBotButton';

export default function EmailMarketingPage() {
  const [tab, setTab] = useState('plantillas');
  const [templates, setTemplates] = useState([]);
  const [lists, setLists] = useState([]);
  const [segments, setSegments] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  // Dialogs
  const [newCampaignName, setNewCampaignName] = useState('');
  const [newListName, setNewListName] = useState('');
  const [editCampaign, setEditCampaign] = useState(null);
  const [createSegOpen, setCreateSegOpen] = useState(false);
  const [segForm, setSegForm] = useState({ name: '', rules: [{ field: 'source', operator: 'equals', value: '' }] });
  const [sendingReal, setSendingReal] = useState(null);
  // Pick leads for lists
  const [pickLeadsOpen, setPickLeadsOpen] = useState(null);
  const [availableLeads, setAvailableLeads] = useState([]);
  const [leadSearch, setLeadSearch] = useState('');
  const [leadSourceFilter, setLeadSourceFilter] = useState('');
  const [leadStatusFilter, setLeadStatusFilter] = useState('');
  const [pickedLeads, setPickedLeads] = useState([]);

  useEffect(() => {
    Promise.all([
      api.get('/email-marketing/templates').catch(() => ({ data: [] })),
      api.get('/email-marketing/lists').catch(() => ({ data: [] })),
      api.get('/email-marketing/segments').catch(() => ({ data: [] })),
      api.get('/email-marketing/campaigns').catch(() => ({ data: [] })),
    ]).then(([t, l, s, c]) => {
      setTemplates(t.data); setLists(l.data); setSegments(s.data); setCampaigns(c.data);
    }).finally(() => setLoading(false));
  }, []);

  const createCampaign = async () => {
    if (!newCampaignName.trim()) return;
    try {
      const { data } = await api.post('/email-marketing/campaigns', { name: newCampaignName });
      setCampaigns(prev => [data, ...prev]);
      setNewCampaignName('');
      toast.success('Campana creada');
    } catch { toast.error('Error'); }
  };
  const createList = async () => {
    if (!newListName.trim()) return;
    try {
      const { data } = await api.post('/email-marketing/lists', { name: newListName });
      setLists(prev => [data, ...prev]);
      setNewListName('');
      toast.success('Lista creada');
    } catch { toast.error('Error'); }
  };
  const deleteCampaign = async (id) => { await api.delete(`/email-marketing/campaigns/${id}`); setCampaigns(prev => prev.filter(c => c.id !== id)); toast.success('Eliminada'); };
  const saveEditCampaign = async () => {
    if (!editCampaign) return;
    try {
      const { data } = await api.put(`/email-marketing/campaigns/${editCampaign.id}`, { name: editCampaign.name, list_id: editCampaign.list_id, template_id: editCampaign.template_id });
      setCampaigns(prev => prev.map(c => c.id === editCampaign.id ? data : c));
      setEditCampaign(null);
      toast.success('Campana actualizada');
    } catch { toast.error('Error'); }
  };
  const sendRealCampaign = async (id) => {
    setSendingReal(id);
    try {
      const { data } = await api.post(`/email-marketing/campaigns/${id}/send-real`);
      toast.success(`${data.sent} emails enviados exitosamente!`);
      const { data: updated } = await api.get('/email-marketing/campaigns');
      setCampaigns(updated);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al enviar'); }
    setSendingReal(null);
  };
  const simulateCampaign = async (id) => {
    try {
      const { data } = await api.post(`/email-marketing/campaigns/${id}/simulate`);
      toast.success(`Simulacion: ${data.simulated_sends} emails`);
      const { data: updated } = await api.get('/email-marketing/campaigns');
      setCampaigns(updated);
    } catch { toast.error('Error'); }
  };

  // Segments
  const addSegRule = () => setSegForm(p => ({ ...p, rules: [...p.rules, { field: 'source', operator: 'equals', value: '' }] }));
  const removeSegRule = (i) => setSegForm(p => ({ ...p, rules: p.rules.filter((_, idx) => idx !== i) }));
  const updateSegRule = (i, k, v) => setSegForm(p => ({ ...p, rules: p.rules.map((r, idx) => idx === i ? { ...r, [k]: v } : r) }));
  const createSegment = async () => {
    if (!segForm.name.trim()) { toast.error('Nombre requerido'); return; }
    try {
      const { data } = await api.post('/email-marketing/segments', segForm);
      setSegments(prev => [data, ...prev]);
      setCreateSegOpen(false);
      setSegForm({ name: '', rules: [{ field: 'source', operator: 'equals', value: '' }] });
      toast.success(`Segmento creado: ${data.count} leads`);
    } catch { toast.error('Error'); }
  };
  const deleteSegment = async (id) => { await api.delete(`/email-marketing/segments/${id}`); setSegments(prev => prev.filter(s => s.id !== id)); toast.success('Eliminado'); };

  // Pick leads
  const openPickLeads = async (listId) => {
    setPickLeadsOpen(listId); setPickedLeads([]); setLeadSearch(''); setLeadSourceFilter(''); setLeadStatusFilter('');
    try { const { data } = await api.get('/leads', { params: { limit: 200 } }); setAvailableLeads(data.leads || []); } catch { setAvailableLeads([]); }
  };
  const confirmPickLeads = async () => {
    if (!pickLeadsOpen || !pickedLeads.length) return;
    try {
      const { data } = await api.post(`/email-marketing/lists/${pickLeadsOpen}/add-manual-leads`, { lead_ids: pickedLeads });
      setLists(prev => prev.map(l => l.id === pickLeadsOpen ? { ...l, subscriber_count: data.total } : l));
      toast.success(`${pickedLeads.length} leads agregados`);
      setPickLeadsOpen(null);
    } catch { toast.error('Error'); }
  };

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  // Stats
  const totalSent = campaigns.reduce((s, c) => s + (c.sent_count || 0), 0);
  const totalOpens = campaigns.reduce((s, c) => s + (c.open_count || 0), 0);
  const totalClicks = campaigns.reduce((s, c) => s + (c.click_count || 0), 0);
  const totalReplies = campaigns.reduce((s, c) => s + (c.reply_count || 0), 0);
  const totalBounces = campaigns.reduce((s, c) => s + (c.bounce_count || 0), 0);
  const totalUnsubs = campaigns.reduce((s, c) => s + (c.unsub_count || 0), 0);
  const openRate = totalSent > 0 ? ((totalOpens / totalSent) * 100).toFixed(1) : '0.0';
  const clickRate = totalSent > 0 ? ((totalClicks / totalSent) * 100).toFixed(1) : '0.0';
  const bounceRate = totalSent > 0 ? ((totalBounces / totalSent) * 100).toFixed(1) : '0.0';

  return (
    <div className="space-y-6 animate-fade-in" data-testid="email-marketing-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">Spectra Email Marketing</h1>
        <FlowBotButton section="email_marketing" />
      </div>

      {/* Stats Bar - Brevo style */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Enviados', value: totalSent, color: 'text-blue-600' },
          { label: 'Aperturas', value: `${openRate}%`, sub: totalOpens, color: 'text-emerald-600' },
          { label: 'Clics', value: `${clickRate}%`, sub: totalClicks, color: 'text-teal-600' },
          { label: 'Respuestas', value: totalReplies, color: 'text-purple-600' },
          { label: 'Bounces', value: totalBounces, color: 'text-red-500' },
          { label: 'Cancelaciones', value: totalUnsubs, color: 'text-amber-600' },
        ].map(m => (
          <Card key={m.label} className="border-zinc-200 rounded-xl">
            <CardContent className="p-4 text-center">
              <p className={`text-2xl font-heading font-semibold ${m.color}`}>{m.value}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">{m.label} {m.sub ? `(${m.sub})` : ''}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Rate Bars - Brevo style */}
      {totalSent > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tasa de Apertura', pct: openRate, color: 'bg-blue-500' },
            { label: 'Tasa de Clics', pct: clickRate, color: 'bg-teal-500' },
            { label: 'Tasa de Rebote', pct: bounceRate, color: 'bg-red-400' },
          ].map(b => (
            <Card key={b.label} className="border-zinc-200 rounded-xl">
              <CardContent className="p-4">
                <p className="text-xs font-medium text-zinc-600 mb-2">{b.label}</p>
                <div className="w-full bg-zinc-100 rounded-full h-2"><div className={`${b.color} h-2 rounded-full transition-all`} style={{ width: `${Math.min(parseFloat(b.pct), 100)}%` }} /></div>
                <p className="text-lg font-semibold text-zinc-900 mt-1">{b.pct}%</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="plantillas" className="gap-1.5"><FileText className="w-4 h-4" /> Plantillas</TabsTrigger>
          <TabsTrigger value="listas" className="gap-1.5"><Users className="w-4 h-4" /> Listas</TabsTrigger>
          <TabsTrigger value="segmentos" className="gap-1.5"><Filter className="w-4 h-4" /> Segmentos</TabsTrigger>
          <TabsTrigger value="campanas" className="gap-1.5"><Mail className="w-4 h-4" /> Campanas</TabsTrigger>
        </TabsList>

        {/* PLANTILLAS TAB */}
        <TabsContent value="plantillas" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-zinc-500">Crea plantillas de email para tus campanas</p>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => window.location.href = '/templates'} data-testid="go-templates">
              <Plus className="w-4 h-4 mr-1" /> Ir a Plantillas
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {templates.slice(0, 6).map((t, i) => (
              <Card key={t.id} className="border-zinc-200 rounded-xl">
                <CardContent className="p-5">
                  <h3 className="font-medium text-zinc-900 text-sm truncate">{t.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{t.subject || 'Sin asunto'}</p>
                </CardContent>
              </Card>
            ))}
            {!templates.length && <p className="text-sm text-zinc-400 col-span-3">No hay plantillas. Crea tu primera en la seccion de Plantillas.</p>}
          </div>
        </TabsContent>

        {/* LISTAS TAB */}
        <TabsContent value="listas" className="space-y-4">
          <div className="flex items-center gap-3">
            <Input value={newListName} onChange={e => setNewListName(e.target.value)} placeholder="Nombre de nueva lista..." className="max-w-xs h-9" />
            <Button size="sm" onClick={createList} className="bg-blue-600 hover:bg-blue-700 text-white h-9"><Plus className="w-4 h-4 mr-1" /> Crear Lista</Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lists.map((list, i) => (
              <Card key={list.id} className="border-zinc-200 rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-zinc-900 text-sm truncate">{list.name}</h3>
                    <Badge className="bg-blue-50 text-blue-700 text-xs">{list.subscriber_count || 0} leads</Badge>
                  </div>
                  <p className="text-xs text-zinc-400 mt-1">{list.description || 'Sin descripcion'}</p>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => openPickLeads(list.id)} data-testid={`pick-leads-list-${i}`}>
                      <Plus className="w-3 h-3 mr-1" /> Agregar Leads
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* SEGMENTOS TAB */}
        <TabsContent value="segmentos" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-zinc-500">Los segmentos son filtros dinamicos que se actualizan automaticamente.</p>
              <p className="text-xs text-zinc-400">A diferencia de las listas (manuales), los segmentos incluyen leads que cumplan las reglas en todo momento.</p>
            </div>
            <Button size="sm" onClick={() => setCreateSegOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white h-9" data-testid="create-segment-btn">
              <Plus className="w-4 h-4 mr-1" /> Nuevo Segmento
            </Button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {segments.map((seg, i) => (
              <Card key={seg.id} className="border-zinc-200 rounded-xl">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-zinc-900 text-sm">{seg.name}</h3>
                    <Badge className="bg-indigo-50 text-indigo-700 text-xs"><Target className="w-3 h-3 mr-1" />{seg.count || 0} leads</Badge>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(seg.rules || []).map((r, ri) => (
                      <span key={ri} className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded-full">{r.field} {r.operator} {r.value}</span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="ghost" className="text-red-500 text-xs" onClick={() => deleteSegment(seg.id)}><Trash2 className="w-3 h-3 mr-1" /> Eliminar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {!segments.length && <p className="text-sm text-zinc-400 col-span-3">No hay segmentos. Crea uno con reglas dinamicas para agrupar leads automaticamente.</p>}
          </div>
        </TabsContent>

        {/* CAMPANAS TAB */}
        <TabsContent value="campanas" className="space-y-4">
          <div className="flex items-center gap-3">
            <Input value={newCampaignName} onChange={e => setNewCampaignName(e.target.value)} placeholder="Nombre de nueva campana..." className="max-w-xs h-9" />
            <Button size="sm" onClick={createCampaign} className="bg-blue-600 hover:bg-blue-700 text-white h-9"><Plus className="w-4 h-4 mr-1" /> Nueva Campana</Button>
          </div>

          {/* Campaigns Table - Brevo style */}
          <Card className="border-zinc-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50">
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Nombre</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Estado</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Destinatarios</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Aperturas</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Clics</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Respuestas</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Bounces</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Fecha</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase w-[180px]">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {campaigns.map((c, i) => (
                    <TableRow key={c.id} data-testid={`campaign-row-${i}`}>
                      <TableCell>
                        <p className="font-medium text-zinc-900 text-sm">{c.name}</p>
                        <div className="flex gap-1 mt-0.5">
                          {c.list_id ? <span className="text-[10px] text-emerald-600">Lista</span> : <span className="text-[10px] text-red-400">Sin lista</span>}
                          <span className="text-[10px] text-zinc-300">|</span>
                          {c.template_id ? <span className="text-[10px] text-emerald-600">Plantilla</span> : <span className="text-[10px] text-red-400">Sin plantilla</span>}
                        </div>
                      </TableCell>
                      <TableCell><Badge className={c.status === 'enviada' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{c.status}</Badge></TableCell>
                      <TableCell className="text-sm">{c.sent_count || c.lead_count || 0}</TableCell>
                      <TableCell className="text-sm text-blue-600">{c.open_count || 0}</TableCell>
                      <TableCell className="text-sm text-teal-600">{c.click_count || 0}</TableCell>
                      <TableCell className="text-sm text-purple-600">{c.reply_count || 0}</TableCell>
                      <TableCell className="text-sm text-red-500">{c.bounce_count || 0}</TableCell>
                      <TableCell className="text-xs text-zinc-400">{c.sent_at?.slice(0, 10) || c.created_at?.slice(0, 10) || '-'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {c.status === 'borrador' && (
                            <>
                              <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setEditCampaign(c)}><Pencil className="w-3 h-3" /></Button>
                              {c.list_id && c.template_id && (
                                <Button size="sm" className="h-7 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => sendRealCampaign(c.id)} disabled={sendingReal === c.id}>
                                  {sendingReal === c.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                </Button>
                              )}
                            </>
                          )}
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-red-500" onClick={() => deleteCampaign(c.id)}><Trash2 className="w-3 h-3" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!campaigns.length && <TableRow><TableCell colSpan={9} className="text-center py-8 text-zinc-400">No hay campanas</TableCell></TableRow>}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Segment Dialog */}
      <Dialog open={createSegOpen} onOpenChange={setCreateSegOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>Nuevo Segmento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre</Label><Input value={segForm.name} onChange={e => setSegForm(p => ({...p, name: e.target.value}))} placeholder="Ej: Leads calificados de Tucuman" data-testid="segment-name" /></div>
            <div>
              <Label className="mb-2 block">Reglas (leads que cumplan TODAS las condiciones)</Label>
              {segForm.rules.map((r, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Select value={r.field} onValueChange={v => updateSegRule(i, 'field', v)}>
                    <SelectTrigger className="w-[130px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="source">Fuente</SelectItem>
                      <SelectItem value="status">Estado</SelectItem>
                      <SelectItem value="ai_score">Score</SelectItem>
                      <SelectItem value="city">Ciudad</SelectItem>
                      <SelectItem value="normalized_category">Categoria</SelectItem>
                      <SelectItem value="channel">Canal</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={r.operator} onValueChange={v => updateSegRule(i, 'operator', v)}>
                    <SelectTrigger className="w-[110px] h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="equals">es igual a</SelectItem>
                      <SelectItem value="contains">contiene</SelectItem>
                      <SelectItem value="gte">mayor o igual</SelectItem>
                      <SelectItem value="lte">menor o igual</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input value={r.value} onChange={e => updateSegRule(i, 'value', e.target.value)} placeholder="Valor..." className="flex-1 h-9" />
                  {segForm.rules.length > 1 && <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-red-400" onClick={() => removeSegRule(i)}><X className="w-4 h-4" /></Button>}
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={addSegRule} className="text-xs"><Plus className="w-3 h-3 mr-1" /> Agregar regla</Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateSegOpen(false)}>Cancelar</Button>
            <Button onClick={createSegment} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-segment">Crear Segmento</Button>
          </DialogFooter>
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

      {/* Pick Leads Dialog */}
      <Dialog open={!!pickLeadsOpen} onOpenChange={(o) => !o && setPickLeadsOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Agregar Leads a la Lista</DialogTitle></DialogHeader>
          <div className="flex gap-2 mb-3">
            <Input value={leadSearch} onChange={e => setLeadSearch(e.target.value)} placeholder="Buscar..." className="flex-1" />
            <Select value={leadSourceFilter || 'all'} onValueChange={v => setLeadSourceFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Fuente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="google_maps">B2B</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="bot">Bot</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={leadStatusFilter || 'all'} onValueChange={v => setLeadStatusFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[130px]"><SelectValue placeholder="Estado" /></SelectTrigger>
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
              return (l.business_name||'').toLowerCase().includes(q) || (l.email||'').toLowerCase().includes(q);
            }).map((lead, i) => (
              <label key={lead.id} className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition-colors ${pickedLeads.includes(lead.id) ? 'bg-blue-50 border border-blue-200' : 'hover:bg-zinc-50 border border-transparent'}`}>
                <input type="checkbox" checked={pickedLeads.includes(lead.id)} onChange={e => { if (e.target.checked) setPickedLeads(p => [...p, lead.id]); else setPickedLeads(p => p.filter(id => id !== lead.id)); }} className="rounded" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-zinc-900 truncate">{lead.business_name}</p>
                  <p className="text-xs text-zinc-500">{lead.email || 'Sin email'} · {lead.city} · Score: {lead.ai_score}</p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex items-center justify-between mt-4 pt-3 border-t">
            <p className="text-sm text-zinc-500">{pickedLeads.length} seleccionados</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPickLeadsOpen(null)}>Cancelar</Button>
              <Button onClick={confirmPickLeads} disabled={!pickedLeads.length} className="bg-blue-600 hover:bg-blue-700 text-white">Agregar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
