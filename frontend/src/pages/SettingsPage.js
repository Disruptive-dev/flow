import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Building2, User, Link, Users, Plus, Loader2, Check, ExternalLink, Bot, Globe, Package, Pencil, Eye, EyeOff, Sliders } from 'lucide-react';
import { toast } from 'sonner';
import DomainsPage from '@/pages/DomainsPage';

function maskApiKey(key) {
  if (!key || key === '***configured***') return '***configured***';
  if (key.length <= 8) return '*'.repeat(key.length);
  return key.slice(0, 4) + '*'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
}

export default function SettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({ company_name: '', industry: '', phone: '', address: '', website: '', tax_id: '', country: '', description: '' });
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'operator' });
  const [modules, setModules] = useState({ prospeccion: true, crm: true, email_marketing: true });
  const [editingIntegration, setEditingIntegration] = useState(null);
  const [editValues, setEditValues] = useState({ base_url: '', api_key: '' });
  const [scoring, setScoring] = useState(null);
  const [savingScoring, setSavingScoring] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/settings/integrations'),
      api.get('/users').catch(() => ({ data: [] })),
      api.get('/tenant/modules').catch(() => ({ data: { prospeccion: true, crm: true, email_marketing: true } })),
      api.get('/settings/scoring').catch(() => ({ data: null })),
    ]).then(([s, i, u, m, sc]) => {
      setSettings(s.data);
      const b = s.data?.branding || {};
      setBranding({ company_name: b.company_name || '', industry: b.industry || '', phone: b.phone || '', address: b.address || '', website: b.website || '', tax_id: b.tax_id || '', country: b.country || '', description: b.description || '' });
      setIntegrations(i.data);
      setUsers(u.data);
      setModules(m.data);
      if (sc.data) setScoring(sc.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const saveBranding = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/settings', branding);
      setSettings(data);
      toast.success('Configuracion guardada');
    } catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const toggleModule = async (mod, value) => {
    const updated = { ...modules, [mod]: value };
    setModules(updated);
    try {
      await api.put('/tenant/modules', updated);
      toast.success(`Modulo ${mod} ${value ? 'activado' : 'desactivado'}`);
    } catch { toast.error('Error al actualizar modulos'); }
  };

  const toggleIntegration = async (name, enabled) => {
    try {
      const { data } = await api.put(`/settings/integrations/${name}`, { enabled });
      setIntegrations(prev => prev.map(i => i.name === name ? data : i));
      toast.success(`${name} ${enabled ? 'activado' : 'desactivado'}`);
    } catch { toast.error('Error al actualizar'); }
  };

  const startEditIntegration = (intg) => {
    setEditingIntegration(intg.name);
    setEditValues({ base_url: intg.base_url || '', api_key: '' });
  };

  const saveIntegration = async (name) => {
    try {
      const updates = {};
      if (editValues.base_url) updates.base_url = editValues.base_url;
      if (editValues.api_key) updates.api_key = editValues.api_key;
      if (Object.keys(updates).length > 0) {
        const { data } = await api.put(`/settings/integrations/${name}`, updates);
        setIntegrations(prev => prev.map(i => i.name === name ? data : i));
        toast.success('Integracion actualizada');
      }
      setEditingIntegration(null);
      setEditValues({ base_url: '', api_key: '' });
    } catch { toast.error('Error al actualizar'); }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) return toast.error('Completa todos los campos');
    try {
      const { data } = await api.post('/users', newUser);
      setUsers(prev => [...prev, data]);
      setUserDialogOpen(false);
      setNewUser({ email: '', password: '', name: '', role: 'operator' });
      toast.success('Usuario creado');
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al crear usuario'); }
  };

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('settings')}</h1>

      <Tabs defaultValue="branding">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="branding" data-testid="settings-tab-branding"><Building2 className="w-4 h-4 mr-1.5" />Empresa</TabsTrigger>
          <TabsTrigger value="users" data-testid="settings-tab-users"><Users className="w-4 h-4 mr-1.5" />{t('user_management')}</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="settings-tab-integrations"><Link className="w-4 h-4 mr-1.5" />{t('integrations')}</TabsTrigger>
          <TabsTrigger value="domains" data-testid="settings-tab-domains"><Globe className="w-4 h-4 mr-1.5" />Dominios</TabsTrigger>
          <TabsTrigger value="modules" data-testid="settings-tab-modules"><Package className="w-4 h-4 mr-1.5" />Modulos</TabsTrigger>
          <TabsTrigger value="scoring" data-testid="settings-tab-scoring"><Sliders className="w-4 h-4 mr-1.5" />Scoring</TabsTrigger>
          <TabsTrigger value="optimia" data-testid="settings-tab-optimia"><Bot className="w-4 h-4 mr-1.5" />OptimIA Bot</TabsTrigger>
        </TabsList>

        {/* Company Info */}
        <TabsContent value="branding">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-heading font-medium text-zinc-900 text-lg">Datos de la Empresa</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="md:col-span-2">
                  <Label className="text-sm mb-1.5 block">Nombre de la Empresa *</Label>
                  <Input data-testid="branding-company-name" value={branding.company_name || ''} onChange={e => setBranding(b => ({ ...b, company_name: e.target.value }))} placeholder="Mi Empresa SRL" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Industria / Rubro</Label>
                  <Input data-testid="branding-industry" value={branding.industry || ''} onChange={e => setBranding(b => ({ ...b, industry: e.target.value }))} placeholder="Tecnologia, Inmobiliaria, etc." />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Pais</Label>
                  <Input data-testid="branding-country" value={branding.country || ''} onChange={e => setBranding(b => ({ ...b, country: e.target.value }))} placeholder="Argentina" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Telefono</Label>
                  <Input data-testid="branding-phone" value={branding.phone || ''} onChange={e => setBranding(b => ({ ...b, phone: e.target.value }))} placeholder="+54 381 000-0000" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">CUIT / NIF / Tax ID</Label>
                  <Input data-testid="branding-tax-id" value={branding.tax_id || ''} onChange={e => setBranding(b => ({ ...b, tax_id: e.target.value }))} placeholder="30-12345678-9" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Sitio Web</Label>
                  <Input data-testid="branding-website" value={branding.website || ''} onChange={e => setBranding(b => ({ ...b, website: e.target.value }))} placeholder="https://miempresa.com" />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">Direccion</Label>
                  <Input data-testid="branding-address" value={branding.address || ''} onChange={e => setBranding(b => ({ ...b, address: e.target.value }))} placeholder="Av. Belgrano 1234, Tucuman" />
                </div>
                <div className="md:col-span-2">
                  <Label className="text-sm mb-1.5 block">Descripcion de la Empresa</Label>
                  <Textarea data-testid="branding-description" value={branding.description || ''} onChange={e => setBranding(b => ({ ...b, description: e.target.value }))} placeholder="Breve descripcion de tu empresa y servicios..." rows={3} />
                </div>
              </div>
              <Button onClick={saveBranding} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-branding-button">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} Guardar
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-medium text-zinc-900">Miembros del Equipo</h3>
                {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                  <Button size="sm" onClick={() => setUserDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="add-user-button">
                    <Plus className="w-4 h-4 mr-1" /> Agregar Usuario
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('name')}</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('email')}</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Rol</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => (
                    <TableRow key={u.id || i} data-testid={`user-row-${i}`}>
                      <TableCell className="font-medium text-zinc-900 text-sm">{u.name}</TableCell>
                      <TableCell className="text-sm text-zinc-600">{u.email}</TableCell>
                      <TableCell><Badge variant="secondary" className="text-xs capitalize">{u.role?.replace('_', ' ')}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Dialog open={userDialogOpen} onOpenChange={setUserDialogOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Agregar Miembro</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label className="text-sm mb-1.5 block">{t('name')}</Label><Input data-testid="new-user-name" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} /></div>
                <div><Label className="text-sm mb-1.5 block">{t('email')}</Label><Input data-testid="new-user-email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} type="email" /></div>
                <div><Label className="text-sm mb-1.5 block">Contrasena</Label><Input data-testid="new-user-password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} type="password" /></div>
                <div>
                  <Label className="text-sm mb-1.5 block">Rol</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser(u => ({ ...u, role: v }))}>
                    <SelectTrigger data-testid="new-user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant_admin">Admin del Tenant</SelectItem>
                      <SelectItem value="operator">Operador</SelectItem>
                      <SelectItem value="viewer">Visor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createUser} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-user-button">Crear Usuario</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Integrations - Masked API Keys */}
        <TabsContent value="integrations">
          <div className="space-y-4">
            {integrations.map((intg, i) => (
              <Card key={intg.name} className="border-zinc-200 rounded-xl" data-testid={`integration-card-${i}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-heading font-medium text-zinc-900">{intg.display_name || intg.name}</h3>
                      <p className="text-xs text-zinc-500 mt-0.5">{intg.description}</p>
                    </div>
                    <Switch checked={intg.enabled} onCheckedChange={v => toggleIntegration(intg.name, v)} data-testid={`integration-toggle-${i}`} />
                  </div>
                  {intg.enabled && (
                    <>
                      {editingIntegration === intg.name ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                          <div>
                            <Label className="text-xs mb-1 block">Base URL</Label>
                            <Input value={editValues.base_url} onChange={e => setEditValues(v => ({ ...v, base_url: e.target.value }))} placeholder="https://..." className="text-sm" data-testid={`integration-url-edit-${i}`} />
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block">API Key (nueva)</Label>
                            <Input value={editValues.api_key} onChange={e => setEditValues(v => ({ ...v, api_key: e.target.value }))} placeholder="Ingresa la API key completa..." className="text-sm" data-testid={`integration-key-edit-${i}`} />
                          </div>
                          <div className="md:col-span-2 flex gap-2">
                            <Button size="sm" onClick={() => saveIntegration(intg.name)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid={`integration-save-${i}`}>
                              <Check className="w-3.5 h-3.5 mr-1" /> Guardar
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setEditingIntegration(null)}>Cancelar</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                          <div>
                            <Label className="text-xs mb-1 block text-zinc-400">Base URL</Label>
                            <p className="text-sm text-zinc-700 font-mono bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-200 truncate">{intg.base_url || '-'}</p>
                          </div>
                          <div>
                            <Label className="text-xs mb-1 block text-zinc-400">API Key</Label>
                            <div className="flex items-center gap-2">
                              <p className="text-sm text-zinc-700 font-mono bg-zinc-50 px-3 py-2 rounded-lg border border-zinc-200 flex-1 truncate" data-testid={`integration-key-masked-${i}`}>{maskApiKey(intg.api_key)}</p>
                              <Button size="sm" variant="outline" onClick={() => startEditIntegration(intg)} className="flex-shrink-0" data-testid={`integration-edit-${i}`}>
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className={intg.status === 'connected' || intg.status === 'configured' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{intg.status === 'connected' ? 'Conectado' : intg.status === 'configured' ? 'Configurado' : intg.status === 'not_configured' ? 'Sin configurar' : intg.status?.replace(/_/g, ' ')}</Badge>
                    {intg.last_sync && <span className="text-xs text-zinc-400">Ultima sync: {new Date(intg.last_sync).toLocaleString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!integrations.length && <p className="text-sm text-zinc-400">No hay integraciones configuradas.</p>}
          </div>
        </TabsContent>

        <TabsContent value="domains">
          <DomainsPage />
        </TabsContent>

        <TabsContent value="modules">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-heading font-medium text-zinc-900 mb-1">Gestion de Modulos</h3>
                <p className="text-sm text-zinc-500 mb-6">Activa o desactiva los modulos disponibles para este tenant. Esto controla que secciones ve el cliente.</p>
              </div>
              {[
                { key: 'prospeccion', label: 'Prospeccion', desc: 'Buscador de Prospectos, Flow IA, Leads, Campanas, Plantillas', color: 'bg-blue-50 text-blue-700' },
                { key: 'crm', label: 'Spectra CRM', desc: 'Contactos, Pipeline de Oportunidades, Notas, Seguimiento', color: 'bg-emerald-50 text-emerald-700' },
                { key: 'email_marketing', label: 'Email Marketing', desc: 'Listas, Campanas de Email, Automatizaciones', color: 'bg-purple-50 text-purple-700' },
              ].map(({ key, label, desc, color }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-zinc-200 rounded-xl" data-testid={`module-${key}`}>
                  <div className="flex items-center gap-4">
                    <Badge className={color}>{label}</Badge>
                    <p className="text-sm text-zinc-500">{desc}</p>
                  </div>
                  <Switch checked={modules[key] ?? true} onCheckedChange={v => toggleModule(key, v)} data-testid={`module-toggle-${key}`} />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Scoring Config */}
        <TabsContent value="scoring">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-6 space-y-6">
              <div>
                <h3 className="font-heading font-medium text-zinc-900 mb-1">Configuracion de Scoring</h3>
                <p className="text-sm text-zinc-500 mb-6">Personaliza los pesos de cada criterio para calificar leads. Los puntajes se suman para dar el score final (0-100).</p>
              </div>
              {scoring && (
                <>
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 mb-3">Presencia Digital</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[{k:'website',l:'Sitio Web'},{k:'email',l:'Email de contacto'},{k:'phone',l:'Telefono'},{k:'address',l:'Direccion completa'}].map(({k,l}) => (
                        <div key={k}><Label className="text-xs mb-1 block">{l} (+pts)</Label><Input type="number" min={0} max={30} value={scoring[k] ?? 0} onChange={e => setScoring(s => ({...s, [k]: parseInt(e.target.value)||0}))} className="h-9" data-testid={`scoring-${k}`} /></div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 mb-3">Rating y Reviews</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {[{k:'rating_excellent',l:'Rating 4.5+ (+pts)'},{k:'rating_good',l:'Rating 4.0-4.4 (+pts)'},{k:'rating_fair',l:'Rating 3.5-3.9 (+pts)'},{k:'reviews_100',l:'100+ reviews (+pts)'},{k:'reviews_50',l:'50-99 reviews (+pts)'},{k:'reviews_10',l:'10-49 reviews (+pts)'}].map(({k,l}) => (
                        <div key={k}><Label className="text-xs mb-1 block">{l}</Label><Input type="number" min={0} max={25} value={scoring[k] ?? 0} onChange={e => setScoring(s => ({...s, [k]: parseInt(e.target.value)||0}))} className="h-9" data-testid={`scoring-${k}`} /></div>
                      ))}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium text-zinc-700 mb-3">Umbrales de Calidad</h4>
                    <div className="grid grid-cols-3 gap-4">
                      {[{k:'min_excellent',l:'Minimo Excelente'},{k:'min_good',l:'Minimo Bueno'},{k:'min_average',l:'Minimo Promedio'}].map(({k,l}) => (
                        <div key={k}><Label className="text-xs mb-1 block">{l}</Label><Input type="number" min={0} max={100} value={scoring[k] ?? 0} onChange={e => setScoring(s => ({...s, [k]: parseInt(e.target.value)||0}))} className="h-9" data-testid={`scoring-${k}`} /></div>
                      ))}
                    </div>
                    <p className="text-xs text-zinc-400 mt-2">Excelente: {scoring?.min_excellent}+, Bueno: {scoring?.min_good}-{(scoring?.min_excellent||80)-1}, Promedio: {scoring?.min_average}-{(scoring?.min_good||60)-1}, Bajo: 0-{(scoring?.min_average||40)-1}</p>
                  </div>
                  <Button onClick={async () => { setSavingScoring(true); try { await api.put('/settings/scoring', scoring); toast.success('Scoring guardado'); } catch { toast.error('Error'); } setSavingScoring(false); }} disabled={savingScoring} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-scoring-btn">
                    {savingScoring ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} Guardar Scoring
                  </Button>
                </>
              )}
              {!scoring && <p className="text-sm text-zinc-400">Cargando configuracion...</p>}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="optimia">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-8 text-center space-y-6">
              <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto">
                <Bot className="w-8 h-8 text-blue-600" />
              </div>
              <div>
                <h3 className="text-xl font-heading font-semibold text-zinc-900 mb-2">OptimIA Bot</h3>
                <p className="text-sm text-zinc-500 max-w-md mx-auto">
                  Accede al panel de OptimIA Bot para gestionar conversaciones, automatizaciones y soporte omnicanal de tus clientes.
                </p>
              </div>
              <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 text-base" data-testid="optimia-bot-button">
                <a href="https://inbox.optimia.disruptive-sw.com/app/login" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" /> Abrir OptimIA Bot
                </a>
              </Button>
              <p className="text-xs text-zinc-400">Se abre en una nueva ventana</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
