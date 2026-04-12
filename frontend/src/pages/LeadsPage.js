import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Search, MoreHorizontal, CheckCircle2, XCircle, Send, ExternalLink, Loader2, ChevronLeft, ChevronRight, Download, Upload, Globe, Mail, Phone, Star, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';
import FlowBotButton from '@/components/FlowBotButton';
import GuideBanner from '@/components/GuideBanner';
import LeadStatusGuide from '@/components/LeadStatusGuide';

const leadStatusLabels = {
  raw: "Sin procesar", cleaned: "Limpiado", scored: "Calificado",
  approved: "Aprobado", rejected: "Rechazado",
  queued_for_sequence: "En secuencia", contacted: "Contactado",
  opened: "Email abierto", clicked: "Hizo clic",
  replied: "Respondio", interested: "Interesado",
  sent_to_crm: "Enviado al CRM", opportunity: "Oportunidad",
  closed_won: "Cerrado ganado", closed_lost: "Cerrado perdido"
};

const leadStatusColors = {
  raw: "bg-slate-100 text-slate-700", cleaned: "bg-blue-50 text-blue-700", scored: "bg-indigo-50 text-indigo-700",
  approved: "bg-emerald-50 text-emerald-700", rejected: "bg-red-50 text-red-700",
  queued_for_sequence: "bg-purple-50 text-purple-700", contacted: "bg-amber-50 text-amber-700",
  opened: "bg-teal-50 text-teal-700", clicked: "bg-cyan-50 text-cyan-700",
  replied: "bg-green-50 text-green-700", interested: "bg-orange-50 text-orange-700",
  sent_to_crm: "bg-blue-100 text-blue-800", opportunity: "bg-fuchsia-50 text-fuchsia-700",
  closed_won: "bg-emerald-100 text-emerald-800 font-medium", closed_lost: "bg-slate-200 text-slate-800"
};

const qualityLabels = { excellent: "Excelente", good: "Bueno", average: "Promedio", poor: "Bajo" };
const qualityColors = { excellent: "text-emerald-600", good: "text-blue-600", average: "text-amber-600", poor: "text-red-600" };

function getScoreBreakdown(lead) {
  const params = [];
  // Presencia Digital (max 35)
  if (lead.website && lead.website !== '-') params.push({ label: "Sitio web", value: "+20", positive: true });
  else params.push({ label: "Sin sitio web", value: "0", positive: false });
  if (lead.email && lead.email !== '-') params.push({ label: "Email de contacto", value: "+15", positive: true });
  else params.push({ label: "Sin email", value: "0", positive: false });
  // Datos de Contacto (max 20)
  if (lead.phone && lead.phone !== '-') params.push({ label: "Telefono", value: "+10", positive: true });
  else params.push({ label: "Sin telefono", value: "0", positive: false });
  if (lead.city && lead.province) params.push({ label: "Direccion completa", value: "+10", positive: true });
  else params.push({ label: "Direccion incompleta", value: "0", positive: false });
  // Quality assessment
  const score = lead.ai_score || 0;
  if (score >= 80) params.push({ label: "Score excelente (80+)", value: "Alto potencial", positive: true });
  else if (score >= 60) params.push({ label: "Score bueno (60-79)", value: "Buen potencial", positive: true });
  else if (score >= 40) params.push({ label: "Score promedio (40-59)", value: "Revisar", positive: false });
  else params.push({ label: "Score bajo (<40)", value: "No recomendado", positive: false });
  return params;
}

