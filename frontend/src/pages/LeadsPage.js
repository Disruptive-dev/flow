import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api, { downloadFile } from '@/lib/api';
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
import { Search, MoreHorizontal, CheckCircle2, XCircle, Send, ExternalLink, Loader2, ChevronLeft, ChevronRight, Download, Upload, Globe, Mail, Phone, Star, TrendingUp, TrendingDown, Plus, ChevronDown, ChevronUp, Pencil, Calendar, Filter, X, MessageCircle, Sparkles, Lightbulb, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';
import FlowBotButton from '@/components/FlowBotButton';
import GuideBanner from '@/components/GuideBanner';
import LeadStatusGuide from '@/components/LeadStatusGuide';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { COUNTRIES, flagOf } from '@/lib/countries';

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

// Parser: detecta si el campo `recommendation` es un log del bot (líneas repetidas "[BOT YYYY-MM-DD]")
// y devuelve { isBotLog, interactions, firstDate, lastDate, cleanedLines }
function parseBotLog(text) {
  if (!text || typeof text !== 'string') return { isBotLog: false, interactions: 0, firstDate: null, lastDate: null, cleanedLines: [] };
  const lines = text.split(/\n+/).map(l => l.trim()).filter(Boolean);
  const botRegex = /\[(?:BOT|bot)\s+(\d{4}-\d{2}-\d{2})\]/;
  const botLines = lines.filter(l => botRegex.test(l));
  if (botLines.length < 2 && lines.length < 3) return { isBotLog: false, interactions: 0, firstDate: null, lastDate: null, cleanedLines: lines };
  // Extraer fechas
  const dates = botLines.map(l => (l.match(botRegex) || [])[1]).filter(Boolean).sort();
  // Deduplicar por (texto sin fecha)
  const seen = new Set();
  const cleaned = [];
  for (const l of lines) {
    const key = l.replace(/\s*\[(?:BOT|bot)\s+\d{4}-\d{2}-\d{2}\]\s*/g, '').trim();
    if (!key) continue;
    if (!seen.has(key)) { seen.add(key); cleaned.push(key); }
  }
  return {
    isBotLog: botLines.length >= 2,
    interactions: botLines.length || lines.length,
    firstDate: dates[0] || null,
    lastDate: dates[dates.length - 1] || null,
    cleanedLines: cleaned.slice(0, 20),
  };
}

function LeadAIBlock({ lead, onUpdate }) {
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const parsed = parseBotLog(lead.recommendation || '');
  const channel = (lead.channel || lead.source || 'web').toLowerCase();
  const isWhatsApp = channel === 'whatsapp' || parsed.isBotLog;
  const score = lead.ai_score ?? 0;
  const quality = lead.quality_level || 'average';
  const scoreColor = score >= 80 ? 'text-emerald-600 bg-emerald-50 border-emerald-200'
                    : score >= 60 ? 'text-blue-600 bg-blue-50 border-blue-200'
                    : score >= 40 ? 'text-amber-600 bg-amber-50 border-amber-200'
                    : 'text-red-600 bg-red-50 border-red-200';

  const summary = lead.ai_summary;
  const shortRec = lead.ai_recommendation_short || (parsed.isBotLog ? null : lead.recommendation);
  const nextStep = lead.ai_next_step;
  const keyPoints = Array.isArray(lead.ai_key_points) ? lead.ai_key_points : [];

  const generate = async () => {
    setGenerating(true);
    try {
      const { data } = await api.post(`/leads/${lead.id}/ai-summary`);
      onUpdate(data.data || {});
      toast.success('Resumen IA generado');
    } catch (e) {
      toast.error('No se pudo generar el resumen');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-3" data-testid="lead-ai-block">
      {/* Header: Score + Canal */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {isWhatsApp ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-200">
              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-200">
              <Globe className="w-3.5 h-3.5" /> {channel === 'web' ? 'Web' : channel}
            </span>
          )}
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${scoreColor}`} data-testid="lead-ai-score-badge">
            <Star className="w-3.5 h-3.5" /> {score}/100 · {qualityLabels[quality] || quality}
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={generate} disabled={generating} className="h-7 text-xs gap-1" data-testid="lead-ai-generate-btn">
          {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
          {summary ? 'Regenerar IA' : 'Generar resumen IA'}
        </Button>
      </div>

      {/* Resumen IA */}
      {summary ? (
        <div className="rounded-lg border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-3 dark:from-indigo-950/40 dark:to-purple-950/40 dark:border-indigo-900">
          <div className="flex items-center gap-1.5 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <p className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider">Resumen IA</p>
          </div>
          <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed" data-testid="lead-ai-summary">{summary}</p>
          {keyPoints.length > 0 && (
            <ul className="mt-2 space-y-1">
              {keyPoints.map((kp, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-zinc-700 dark:text-zinc-300">
                  <span className="text-indigo-500 mt-0.5">•</span><span>{kp}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : parsed.isBotLog ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 dark:bg-emerald-950/20 dark:border-emerald-900 p-3">
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            <strong>{parsed.interactions}</strong> interacciones registradas por el bot
            {parsed.firstDate && parsed.lastDate && parsed.firstDate !== parsed.lastDate && (
              <> entre <strong>{parsed.firstDate}</strong> y <strong>{parsed.lastDate}</strong></>
            )}
            {parsed.firstDate && parsed.lastDate && parsed.firstDate === parsed.lastDate && (
              <> el <strong>{parsed.firstDate}</strong></>
            )}.
          </p>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Generá un resumen IA para ver análisis, score y próximos pasos.</p>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-zinc-300 dark:border-zinc-700 p-3 text-center">
          <p className="text-xs text-zinc-500 dark:text-zinc-400">Sin resumen IA aún. Hacé click en "Generar resumen IA".</p>
        </div>
      )}

      {/* Recomendación corta + próximo paso */}
      {(shortRec || nextStep) && (
        <div className="grid grid-cols-1 gap-2">
          {shortRec && !parsed.isBotLog && (
            <div className="rounded-md border border-zinc-200 dark:border-zinc-800 p-2.5 bg-white dark:bg-zinc-900">
              <div className="flex items-center gap-1.5 mb-1">
                <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                <p className="text-[10px] font-semibold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider">Recomendación</p>
              </div>
              <p className="text-sm text-zinc-700 dark:text-zinc-200">{shortRec}</p>
            </div>
          )}
          {nextStep && (
            <div className="rounded-md border border-blue-200 dark:border-blue-900 p-2.5 bg-blue-50/50 dark:bg-blue-950/20">
              <div className="flex items-center gap-1.5 mb-1">
                <ArrowRight className="w-3.5 h-3.5 text-blue-600" />
                <p className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Próximo paso</p>
              </div>
              <p className="text-sm text-zinc-800 dark:text-zinc-200">{nextStep}</p>
            </div>
          )}
        </div>
      )}

      {/* Conversación / historial crudo (colapsable) */}
      {parsed.cleanedLines.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full flex items-center justify-between text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 py-1.5"
            data-testid="lead-conversation-toggle"
          >
            <span>{isWhatsApp ? 'Ver conversación' : 'Ver historial'} ({parsed.cleanedLines.length})</span>
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {expanded && (
            <div className="max-h-48 overflow-y-auto rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 p-2 space-y-1">
              {parsed.cleanedLines.map((line, i) => (
                <div key={i} className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed border-l-2 border-emerald-300 dark:border-emerald-700 pl-2 py-0.5">
                  {line}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}


const sourceConfig = {
  google_maps: { label: "B2B Google Maps", color: "bg-blue-50 text-blue-700" },
  linkedin: { label: "LinkedIn", color: "bg-sky-50 text-sky-700" },
  bot: { label: "OptimIA Bot", color: "bg-emerald-50 text-emerald-700" },
  manual: { label: "Creado", color: "bg-zinc-100 text-zinc-700" },
  imported: { label: "Importado", color: "bg-purple-50 text-purple-700" },
  spectra_flow: { label: "B2B Google Maps", color: "bg-blue-50 text-blue-700" },
};
const getSourceLabel = (lead) => {
  if (lead.source && sourceConfig[lead.source]) return sourceConfig[lead.source];
  if (lead.tags?.includes('bot')) return sourceConfig.bot;
  if (lead.job_id) return sourceConfig.google_maps;
  return { label: "Otro", color: "bg-zinc-100 text-zinc-600" };
};

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

function EditableField({ icon: Icon, label, value, field, leadId, onUpdate }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || '');
  const save = async () => {
    if (!field) return;
    try {
      await api.put(`/leads/${leadId}/fields`, { [field]: val });
      onUpdate(field, val);
      toast.success(`${label} actualizado`);
    } catch { toast.error('Error'); }
    setEditing(false);
  };
  if (editing && field) {
    return (
      <div>
        <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
        <div className="flex items-center gap-1 mt-0.5">
          <Input value={val} onChange={e => setVal(e.target.value)} className="h-7 text-sm" autoFocus onKeyDown={e => e.key === 'Enter' && save()} />
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-emerald-600" onClick={save}><CheckCircle2 className="w-3.5 h-3.5" /></Button>
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-zinc-400" onClick={() => setEditing(false)}><X className="w-3.5 h-3.5" /></Button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <p className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1"><Icon className="w-3 h-3" />{label}</p>
      <div className="flex items-center gap-1.5 mt-0.5">
        <p className="text-sm text-zinc-800 truncate flex-1">{value || <span className="text-zinc-300">-</span>}</p>
        {field && <button onClick={() => { setVal(value || ''); setEditing(true); }} className="text-zinc-300 hover:text-blue-500 transition-colors"><Pencil className="w-3 h-3" /></button>}
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const { t } = useLanguage();
  const [searchParams] = typeof window !== 'undefined' ? [new URLSearchParams(window.location.search)] : [new URLSearchParams()];
  const jobIdFromUrl = searchParams.get('job_id') || '';
  const countryFromUrl = searchParams.get('country') || '';
  const [leads, setLeads] = useState([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ scored: 0, rejected: 0, approved: 0, contacted: 0 });
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [jobFilter, setJobFilter] = useState(jobIdFromUrl);
  const [sourceFilter, setSourceFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState(countryFromUrl);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [selected, setSelected] = useState([]);
  const [detailLead, setDetailLead] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newLead, setNewLead] = useState({ business_name: '', contact_name: '', email: '', phone: '', whatsapp: '', city: '', province: '', country: 'Argentina', category: '', website: '', linkedin: '', instagram: '', source: 'manual', status: 'nuevo', notes: '' });
  const [rescoring, setRescoring] = useState(false);

  // Lead taxonomies (custom per tenant)
  const FALLBACK_SOURCES = ['manual','bot_ia','spectra_prospection','formulario_web','landing_page','email_marketing','meta_ads','google_ads','linkedin','whatsapp','instagram','facebook','referido','evento','base_importada','outbound','google_maps','llamada_entrante','cliente_actual','partner','otro'];
  const FALLBACK_STATUSES = ['nuevo','sin_contactar','intento_contacto','contactado','en_conversacion','calificado','reunion_agendada','oportunidad','propuesta_futura','ganado','perdido','no_responde','mal_momento'];
  const [taxonomies, setTaxonomies] = useState({ sources: FALLBACK_SOURCES, statuses: FALLBACK_STATUSES, categories: [], channels: [], provinces: [], cities: [] });
  useEffect(() => {
    api.get('/tenant/lead-taxonomies').then(r => {
      const d = r.data || {};
      setTaxonomies({
        sources: (d.sources && d.sources.length) ? d.sources : FALLBACK_SOURCES,
        statuses: (d.statuses && d.statuses.length) ? d.statuses : FALLBACK_STATUSES,
        categories: d.categories || [], channels: d.channels || [], provinces: d.provinces || [], cities: d.cities || [],
      });
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const handleCreateLead = async () => {
    if (!newLead.business_name.trim()) { toast.error('Nombre de empresa es requerido'); return; }
    try {
      await api.post('/leads', newLead);
      toast.success('Lead creado');
      setCreateOpen(false);
      setNewLead({ business_name: '', contact_name: '', email: '', phone: '', whatsapp: '', city: '', province: '', country: 'Argentina', category: '', website: '', linkedin: '', instagram: '', source: 'manual', status: 'nuevo', notes: '' });
      fetchLeads();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al crear lead'); }
  };

  const handleRescore = async () => {
    setRescoring(true);
    try {
      const payload = selected.length > 0 ? { lead_ids: selected } : {};
      const { data } = await api.post('/ai/rescore-leads', payload);
      toast.success(data.message);
      setSelected([]);
      fetchLeads();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al re-clasificar'); }
    setRescoring(false);
  };

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30, sort_by: sortBy, sort_dir: sortDir };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (jobFilter) params.job_id = jobFilter;
      if (sourceFilter) params.source = sourceFilter;
      if (categoryFilter) params.category = categoryFilter;
      if (cityFilter) params.city = cityFilter;
      if (countryFilter) params.country = countryFilter;
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      const { data } = await api.get('/leads', { params });
      setLeads(data.leads);
      setTotal(data.total);
      setPages(data.pages);
      const statsParams = {};
      if (jobFilter) statsParams.job_id = jobFilter;
      const { data: s } = await api.get('/leads/stats', { params: statsParams });
      setStats({ scored: s.scored || 0, rejected: s.rejected || 0, approved: s.approved || 0, contacted: s.contacted || 0 });
    } catch (err) { console.error(err); }
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, [page, statusFilter, jobFilter, sourceFilter, categoryFilter, cityFilter, countryFilter, dateFrom, dateTo, sortBy, sortDir]);

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(field); setSortDir('desc'); }
    setPage(1);
  };
  const SortIcon = ({ field }) => {
    if (sortBy !== field) return <ChevronDown className="w-3 h-3 text-zinc-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-blue-600" /> : <ChevronDown className="w-3 h-3 text-blue-600" />;
  };

  const handleSearch = (e) => { e.preventDefault(); setPage(1); fetchLeads(); };
  const updateStatus = async (leadId, status) => {
    try { await api.put(`/leads/${leadId}/status`, { status }); toast.success(`Lead ${leadStatusLabels[status] || status}`); fetchLeads(); }
    catch { toast.error('Error al actualizar estado'); }
  };
  const handleBulk = async (action) => {
    if (!selected.length) return toast.error('Selecciona leads primero');
    if (action === 'delete' && !window.confirm(`Eliminar ${selected.length} lead(s)? Esta accion no se puede deshacer.`)) return;
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
          <Button size="sm" onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5" data-testid="create-lead-btn">
            <Plus className="w-4 h-4" /> Crear Lead
          </Button>
          <Button size="sm" variant="outline" onClick={handleRescore} disabled={rescoring} className="gap-1.5" data-testid="rescore-leads-btn">
            {rescoring ? <Loader2 className="w-4 h-4 animate-spin" /> : <TrendingUp className="w-4 h-4" />}
            {selected.length > 0 ? `Re-clasificar (${selected.length})` : 'Re-clasificar'}
          </Button>
          <input type="file" accept=".xlsx,.xls" ref={fileInputRef} onChange={handleImport} className="hidden" />
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={importing} data-testid="import-leads-btn">
            {importing ? <Loader2 className="w-4 h-4 animate-spin mr-1.5" /> : <Upload className="w-4 h-4 mr-1.5" />} Importar Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => downloadFile('/export/leads', 'leads_spectra.xlsx')} data-testid="export-leads-btn">
            <Download className="w-4 h-4 mr-1.5" /> Exportar
          </Button>
          <span className="text-sm text-zinc-500">{total} leads</span>
        </div>
      </div>

      <GuideBanner section="leads" />

      {/* Stats Summary */}
      {total > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3" data-testid="leads-stats">
          <button onClick={() => { setStatusFilter('scored'); setPage(1); }} className={`p-3 rounded-lg border text-left transition-colors ${statusFilter === 'scored' ? 'bg-indigo-100 border-indigo-300' : 'bg-indigo-50/50 border-indigo-100 hover:bg-indigo-50'}`}>
            <p className="text-xl font-semibold text-indigo-700">{stats.scored}</p>
            <p className="text-xs text-indigo-600">Calificados</p>
          </button>
          <button onClick={() => { setStatusFilter('rejected'); setPage(1); }} className={`p-3 rounded-lg border text-left transition-colors ${statusFilter === 'rejected' ? 'bg-red-100 border-red-300' : 'bg-red-50/50 border-red-100 hover:bg-red-50'}`}>
            <p className="text-xl font-semibold text-red-600">{stats.rejected}</p>
            <p className="text-xs text-red-500">Rechazados</p>
          </button>
          <button onClick={() => { setStatusFilter('approved'); setPage(1); }} className={`p-3 rounded-lg border text-left transition-colors ${statusFilter === 'approved' ? 'bg-emerald-100 border-emerald-300' : 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50'}`}>
            <p className="text-xl font-semibold text-emerald-700">{stats.approved}</p>
            <p className="text-xs text-emerald-600">Aprobados</p>
          </button>
          <button onClick={() => { setStatusFilter(''); setPage(1); }} className={`p-3 rounded-lg border text-left transition-colors ${!statusFilter ? 'bg-zinc-100 border-zinc-300' : 'bg-zinc-50/50 border-zinc-200 hover:bg-zinc-50'}`}>
            <p className="text-xl font-semibold text-zinc-800">{total}</p>
            <p className="text-xs text-zinc-500">Total</p>
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <Input data-testid="leads-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar leads..." className="pl-10 h-9" />
          </form>
          <Select value={sourceFilter || 'all'} onValueChange={v => { setSourceFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[160px] h-9" data-testid="leads-source-filter"><SelectValue placeholder="Fuente" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las fuentes</SelectItem>
              <SelectItem value="google_maps">B2B Google Maps</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="bot">OptimIA Bot</SelectItem>
              <SelectItem value="manual">Creado</SelectItem>
              <SelectItem value="imported">Importado</SelectItem>
            </SelectContent>
          </Select>
          <Input value={categoryFilter} onChange={e => { setCategoryFilter(e.target.value); setPage(1); }} placeholder="Categoria..." className="w-[140px] h-9" data-testid="leads-category-filter" />
          <select
            value={countryFilter}
            onChange={e => { setCountryFilter(e.target.value); setPage(1); }}
            className="h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm w-[170px]"
            data-testid="leads-country-filter"
          >
            <option value="">{`\u{1F310} Todos los paises`}</option>
            {[...COUNTRIES].sort((a, b) => a.es.localeCompare(b.es, 'es')).map(c => (
              <option key={c.c} value={c.es}>{flagOf(c.c)} {c.es}</option>
            ))}
          </select>
          <Input value={cityFilter} onChange={e => { setCityFilter(e.target.value); setPage(1); }} placeholder="Ciudad..." className="w-[140px] h-9" data-testid="leads-city-filter" />
          <div className="flex items-center gap-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2 h-9">
            <label className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Desde</label>
            <Input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }} className="w-[125px] h-7 border-0 px-1 text-xs bg-transparent focus-visible:ring-0" data-testid="leads-date-from" />
            <span className="w-px h-4 bg-zinc-300" />
            <label className="text-[10px] uppercase tracking-wide text-zinc-500 font-semibold">Hasta</label>
            <Input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }} className="w-[125px] h-7 border-0 px-1 text-xs bg-transparent focus-visible:ring-0" data-testid="leads-date-to" />
          </div>
          {(sourceFilter || categoryFilter || cityFilter || countryFilter || dateFrom || dateTo || statusFilter || jobFilter) && (
            <Button variant="ghost" size="sm" className="text-zinc-400 h-9" onClick={() => { setSourceFilter(''); setCategoryFilter(''); setCityFilter(''); setCountryFilter(''); setDateFrom(''); setDateTo(''); setStatusFilter(''); setJobFilter(''); setPage(1); }}>
              <X className="w-3.5 h-3.5 mr-1" /> Limpiar
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter || 'all'} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
            <SelectTrigger className="w-[180px] h-9" data-testid="leads-status-filter"><SelectValue placeholder="Todos los estados" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {Object.entries(leadStatusLabels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}
            </SelectContent>
          </Select>
          {jobFilter && (
            <Button variant="outline" size="sm" onClick={() => { setJobFilter(''); setPage(1); }} className="border-amber-200 bg-amber-50 text-amber-700 h-9">
              Filtro: Trabajo activo <X className="w-3 h-3 ml-1" />
            </Button>
          )}
          {selected.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9" data-testid="bulk-actions-button">Acciones ({selected.length})</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onClick={() => handleBulk('approve')} data-testid="bulk-approve">Aprobar seleccionados</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulk('reject')} data-testid="bulk-reject">Rechazar seleccionados</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulk('queue_sequence')}>Enviar a secuencia</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulk('send_to_crm')}>Enviar al CRM</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleBulk('delete')} className="text-red-600" data-testid="bulk-delete">Eliminar seleccionados</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Table */}
      <Card className="border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                <TableHead className="w-10"><Checkbox checked={selected.length === leads.length && leads.length > 0} onCheckedChange={toggleAll} data-testid="leads-select-all" /></TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('business_name')}>
                  <span className="flex items-center gap-1">Empresa <SortIcon field="business_name" /></span></TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Fuente</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('normalized_category')}>
                  <span className="flex items-center gap-1">Categoria <SortIcon field="normalized_category" /></span></TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('city')}>
                  <span className="flex items-center gap-1">Ciudad <SortIcon field="city" /></span></TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('ai_score')}>
                  <span className="flex items-center gap-1">Score <SortIcon field="ai_score" /></span></TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase cursor-pointer select-none" onClick={() => toggleSort('created_at')}>
                  <span className="flex items-center gap-1">Fecha <SortIcon field="created_at" /></span></TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase w-12">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={10} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : leads.length === 0 ? (
                <TableRow><TableCell colSpan={10} className="text-center py-12 text-zinc-400">No se encontraron leads</TableCell></TableRow>
              ) : leads.map((lead, i) => (
                <TableRow key={lead.id} className="hover:bg-zinc-50/80 cursor-pointer" data-testid={`lead-row-${i}`}>
                  <TableCell><Checkbox checked={selected.includes(lead.id)} onCheckedChange={() => toggleSelect(lead.id)} /></TableCell>
                  <TableCell className="font-medium text-zinc-900 text-sm" onClick={() => openDetail(lead)}>{lead.business_name}</TableCell>
                  <TableCell><Badge className={`${getSourceLabel(lead).color} text-[10px]`}>{getSourceLabel(lead).label}</Badge></TableCell>
                  <TableCell className="text-sm text-zinc-600">{lead.normalized_category}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{lead.city}</TableCell>
                  <TableCell>
                    <span className={`text-sm font-semibold ${lead.ai_score >= 80 ? 'text-emerald-600' : lead.ai_score >= 60 ? 'text-blue-600' : lead.ai_score >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                      {lead.ai_score}
                    </span>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="cursor-pointer"><Badge className={`${leadStatusColors[lead.status] || 'bg-slate-100 text-slate-700'} text-[11px] hover:ring-2 hover:ring-blue-300 transition-all`}>{leadStatusLabels[lead.status] || lead.status}</Badge></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="max-h-[300px] overflow-y-auto">
                        {Object.entries(leadStatusLabels).map(([key, label]) => (
                          <DropdownMenuItem key={key} onClick={() => updateStatus(lead.id, key)} className={lead.status === key ? 'bg-blue-50 font-medium' : ''}>
                            <Badge className={`${leadStatusColors[key] || ''} text-[10px] mr-2`}>{label}</Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                  <TableCell className="text-xs text-zinc-400">{lead.created_at ? lead.created_at.slice(0, 10) : '-'}</TableCell>
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
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className={`${leadStatusColors[detailLead.status] || ''} text-xs`}>{leadStatusLabels[detailLead.status] || detailLead.status}</Badge>
                <Badge className={`${getSourceLabel(detailLead).color} text-[10px]`}>{getSourceLabel(detailLead).label}</Badge>
                {detailLead.channel && detailLead.channel !== 'web' && (
                  <Badge className="bg-teal-50 text-teal-700 text-[10px]">{detailLead.channel}</Badge>
                )}
                <span className={`text-lg font-semibold ${detailLead.ai_score >= 80 ? 'text-emerald-600' : detailLead.ai_score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                  Score: {detailLead.ai_score}
                </span>
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
                  { icon: Star, label: 'Categoria', value: detailLead.normalized_category, field: 'normalized_category' },
                  { icon: Globe, label: 'Ciudad', value: `${detailLead.city || ''}${detailLead.province ? ', ' + detailLead.province : ''}`, field: null },
                  { icon: Globe, label: 'Sitio web', value: detailLead.website, field: 'website' },
                  { icon: Mail, label: 'Email', value: detailLead.email, field: 'email' },
                  { icon: Phone, label: 'Telefono', value: detailLead.phone, field: 'phone' },
                ].map(({ icon: Icon, label, value, field }) => (
                  <EditableField key={label} icon={Icon} label={label} value={value} field={field} leadId={detailLead.id} onUpdate={(f, v) => setDetailLead(p => ({...p, [f]: v}))} />
                ))}
              </div>
              <Separator />
              {/* ========== BLOQUE IA: Resumen + Conversación ========== */}
              <LeadAIBlock lead={detailLead} onUpdate={(patch) => setDetailLead(p => ({ ...p, ...patch }))} />
              <Separator />
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">Primera linea sugerida</p>
                <p className="text-sm text-zinc-700 italic">{detailLead.recommended_first_line || '—'}</p>
              </div>
              {/* Editable Notes & Channel */}
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Canal de origen</Label>
                  <Select value={detailLead.channel || 'web'} onValueChange={async v => { try { await api.put(`/leads/${detailLead.id}/fields`, { channel: v }); setDetailLead(p => ({...p, channel: v})); toast.success('Canal actualizado'); } catch { toast.error('Error'); } }}>
                    <SelectTrigger className="h-9 mt-1" data-testid="lead-channel-select"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="web">Web</SelectItem>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="facebook">Facebook</SelectItem>
                      <SelectItem value="instagram">Instagram</SelectItem>
                      <SelectItem value="email_inbound">Email</SelectItem>
                      <SelectItem value="telefono">Telefono</SelectItem>
                      <SelectItem value="referido">Referido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[10px] font-medium text-zinc-400 uppercase tracking-wider">Notas del vendedor</Label>
                  <textarea
                    data-testid="lead-notes-textarea"
                    className="w-full mt-1 border border-zinc-200 rounded-lg p-2 text-sm text-zinc-700 resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    defaultValue={detailLead.notes || ''}
                    onBlur={async e => { try { await api.put(`/leads/${detailLead.id}/fields`, { notes: e.target.value }); setDetailLead(p => ({ ...p, notes: e.target.value })); toast.success('Notas guardadas'); } catch { toast.error('Error'); } }}
                    placeholder="Agregar notas internas del vendedor..."
                  />
                </div>
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

      {/* Create Lead Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Crear Lead Manual</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div><Label>Empresa *</Label><Input value={newLead.business_name} onChange={e => setNewLead(p => ({ ...p, business_name: e.target.value }))} placeholder="Nombre de la empresa" data-testid="new-lead-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contacto principal</Label><Input value={newLead.contact_name} onChange={e => setNewLead(p => ({ ...p, contact_name: e.target.value }))} placeholder="Juan Perez" /></div>
              <div><Label>Email</Label><Input value={newLead.email} onChange={e => setNewLead(p => ({ ...p, email: e.target.value }))} placeholder="email@empresa.com" /></div>
              <div><Label>Telefono</Label><Input value={newLead.phone} onChange={e => setNewLead(p => ({ ...p, phone: e.target.value }))} placeholder="+54 11 1234-5678" /></div>
              <div><Label>WhatsApp</Label><Input value={newLead.whatsapp} onChange={e => setNewLead(p => ({ ...p, whatsapp: e.target.value }))} placeholder="+54 9 11 ..." /></div>
              <div><Label>Pais</Label>
                <select value={newLead.country} onChange={e => setNewLead(p => ({ ...p, country: e.target.value }))} className="w-full h-9 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 text-sm" data-testid="new-lead-country">
                  {[...COUNTRIES].sort((a, b) => a.es.localeCompare(b.es, 'es')).map(c => (
                    <option key={c.c} value={c.es}>{flagOf(c.c)} {c.es}</option>
                  ))}
                </select>
              </div>
              <div><Label>Provincia / Estado</Label><Input value={newLead.province} onChange={e => setNewLead(p => ({ ...p, province: e.target.value }))} placeholder="Buenos Aires" /></div>
              <div><Label>Ciudad</Label><Input value={newLead.city} onChange={e => setNewLead(p => ({ ...p, city: e.target.value }))} placeholder="CABA" /></div>
              <div><Label>Categoria</Label><Input value={newLead.category} onChange={e => setNewLead(p => ({ ...p, category: e.target.value }))} placeholder="Restaurantes" /></div>
              <div><Label>Sitio web</Label><Input value={newLead.website} onChange={e => setNewLead(p => ({ ...p, website: e.target.value }))} placeholder="www.empresa.com" /></div>
              <div><Label>LinkedIn</Label><Input value={newLead.linkedin} onChange={e => setNewLead(p => ({ ...p, linkedin: e.target.value }))} placeholder="linkedin.com/company/..." /></div>
              <div><Label>Instagram</Label><Input value={newLead.instagram} onChange={e => setNewLead(p => ({ ...p, instagram: e.target.value }))} placeholder="@empresa" /></div>
              <div>
                <Label>Fuente</Label>
                <select value={newLead.source} onChange={e => setNewLead(p => ({ ...p, source: e.target.value }))} className="w-full h-9 rounded-md border border-zinc-200 px-2 text-sm">
                  {taxonomies.sources.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <Label>Estado</Label>
                <select value={newLead.status} onChange={e => setNewLead(p => ({ ...p, status: e.target.value }))} className="w-full h-9 rounded-md border border-zinc-200 px-2 text-sm">
                  {taxonomies.statuses.map(s => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Notas</Label><Input value={newLead.notes} onChange={e => setNewLead(p => ({ ...p, notes: e.target.value }))} placeholder="Informacion adicional" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreateLead} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-lead">Crear Lead</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
