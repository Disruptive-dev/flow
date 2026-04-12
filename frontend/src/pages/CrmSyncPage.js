import { useState, useEffect } from 'react';
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
import { Users, Briefcase, Plus, Search, Loader2, Building2, Mail, Phone, MapPin, Star, MessageSquare, TrendingUp, X, Send } from 'lucide-react';
import { toast } from 'sonner';

const stageColors = {
  nuevo: "bg-slate-100 text-slate-700",
  contactado: "bg-blue-50 text-blue-700",
  propuesta: "bg-purple-50 text-purple-700",
  negociacion: "bg-amber-50 text-amber-700",
  ganado: "bg-emerald-50 text-emerald-700",
  perdido: "bg-red-50 text-red-700",
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

  const handleSearch = (e) => { e.preventDefault(); fetchData(); };

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
      fetchData();
      if (selectedContact) {
        const { data } = await api.get(`/crm/contacts/${selectedContact.id}`);
        setSelectedContact(data);
      }
      toast.success(`Oportunidad movida a ${stageLabels[newStage]}`);
    } catch { toast.error('Error al actualizar'); }
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
            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Star className="w-5 h-5 text-amber-600" /></div>
            <div><p className="text-2xl font-heading font-semibold text-zinc-900">${(stats?.won_value || 0).toLocaleString()}</p><p className="text-xs text-zinc-500">Valor Ganado</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="contacts">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="contacts" data-testid="crm-tab-contacts"><Users className="w-4 h-4 mr-1.5" />Contactos</TabsTrigger>
          <TabsTrigger value="pipeline" data-testid="crm-tab-pipeline"><Briefcase className="w-4 h-4 mr-1.5" />Pipeline</TabsTrigger>
        </TabsList>

        {/* Contacts Tab */}
        <TabsContent value="contacts">
          <div className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-3">
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
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Etapa</TableHead>
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Oportunidades</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contacts.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-12 text-zinc-400">No hay contactos en el CRM. Envia leads desde el modulo de Leads.</TableCell></TableRow>
                    ) : contacts.map((c, i) => (
                      <TableRow key={c.id} className="hover:bg-zinc-50/80 cursor-pointer" onClick={() => openContact(c.id)} data-testid={`crm-contact-${i}`}>
                        <TableCell className="font-medium text-zinc-900 text-sm">{c.business_name}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.email || '-'}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.city || '-'}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.category || '-'}</TableCell>
                        <TableCell><Badge className={stageColors[c.stage] || stageColors.nuevo}>{stageLabels[c.stage] || c.stage}</Badge></TableCell>
                        <TableCell className="text-sm text-zinc-600">{c.deal_count || 0}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        </TabsContent>

        {/* Pipeline Tab */}
        <TabsContent value="pipeline">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {stages.map(stage => {
              const stageDeals = deals.filter(d => d.stage === stage);
              return (
                <div key={stage} className="space-y-2">
                  <div className="flex items-center justify-between px-1">
                    <Badge className={`${stageColors[stage]} text-xs`}>{stageLabels[stage]}</Badge>
                    <span className="text-xs text-zinc-400">{stageDeals.length}</span>
                  </div>
                  <div className="space-y-2 min-h-[200px]">
                    {stageDeals.map(deal => (
                      <Card key={deal.id} className="border-zinc-200 rounded-lg hover:border-zinc-300 transition-colors cursor-pointer" data-testid={`deal-card-${deal.id}`}>
                        <CardContent className="p-3">
                          <p className="text-sm font-medium text-zinc-900 truncate">{deal.title}</p>
                          <p className="text-xs text-zinc-500 truncate">{deal.contact_name}</p>
                          {deal.value > 0 && <p className="text-xs font-semibold text-emerald-600 mt-1">${deal.value.toLocaleString()}</p>}
                          <Select value={deal.stage} onValueChange={v => updateDealStage(deal.id, v)}>
                            <SelectTrigger className="h-7 text-xs mt-2"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {stages.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </CardContent>
                      </Card>
                    ))}
                    {stageDeals.length === 0 && <div className="text-xs text-zinc-300 text-center py-8 border border-dashed border-zinc-200 rounded-lg">Sin oportunidades</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Contact Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto" data-testid="crm-contact-sheet">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">{selectedContact?.business_name}</SheetTitle>
          </SheetHeader>
          {selectedContact && (
            <div className="mt-6 space-y-5">
              <Badge className={stageColors[selectedContact.stage] || ''}>{stageLabels[selectedContact.stage]}</Badge>
              {selectedContact.ai_score > 0 && <span className="text-sm font-semibold text-blue-600 ml-2">Score IA: {selectedContact.ai_score}</span>}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {[
                  [<Mail className="w-3.5 h-3.5" />, selectedContact.email],
                  [<Phone className="w-3.5 h-3.5" />, selectedContact.phone],
                  [<MapPin className="w-3.5 h-3.5" />, `${selectedContact.city}, ${selectedContact.province}`],
                  [<Building2 className="w-3.5 h-3.5" />, selectedContact.category],
                ].map(([icon, val], i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-zinc-600">{icon} {val || '-'}</div>
                ))}
              </div>
              {selectedContact.notes && <p className="text-sm text-zinc-500 italic bg-zinc-50 p-3 rounded-lg">{selectedContact.notes}</p>}

              <Separator />
              {/* Deals */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-heading font-medium text-zinc-900">Oportunidades ({selectedContact.deals?.length || 0})</h4>
                  <Button size="sm" variant="outline" onClick={() => setShowDealForm(!showDealForm)} data-testid="add-deal-button"><Plus className="w-3.5 h-3.5 mr-1" /> Nueva</Button>
                </div>
                {showDealForm && (
                  <div className="p-3 bg-zinc-50 rounded-lg mb-3 space-y-2">
                    <Input value={dealForm.title} onChange={e => setDealForm(f => ({ ...f, title: e.target.value }))} placeholder="Titulo de la oportunidad" className="text-sm" data-testid="deal-title-input" />
                    <div className="flex gap-2">
                      <Input type="number" value={dealForm.value} onChange={e => setDealForm(f => ({ ...f, value: parseFloat(e.target.value) || 0 }))} placeholder="Valor $" className="text-sm" data-testid="deal-value-input" />
                      <Button size="sm" onClick={createDeal} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-deal-button">Crear</Button>
                    </div>
                  </div>
                )}
                {(selectedContact.deals || []).map(deal => (
                  <div key={deal.id} className="flex items-center justify-between p-2.5 bg-white border border-zinc-200 rounded-lg mb-2">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{deal.title}</p>
                      {deal.value > 0 && <p className="text-xs text-emerald-600">${deal.value.toLocaleString()}</p>}
                    </div>
                    <Select value={deal.stage} onValueChange={v => updateDealStage(deal.id, v)}>
                      <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {stages.map(s => <SelectItem key={s} value={s}>{stageLabels[s]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>

              <Separator />
              {/* Notes */}
              <div>
                <h4 className="text-sm font-heading font-medium text-zinc-900 mb-3">Notas y Actividad</h4>
                <div className="flex gap-2 mb-3">
                  <Textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Agregar nota..." rows={2} className="text-sm" data-testid="crm-note-input" />
                  <Button size="sm" onClick={addNote} className="bg-blue-600 hover:bg-blue-700 text-white self-end" data-testid="add-note-button"><Send className="w-3.5 h-3.5" /></Button>
                </div>
                {(selectedContact.notes_list || selectedContact.notes_data || []).length === 0 && (selectedContact.notes ? [] : [1]).map(() => (
                  <p key="empty" className="text-xs text-zinc-400">Sin notas todavia</p>
                ))}
                {(selectedContact.notes_list || []).map((note, i) => (
                  <div key={i} className="p-2.5 bg-zinc-50 rounded-lg mb-2">
                    <p className="text-sm text-zinc-700">{note.content}</p>
                    <p className="text-xs text-zinc-400 mt-1">{note.author} &middot; {new Date(note.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