export default function LeadsPage() {
  const { t } = useLanguage();
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState([]);
  const [detailLead, setDetailLead] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/import/leads', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(data.message);
      fetchLeads();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al importar'); }
    setImporting(false);
    e.target.value = '';
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [page, statusFilter]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchLeads(); };
  const updateStatus = async (leadId, status) => {
    try { await api.put(`/leads/${leadId}/status`, { status }); toast.success(`Lead ${leadStatusLabels[status] || status}`); fetchLeads(); }
    catch { toast.error('Error al actualizar estado'); }
  };
  const handleBulk = async (action) => {
    if (!selected.length) return toast.error('Selecciona leads primero');
    try { const { data } = await api.post('/leads/bulk-action', { lead_ids: selected, action }); toast.success(data.message); setSelected([]); fetchLeads(); }
    catch { toast.error('Error en accion masiva'); }
  };
  const openDetail = async (lead) => {
    try { const { data } = await api.get(`/leads/${lead.id}`); setDetailLead(data); setDetailOpen(true); }
    catch { setDetailLead(lead); setDetailOpen(true); }
  };
  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === leads.length ? [] : leads.map(l => l.id));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="leads-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('leads')}</h1>
        <div className="flex items-center gap-3">
          <LeadStatusGuide />
          <FlowBotButton section="leads" />
          <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="import-leads-btn">
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />} Importar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const token = localStorage.getItem('sf_access_token');
            window.open(`${process.env.REACT_APP_BACKEND_URL}/api/export/leads?token=${token}`, '_blank');
          }} data-testid="export-leads-btn">
            <Download className="w-4 h-4 mr-1.5" /> Exportar
          </Button>
          <span className="text-sm text-zinc-500">{total} leads</span>
        </div>
      </div>

      <GuideBanner section="leads" />

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input data-testid="leads-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads..." className="pl-10 h-10" />
        </form>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[200px] h-10" data-testid="leads-status-filter"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(leadStatusLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
          </SelectContent>
        </Select>
        {selected.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="bulk-actions-button">Acciones ({selected.length})</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulk('approve')} data-testid="bulk-approve">Aprobar seleccionados</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulk('reject')} data-testid="bulk-reject">Rechazar seleccionados</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulk('queue_sequence')}>Enviar a secuencia</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulk('send_to_crm')}>Enviar al CRM</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      {/* Table */}
      <Card className="border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="w-10"><Checkbox checked={selected.length === leads.length && leads.length > 0} onCheckedChange={toggleAll} data-testid="leads-select-all" /></TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Empresa</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Categoria</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Ciudad</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Score</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Calidad</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase w-12">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : leads.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-zinc-400">No se encontraron leads</TableCell></TableRow>
              ) : leads.map((lead, i) => (
                <TableRow key={lead.id} className="hover:bg-zinc-50/80 cursor-pointer" data-testid={`lead-row-${i}`}>
                  <TableCell><Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                  <TableCell className="font-medium text-zinc-900 text-sm" onClick={() => openDetail(lead)}>{lead.business_name}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{lead.normalized_category}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{lead.city}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-semibold ${lead.ai_score >= 80 ? 'text-emerald-600' : lead.ai_score >= 60 ? 'text-blue-600' : lead.ai_score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {lead.ai_score}
                    </span>
                  </TableCell>
                  <TableCell><span className={`text-xs capitalize ${qualityColors[lead.quality_level] || 'text-zinc-500'}`}>{qualityLabels[lead.quality_level] || lead.quality_level}</span></TableCell>
                  <TableCell><Badge className={`${leadStatusColors[lead.status] || 'bg-slate-100 text-slate-700'} text-[11px]`}>{leadStatusLabels[lead.status] || lead.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`lead-actions-${i}`}><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetail(lead)}>Ver detalle</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'approved')}><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />Aprobar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'rejected')}><XCircle className="w-3.5 h-3.5 mr-2 text-red-600" />Rechazar</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'queued_for_sequence')}><Send className="w-3.5 h-3.5 mr-2" />Enviar a secuencia</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'sent_to_crm')}><ExternalLink className="w-3.5 h-3.5 mr-2" />Enviar al CRM</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)} data-testid="leads-prev-page"><ChevronLeft className="w-4 h-4" /></Button>
          <span className="text-sm text-zinc-500">Pagina {page} de {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)} data-testid="leads-next-page"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Lead Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[480px] sm:max-w-[480px] overflow-y-auto" data-testid="lead-detail-sheet">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">{detailLead?.business_name}</SheetTitle>
          </SheetHeader>
          {detailLead && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-2">
                <Badge className={`${leadStatusColors[detailLead.status] || ''} text-xs`}>{leadStatusLabels[detailLead.status] || detailLead.status}</Badge>
                <span className={`text-lg font-semibold ${detailLead.ai_score >= 80 ? 'text-emerald-600' : detailLead.ai_score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                  Score: {detailLead.ai_score}
                </span>
                <Badge className={`ml-auto ${qualityColors[detailLead.quality_level]?.replace('text-', 'bg-').replace('600', '50')} ${qualityColors[detailLead.quality_level]} text-xs`}>
                  {qualityLabels[detailLead.quality_level] || detailLead.quality_level}
                </Badge>
              </div>

              {/* Score Breakdown */}
              <Card className="border-zinc-200 bg-zinc-50/50">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Parametros de Calidad</p>
                  <div className="space-y-2">
                    {getScoreBreakdown(detailLead).map((param, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-sm">
                        {param.positive ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" /> : <TrendingDown className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />}
                        <span className={param.positive ? 'text-zinc-700' : 'text-zinc-400'}>{param.label}</span>
                        <span className={`ml-auto text-xs font-medium ${param.positive ? 'text-emerald-600' : 'text-red-400'}`}>{param.value}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3">
                    <Progress value={detailLead.ai_score} className="h-2" />
                    <p className="text-[10px] text-zinc-400 mt-1 text-right">{detailLead.ai_score}/100 puntos</p>
                  </div>
                </CardContent>
              </Card>

              <Separator />
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Star, label: 'Categoria', value: detailLead.normalized_category },
                  { icon: Globe, label: 'Ciudad', value: `${detailLead.city}, ${detailLead.province}` },
                  { icon: Globe, label: 'Sitio web', value: detailLead.website },
                  { icon: Mail, label: 'Email', value: detailLead.email },
                  { icon: Phone, label: 'Telefono', value: detailLead.phone },
                ].map(({ icon: Icon, label, value }) => (
                  <div key={label}>
                    <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
                    <p className="text-sm text-zinc-800 mt-0.5 truncate">{value || '-'}</p>
                  </div>
                ))}
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Recomendacion IA</p>
                <p className="text-sm text-zinc-700">{detailLead.recommendation}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Primera linea sugerida</p>
                <p className="text-sm text-zinc-700 italic">{detailLead.recommended_first_line}</p>
              </div>
              <Separator />
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { updateStatus(detailLead.id, 'approved'); setDetailOpen(false); }} data-testid="lead-approve-button">Aprobar</Button>
                <Button size="sm" variant="destructive" onClick={() => { updateStatus(detailLead.id, 'rejected'); setDetailOpen(false); }} data-testid="lead-reject-button">Rechazar</Button>
                <Button size="sm" variant="outline" onClick={() => { updateStatus(detailLead.id, 'queued_for_sequence'); setDetailOpen(false); }}>A secuencia</Button>
                <Button size="sm" variant="outline" onClick={() => { updateStatus(detailLead.id, 'sent_to_crm'); setDetailOpen(false); }}>Al CRM</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
