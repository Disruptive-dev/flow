import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Users, Briefcase, Plus, Search, Loader2, Building2, Mail, Phone, MapPin, Star, TrendingUp, Send, GripVertical, DollarSign } from 'lucide-react';
import { toast } from 'sonner';

const stageColors = {
  nuevo: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200", header: "bg-slate-50" },
  contactado: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", header: "bg-blue-50" },
  propuesta: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", header: "bg-purple-50" },
  negociacion: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", header: "bg-amber-50" },
  ganado: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", header: "bg-emerald-50" },
  perdido: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", header: "bg-red-50" },
};
const stageLabels = { nuevo: "Nuevo", contactado: "Contactado", propuesta: "Propuesta", negociacion: "Negociacion", ganado: "Ganado", perdido: "Perdido" };
const stages = ["nuevo", "contactado", "propuesta", "negociacion", "ganado", "perdido"];

export default function CrmPage() {
  const [contacts, setContacts] = useState([]);
  const [deals, setDeals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedContact, setSelectedContact] = useState(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [newNote, setNewNote] = useState('');
  const [showDealForm, setShowDealForm] = useState(false);
  const [dealForm, setDealForm] = useState({ title: '', value: 0 });
  const [draggedDeal, setDraggedDeal] = useState(null);
  const [dragOverStage, setDragOverStage] = useState(null);

  const fetchData = async () => {
    try {
      const [c, d, s] = await Promise.all([
        api.get('/crm/contacts', { params: search ? { search } : {} }),
        api.get('/crm/deals'),
        api.get('/crm/stats'),
      ]);
      setContacts(c.data);
      setDeals(d.data);
      setStats(s.data);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []); // eslint-disable-line

  const openContact = async (contactId) => {
    try {
      const { data } = await api.get(`/crm/contacts/${contactId}`);
      setSelectedContact(data);
      setSheetOpen(true);
    } catch { toast.error('Error al cargar contacto'); }
  };

  const addNote = async () => {
    if (!newNote.trim() || !selectedContact) return;
    try {
      await api.post('/crm/notes', { contact_id: selectedContact.id, content: newNote });
      setNewNote('');
      const { data } = await api.get(`/crm/contacts/${selectedContact.id}`);
      setSelectedContact(data);
      toast.success('Nota agregada');
    } catch { toast.error('Error al agregar nota'); }
  };

  const createDeal = async () => {
    if (!dealForm.title || !selectedContact) return;
    try {
      await api.post('/crm/deals', { contact_id: selectedContact.id, title: dealForm.title, value: dealForm.value });
      setDealForm({ title: '', value: 0 });
      setShowDealForm(false);
      const { data } = await api.get(`/crm/contacts/${selectedContact.id}`);
      setSelectedContact(data);
      fetchData();
      toast.success('Oportunidad creada');
    } catch { toast.error('Error al crear oportunidad'); }
  };

  const updateDealStage = async (dealId, newStage) => {
    try {
      await api.put(`/crm/deals/${dealId}`, { stage: newStage });
      setDeals(prev => prev.map(d => d.id === dealId ? { ...d, stage: newStage } : d));
      fetchData();
      if (selectedContact) {
        const { data } = await api.get(`/crm/contacts/${selectedContact.id}`);
        setSelectedContact(data);
      }
      toast.success(`Movido a ${stageLabels[newStage]}`);
    } catch { toast.error('Error al actualizar'); }
  };

  // Drag & Drop handlers
  const handleDragStart = (e, deal) => {
    setDraggedDeal(deal);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', deal.id);
    e.currentTarget.style.opacity = '0.5';
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedDeal(null);
    setDragOverStage(null);
  };

  const handleDragOver = (e, stage) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stage);
  };

  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  const handleDrop = (e, targetStage) => {
    e.preventDefault();
    setDragOverStage(null);
    if (draggedDeal && draggedDeal.stage !== targetStage) {
      updateDealStage(draggedDeal.id, targetStage);
    }
    setDraggedDeal(null);
  };

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Cargando CRM...</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="crm-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">Spectra CRM</h1>
          <p className="text-sm text-zinc-500 mt-1">Gestiona contactos, oportunidades y seguimiento comercial</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center"><Users className="w-5 h-5 text-blue-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{stats?.total_contacts || 0}</p><p className="text-xs text-zinc-500">Contactos</p></div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><Briefcase className="w-5 h-5 text-purple-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{stats?.total_deals || 0}</p><p className="text-xs text-zinc-500">Oportunidades</p></div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center"><TrendingUp className="w-5 h-5 text-emerald-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">{stats?.stage_counts?.ganado || 0}</p><p className="text-xs text-zinc-500">Ganadas</p></div>
          </CardContent>
        </Card>
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><DollarSign className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">${(stats?.won_value || 0).toLocaleString()}</p><p className="text-xs text-zinc-500">Valor Ganado</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pipeline">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="pipeline" data-testid="crm-tab-pipeline"><Briefcase className="w-4 h-4 mr-1.5" />Pipeline</TabsTrigger>
          <TabsTrigger value="contacts" data-testid="crm-tab-contacts"><Users className="w-4 h-4 mr-1.5" />Contactos</TabsTrigger>
        </TabsList>

        {/* Pipeline Tab - Drag & Drop */}
        <TabsContent value="pipeline">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="crm-pipeline">
            {stages.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage);
              const sc = stageColors[stage];
              const isOver = dragOverStage === stage;
              const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
              return (
                <div
                  key={stage}
                  className={`rounded-xl border transition-all ${isOver ? `${sc.border} border-2 shadow-md` : 'border-zinc-200'}`}
                  onDragOver={(e) => handleDragOver(e, stage)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, stage)}
                  data-testid={`pipeline-stage-${stage}`}
                >
                  {/* Stage Header */}
                  <div className={`px-3 py-2.5 rounded-t-xl ${sc.header} border-b ${sc.border}`}>
                    <div className="flex items-center justify-between">
                      <Badge className={`${sc.bg} ${sc.text} text-xs font-medium`}>{stageLabels[stage]}</Badge>
                      <span className="text-xs font-medium text-zinc-500">{stageDeals.length}</span>
                    </div>
                    {stageValue > 0 && <p className="text-[10px] text-zinc-400 mt-1">${stageValue.toLocaleString()}</p>}
                  </div>

                  {/* Deal Cards */}
                  <div className={`p-2 space-y-2 min-h-[180px] ${isOver ? 'bg-blue-50/30' : ''}`}>
                    {stageDeals.map(deal => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal)}
                        onDragEnd={handleDragEnd}
                        onClick={() => deal.contact_id && openContact(deal.contact_id)}
                        className="bg-white border border-zinc-200 rounded-lg p-3 cursor-grab active:cursor-grabbing hover:border-zinc-300 hover:shadow-sm transition-all group"
                        data-testid={`deal-card-${deal.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{deal.title}</p>
                            <p className="text-xs text-zinc-500 truncate mt-0.5">{deal.contact_name}</p>
                          </div>
                          <GripVertical className="w-4 h-4 text-zinc-300 group-hover:text-zinc-400 flex-shrink-0 mt-0.5" />
                        </div>
                        {deal.value > 0 && (
                          <div className="flex items-center gap-1 mt-2">
                            <DollarSign className="w-3 h-3 text-emerald-500" />
                            <span className="text-xs font-semibold text-emerald-600">{deal.value.toLocaleString()}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-zinc-400 mt-1">{deal.assigned_to}</p>
                      </div>
                    ))}
                    {stageDeals.length === 0 && (
                      <div className={`text-xs text-zinc-300 text-center py-8 border border-dashed rounded-lg ${isOver ? 'border-blue-300 bg-blue-50/50 text-blue-400' : 'border-zinc-200'}`}>
                        {isOver ? 'Soltar aqui' : 'Sin oportunidades'}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <div className="space-y-4">
            <form onSubmit={(e) => { e.preventDefault(); fetchData(); }} className="flex gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contactos..." className="pl-10 h-10" data-testid="crm-search" />
              </div>
            </form>

            <Card className="border-zinc-200 rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Empresa</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Email</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Ciudad</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Categoria</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Score IA</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Etapa</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Oportunidades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.length === 0 ? (
                      <TableRow><TableCell colSpan={7} className="text-center py-12 text-zinc-400">No hay contactos en el CRM. Envia leads desde el modulo de Leads.</TableCell></TableRow>
                    ) : contacts.map((c, i) => (
                      <TableRow key={c.id} className="hover:bg-zinc-50/80 cursor-pointer" onClick={() => openContact(c.id)} data-testid={`crm-contact-${i}`}>
                        <TableCell className="font-medium text-zinc-900 text-sm">{c.business_name}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.email || '-'}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.city || '-'}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.category || '-'}</TableCell>
                        <TableCell>
                          {c.ai_score > 0 && <span className={`text-sm font-semibold ${c.ai_score >= 80 ? 'text-emerald-600' : c.ai_score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>{c.ai_score}</span>}
                        </TableCell>
                        <TableCell><Badge className={`${stageColors[c.stage]?.bg} ${stageColors[c.stage]?.text}`}>{stageLabels[c.stage] || c.stage}</Badge></TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.deal_count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[500px] sm:max-w-[500px] overflow-y-auto" data-testid="crm-contact-sheet">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">{selectedContact?.business_name}</SheetTitle>
          </SheetHeader>
          {selectedContact && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-2">
                <Badge className={`${stageColors[selectedContact.stage]?.bg} ${stageColors[selectedContact.stage]?.text}`}>{stageLabels[selectedContact.stage]}</Badge>
                {selectedContact.ai_score > 0 && <span className="text-sm font-semibold text-blue-600">Score IA: {selectedContact.ai_score}</span>}
              </div>
              <Separator />

              {/* Contact Info */}
              <div className="grid grid-cols-1 gap-3">
                {[
                  [<Mail className="w-4 h-4 text-zinc-400" />, "Email", selectedContact.email],
                  [<Phone className="w-4 h-4 text-zinc-400" />, "Telefono", selectedContact.phone],
                  [<MapPin className="w-4 h-4 text-zinc-400" />, "Ubicacion", `${selectedContact.city}, ${selectedContact.province}`],
                  [<Building2 className="w-4 h-4 text-zinc-400" />, "Categoria", selectedContact.category],
                ].map(([icon, label, val], i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-50">
                    {icon}
                    <div>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{label}</p>
                      <p className="text-sm text-zinc-800">{val || '-'}</p>
                    </div>
                  </div>
                ))}
              </div>

              {selectedContact.notes && !selectedContact.notes.startsWith('{') && (
                <p className="text-sm text-zinc-500 italic bg-amber-50 p-3 rounded-lg border border-amber-100">{selectedContact.notes}</p>
              )}

              <Separator />

              {/* Deals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-heading font-medium text-zinc-900">Oportunidades ({selectedContact.deals?.length || 0})</h4>
                  <Button size="sm" variant="outline" onClick={() => setShowDealForm(!showDealForm)} data-testid="add-deal-button">
                    <Plus className="w-3.5 h-3.5 mr-1" /> Nueva
                  </Button>
                </div>
                {showDealForm && (
                  <Card className="border-blue-200 bg-blue-50/30 mb-3">
                    <CardContent className="p-3 space-y-2">
                      <Input value={dealForm.title} onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))} placeholder="Titulo de la oportunidad" className="text-sm" data-testid="deal-title-input" />
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                          <Input type="number" value={dealForm.value} onChange={e => setDealForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} placeholder="Valor" className="text-sm pl-8" data-testid="deal-value-input" />
                        </div>
                        <Button size="sm" onClick={createDeal} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-deal-button">Crear</Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
                <div className="space-y-2">
                  {(selectedContact.deals || []).map(deal => (
                    <div key={deal.id} className="flex items-center justify-between p-3 bg-white border border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-medium text-zinc-900 truncate">{deal.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          {deal.value > 0 && <span className="text-xs font-semibold text-emerald-600">${deal.value.toLocaleString()}</span>}
                          <span className="text-[10px] text-zinc-400">{deal.assigned_to}</span>
                        </div>
                      </div>
                      <Select value={deal.stage} onValueChange={v => updateDealStage(deal.id, v)}>
                        <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stages.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {(!selectedContact.deals || selectedContact.deals.length === 0) && (
                    <p className="text-xs text-zinc-400 text-center py-4">Sin oportunidades. Crea la primera.</p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Notes */}
              <div>
                <h4 className="text-sm font-heading font-medium text-zinc-900 mb-3">Notas y Actividad</h4>
                <div className="flex gap-2 mb-3">
                  <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Agregar nota o actividad..." rows={2} className="text-sm flex-1" data-testid="crm-note-input" />
                  <Button size="sm" onClick={addNote} className="bg-blue-600 hover:bg-blue-700 text-white self-end" data-testid="add-note-button">
                    <Send className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="space-y-2">
                  {(selectedContact.notes_list || []).map((note, i) => (
                    <div key={i} className="p-3 bg-zinc-50 rounded-lg border border-zinc-100">
                      <p className="text-sm text-zinc-700">{note.content}</p>
                      <p className="text-[10px] text-zinc-400 mt-1.5">{note.author} &middot; {new Date(note.created_at).toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
