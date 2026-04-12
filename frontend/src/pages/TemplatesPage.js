import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Plus, FileText, Pencil, Trash2, Loader2, Eye, Code } from 'lucide-react';
import { toast } from 'sonner';

export default function TemplatesPage() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', html_body: '', plain_text: '', variables: [], signature: '' });
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState(null);

  useEffect(() => {
    api.get('/templates').then(r => setTemplates(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditingTemplate(null);
    setForm({ name: '', subject: '', html_body: '', plain_text: '', variables: [], signature: '' });
    setDialogOpen(true);
  };

  const openEdit = (tmpl) => {
    setEditingTemplate(tmpl);
    setForm({ name: tmpl.name, subject: tmpl.subject, html_body: tmpl.html_body, plain_text: tmpl.plain_text || '', variables: tmpl.variables || [], signature: tmpl.signature || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.subject || !form.html_body) return toast.error('Please fill name, subject, and body');
    setSaving(true);
    try {
      if (editingTemplate) {
        const { data } = await api.put(`/templates/${editingTemplate.id}`, form);
        setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data : t));
        toast.success('Template updated');
      } else {
        const { data } = await api.post('/templates', form);
        setTemplates(prev => [data, ...prev]);
        toast.success('Template created');
      }
      setDialogOpen(false);
    } catch (err) { toast.error('Failed to save template'); }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/templates/${id}`);
      setTemplates(prev => prev.filter(t => t.id !== id));
      toast.success('Template deleted');
    } catch { toast.error('Failed to delete'); }
  };

  const supportedVars = ['{business_name}', '{city}', '{normalized_category}', '{recommended_first_line}', '{sender_name}'];

  return (
    <div className="space-y-6 animate-fade-in" data-testid="templates-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('templates')}</h1>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-template-button">
          <Plus className="w-4 h-4 mr-2" /> {t('create')} {t('template')}
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-zinc-400"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tmpl, i) => (
            <Card key={tmpl.id} className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-colors" data-testid={`template-card-${i}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-indigo-600" />
                    </div>
                    <h3 className="font-heading font-medium text-zinc-900 text-sm">{tmpl.name}</h3>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mb-2">{tmpl.subject}</p>
                {tmpl.variables?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tmpl.variables.map(v => <Badge key={v} variant="secondary" className="text-[10px]">{`{${v}}`}</Badge>)}
                  </div>
                )}
                <div className="flex gap-2 mt-3">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewId(previewId === tmpl.id ? null : tmpl.id)} data-testid={`template-preview-${i}`}><Eye className="w-3.5 h-3.5 mr-1" /> Preview</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(tmpl)} data-testid={`template-edit-${i}`}><Pencil className="w-3.5 h-3.5 mr-1" /> {t('edit')}</Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(tmpl.id)} data-testid={`template-delete-${i}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                {previewId === tmpl.id && (
                  <div className="mt-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="text-xs text-zinc-700" dangerouslySetInnerHTML={{ __html: tmpl.html_body }} />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {!templates.length && <p className="text-sm text-zinc-400 col-span-3">No templates yet. Create your first email template.</p>}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-heading">{editingTemplate ? `${t('edit')} ${t('template')}` : `${t('create')} ${t('template')}`}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label className="text-sm mb-1.5 block">{t('template_name')}</Label>
              <Input data-testid="template-name-input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Primer Contacto" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">{t('subject')}</Label>
              <Input data-testid="template-subject-input" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="Oportunidad para {business_name}" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">{t('body')} (HTML)</Label>
              <Textarea data-testid="template-body-input" value={form.html_body} onChange={e => setForm(f => ({ ...f, html_body: e.target.value }))} rows={8} placeholder="<p>Estimado equipo de <strong>{business_name}</strong>,</p>" />
            </div>
            <div>
              <Label className="text-sm mb-1.5 block">{t('signature')}</Label>
              <Input value={form.signature} onChange={e => setForm(f => ({ ...f, signature: e.target.value }))} placeholder="El equipo de Spectra Flow" />
            </div>
            <Separator />
            <div>
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2">Available {t('variables')}</p>
              <div className="flex flex-wrap gap-1.5">
                {supportedVars.map(v => (
                  <Badge key={v} variant="outline" className="text-xs cursor-pointer hover:bg-zinc-100" onClick={() => { setForm(f => ({ ...f, html_body: f.html_body + v })); }}><Code className="w-3 h-3 mr-1" />{v}</Badge>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="template-save-button">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{t('save')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
