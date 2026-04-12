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
import { Plus, FileText, Pencil, Trash2, Loader2, Eye, Code, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import FlowBotButton from '@/components/FlowBotButton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function TemplatesPage() {
  const { t } = useLanguage();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [form, setForm] = useState({ name: '', subject: '', html_body: '', plain_text: '', variables: [], signature: '' });
  const [saving, setSaving] = useState(false);
  const [previewId, setPreviewId] = useState(null);
  const [testResult, setTestResult] = useState(null);
  const [generatingAI, setGeneratingAI] = useState(false);
  const [aiIndustry, setAiIndustry] = useState('');
  const [aiTone, setAiTone] = useState('profesional');
  const [showAiPanel, setShowAiPanel] = useState(false);

  const generateWithAI = async () => {
    if (!aiIndustry) return toast.error('Selecciona una industria');
    setGeneratingAI(true);
    try {
      const { data } = await api.post('/ai/generate-template', { industry: aiIndustry, objective: 'generar interes y agendar reunion', tone: aiTone });
      setForm(f => ({ ...f, name: `Neuro - ${aiIndustry}`, subject: data.subject || f.subject, html_body: data.html_body || f.html_body, variables: data.variables || f.variables }));
      setDialogOpen(true);
      setShowAiPanel(false);
      toast.success('Plantilla neuropersuasiva generada con Flow IA Neuro');
    } catch (err) {
      toast.error('Error al generar: ' + (err.response?.data?.error || err.message));
    }
    setGeneratingAI(false);
  };

  const sendTestEmail = async (tmplId) => {
    try {
      const { data } = await api.post(`/templates/${tmplId}/send-test`, { to_email: 'test@demo.com' });
      setTestResult({ id: tmplId, ...data });
      toast.success(data.message);
    } catch { toast.error('Failed to send test'); }
  };

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
        <div className="flex items-center gap-3">
          <FlowBotButton section="plantillas" />
          <Button onClick={() => setShowAiPanel(!showAiPanel)} variant="outline" className="border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100" data-testid="flow-ia-neuro-button">
            <Sparkles className="w-4 h-4 mr-2" /> Flow IA Neuro
          </Button>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-template-button">
            <Plus className="w-4 h-4 mr-2" /> {t('create')} {t('template')}
          </Button>
        </div>
      </div>

      {/* AI Generation Panel */}
      {showAiPanel && (
        <Card className="border-purple-200 bg-purple-50/30 rounded-xl" data-testid="ai-neuro-panel">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-purple-600" />
              <h3 className="font-heading font-medium text-zinc-900">Generar con Flow IA Neuro</h3>
            </div>
            <p className="text-sm text-zinc-500 mb-4">Genera plantillas neuropersuasivas usando tecnicas de neuromarketing: urgencia, reciprocidad, prueba social, escasez y autoridad.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label className="text-sm mb-1.5 block">Industria</Label>
                <Select value={aiIndustry} onValueChange={setAiIndustry}>
                  <SelectTrigger data-testid="ai-industry-select"><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                  <SelectContent>
                    {["Inmobiliarias", "Tecnologia", "Gastronomia", "Legal", "Salud", "Educacion", "Seguros", "Consultoria", "Construccion", "Finanzas"].map(i => (
                      <SelectItem key={i} value={i}>{i}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-sm mb-1.5 block">Tono</Label>
                <Select value={aiTone} onValueChange={setAiTone}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="profesional">Profesional</SelectItem>
                    <SelectItem value="cercano">Cercano</SelectItem>
                    <SelectItem value="urgente">Urgente</SelectItem>
                    <SelectItem value="exclusivo">Exclusivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={generateWithAI} disabled={generatingAI} className="bg-purple-600 hover:bg-purple-700 text-white w-full h-10" data-testid="generate-ai-template-btn">
                  {generatingAI ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Generar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <div className="flex gap-2 mt-3 flex-wrap">
                  <Button size="sm" variant="ghost" onClick={() => setPreviewId(previewId === tmpl.id ? null : tmpl.id)} data-testid={`template-preview-${i}`}><Eye className="w-3.5 h-3.5 mr-1" /> Preview</Button>
                  <Button size="sm" variant="ghost" onClick={() => sendTestEmail(tmpl.id)} data-testid={`template-send-test-${i}`}><Send className="w-3.5 h-3.5 mr-1" /> Enviar Test</Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(tmpl)} data-testid={`template-edit-${i}`}><Pencil className="w-3.5 h-3.5 mr-1" /> {t('edit')}</Button>
                  <Button size="sm" variant="ghost" className="text-red-600 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(tmpl.id)} data-testid={`template-delete-${i}`}><Trash2 className="w-3.5 h-3.5" /></Button>
                </div>
                {previewId === tmpl.id && (
                  <div className="mt-3 p-3 bg-zinc-50 rounded-lg border border-zinc-200">
                    <div className="text-xs text-zinc-700" dangerouslySetInnerHTML={{ __html: tmpl.html_body }} />
                  </div>
                )}
                {testResult?.id === tmpl.id && (
                  <div className="mt-3 p-4 bg-emerald-50 rounded-lg border border-emerald-200 space-y-2">
                    <p className="text-xs font-medium text-emerald-700">Email de prueba enviado</p>
                    <p className="text-xs text-zinc-600"><strong>Asunto:</strong> {testResult.preview_subject}</p>
                    <div className="text-xs text-zinc-600 mt-1 p-2 bg-white rounded border border-zinc-200" dangerouslySetInnerHTML={{ __html: testResult.preview_html }} />
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
