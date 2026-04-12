import { useState, useEffect } from 'react';
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
import { Search, MoreHorizontal, CheckCircle2, XCircle, Send, ExternalLink, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const leadStatusColors = {
  raw: "bg-slate-100 text-slate-700", cleaned: "bg-blue-50 text-blue-700", scored: "bg-indigo-50 text-indigo-700",
  approved: "bg-emerald-50 text-emerald-700", rejected: "bg-red-50 text-red-700",
  queued_for_sequence: "bg-purple-50 text-purple-700", contacted: "bg-amber-50 text-amber-700",
  opened: "bg-teal-50 text-teal-700", clicked: "bg-cyan-50 text-cyan-700",
  replied: "bg-green-50 text-green-700", interested: "bg-orange-50 text-orange-700",
  sent_to_crm: "bg-blue-100 text-blue-800", opportunity: "bg-fuchsia-50 text-fuchsia-700",
  closed_won: "bg-emerald-100 text-emerald-800 font-medium", closed_lost: "bg-slate-200 text-slate-800"
};

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

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchLeads();
  };

  const updateStatus = async (leadId, status) => {
    try {
      await api.put(`/leads/${leadId}/status`, { status });
      toast.success(`Lead ${status}`);
      fetchLeads();
    } catch (err) { toast.error('Failed to update status'); }
  };

  const handleBulk = async (action) => {
    if (!selected.length) return toast.error('Select leads first');
    try {
      const { data } = await api.post('/leads/bulk-action', { lead_ids: selected, action });
      toast.success(data.message);
      setSelected([]);
      fetchLeads();
    } catch (err) { toast.error('Bulk action failed'); }
  };

  const openDetail = async (lead) => {
    try {
      const { data } = await api.get(`/leads/${lead.id}`);
      setDetailLead(data);
      setDetailOpen(true);
    } catch { setDetailLead(lead); setDetailOpen(true); }
  };

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === leads.length ? [] : leads.map(l => l.id));

  return (
    <div className="space-y-6 animate-fade-in" data-testid="leads-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('leads')}</h1>
        <p className="text-sm text-zinc-500">{total} total leads</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearch} className="flex-1 min-w-[200px] max-w-sm relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <Input data-testid="leads-search-input" value={search} onChange={e => setSearch(e.target.value)} placeholder={t('search')} className="pl-10 h-10" />
        </form>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-[180px] h-10" data-testid="leads-status-filter"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.keys(leadStatusColors).map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
          </SelectContent>
        </Select>
        {selected.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" data-testid="bulk-actions-button">{t('bulk_actions')} ({selected.length})</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleBulk('approve')} data-testid="bulk-approve">{t('approve_selected')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulk('reject')} data-testid="bulk-reject">{t('reject_selected')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulk('queue_sequence')}>Send to Sequence</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleBulk('send_to_crm')}>Send to CRM</DropdownMenuItem>
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
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('business_name')}</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('normalized_category')}</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('city')}</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('score')}</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('quality_level')}</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('status')}</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase w-12">{t('actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12"><Loader2 className="w-5 h-5 animate-spin mx-auto text-zinc-400" /></TableCell></TableRow>
              ) : leads.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-zinc-400">No leads found</TableCell></TableRow>
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
                  <TableCell><span className="text-xs capitalize text-zinc-500">{lead.quality_level}</span></TableCell>
                  <TableCell><Badge className={`${leadStatusColors[lead.status] || 'bg-slate-100 text-slate-700'} text-[11px]`}>{lead.status.replace(/_/g, ' ')}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0" data-testid={`lead-actions-${i}`}><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetail(lead)}>{t('view_details')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'approved')}><CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />{t('approve')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'rejected')}><XCircle className="w-3.5 h-3.5 mr-2 text-red-600" />{t('reject')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'queued_for_sequence')}><Send className="w-3.5 h-3.5 mr-2" />{t('send_to_sequence')}</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => updateStatus(lead.id, 'sent_to_crm')}><ExternalLink className="w-3.5 h-3.5 mr-2" />{t('send_to_crm_action')}</DropdownMenuItem>
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
          <span className="text-sm text-zinc-500">Page {page} of {pages}</span>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)} data-testid="leads-next-page"><ChevronRight className="w-4 h-4" /></Button>
        </div>
      )}

      {/* Lead Detail Sheet */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="w-[440px] sm:max-w-[440px] overflow-y-auto" data-testid="lead-detail-sheet">
          <SheetHeader>
            <SheetTitle className="font-heading text-xl">{detailLead?.business_name}</SheetTitle>
          </SheetHeader>
          {detailLead && (
            <div className="mt-6 space-y-5">
              <div className="flex items-center gap-2">
                <Badge className={`${leadStatusColors[detailLead.status] || ''} text-xs`}>{detailLead.status?.replace(/_/g, ' ')}</Badge>
                <span className={`text-lg font-semibold ${detailLead.ai_score >= 80 ? 'text-emerald-600' : detailLead.ai_score >= 60 ? 'text-blue-600' : 'text-amber-600'}`}>
                  Score: {detailLead.ai_score}
                </span>
              </div>
              <Separator />
              {[
                [t('normalized_category'), detailLead.normalized_category],
                [t('raw_category'), detailLead.raw_category],
                [t('province'), detailLead.province],
                [t('city'), detailLead.city],
                [t('website'), detailLead.website],
                [t('email'), detailLead.email],
                [t('phone'), detailLead.phone],
                [t('quality_level'), detailLead.quality_level],
              ].map(([label, value]) => (
                <div key={label}>
                  <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">{label}</p>
                  <p className="text-sm text-zinc-800 mt-0.5">{value || '-'}</p>
                </div>
              ))}
              <Separator />
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{t('recommendation')}</p>
                <p className="text-sm text-zinc-700">{detailLead.recommendation}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{t('first_line')}</p>
                <p className="text-sm text-zinc-700 italic">{detailLead.recommended_first_line}</p>
              </div>
              <Separator />
              <div>
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">{t('event_history')}</p>
                {(detailLead.events || []).length > 0 ? (
                  <div className="space-y-2">
                    {detailLead.events.map((ev, i) => (
                      <div key={i} className="text-sm"><span className="text-zinc-500">{ev.event_type?.replace(/_/g, ' ')}</span> <span className="text-xs text-zinc-400">{new Date(ev.created_at).toLocaleString()}</span></div>
                    ))}
                  </div>
                ) : <p className="text-sm text-zinc-400">No events recorded</p>}
              </div>
              <Separator />
              <div className="flex gap-2 flex-wrap">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { updateStatus(detailLead.id, 'approved'); setDetailOpen(false); }} data-testid="lead-approve-button">{t('approve')}</Button>
                <Button size="sm" variant="destructive" onClick={() => { updateStatus(detailLead.id, 'rejected'); setDetailOpen(false); }} data-testid="lead-reject-button">{t('reject')}</Button>
                <Button size="sm" variant="outline" onClick={() => { updateStatus(detailLead.id, 'queued_for_sequence'); setDetailOpen(false); }}>{t('send_to_sequence')}</Button>
                <Button size="sm" variant="outline" onClick={() => { updateStatus(detailLead.id, 'sent_to_crm'); setDetailOpen(false); }}>{t('send_to_crm_action')}</Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
