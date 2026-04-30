import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import api, { downloadFile } from '@/lib/api';
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
import { Building2, User, Link, Users, Plus, Loader2, Check, ExternalLink, Bot, Globe, Package, Pencil, Eye, EyeOff, Sliders, Download, Clock, Trash2, GitBranch, X, ArrowUp, ArrowDown } from 'lucide-react';
import { toast } from 'sonner';
import DomainsPage from '@/pages/DomainsPage';

function maskApiKey(key) {
  if (!key || key === '***configured***') return '***configured***';
  if (key.length <= 8) return '*'.repeat(key.length);
  return key.slice(0, 4) + '*'.repeat(Math.min(key.length - 8, 20)) + key.slice(-4);
}

function ProductsConfig() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState({ name: '', price: 0, description: '', currency: 'USD' });
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/crm/products').then(r => setProducts(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  const create = async () => {
    if (!form.name.trim()) return toast.error('Nombre requerido');
    const { data } = await api.post('/crm/products', form);
    setProducts(prev => [...prev, data]);
    setForm({ name: '', price: 0, description: '', currency: 'USD' });
    toast.success('Producto creado');
  };
  const remove = async (id) => { await api.delete(`/crm/products/${id}`); setProducts(prev => prev.filter(p => p.id !== id)); toast.success('Eliminado'); };
  return (
    <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6 space-y-4">
      <h3 className="font-heading font-medium text-zinc-900">Catalogo de Productos</h3>
      <p className="text-xs text-zinc-500">Configura productos predefinidos que podras asignar a oportunidades en el CRM.</p>
      <div className="flex gap-2">
        <Input value={form.name} onChange={e => setForm(p => ({...p, name: e.target.value}))} placeholder="Nombre del producto" className="flex-1 h-9" />
        <Input type="number" value={form.price} onChange={e => setForm(p => ({...p, price: parseFloat(e.target.value) || 0}))} placeholder="Precio" className="w-24 h-9" />
        <Button size="sm" onClick={create} className="bg-blue-600 hover:bg-blue-700 text-white h-9"><Plus className="w-4 h-4 mr-1" /> Agregar</Button>
      </div>
      <div className="space-y-2">
        {products.map(p => (
          <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
            <div><p className="text-sm font-medium text-zinc-900">{p.name}</p><p className="text-xs text-zinc-500">${p.price} {p.currency}</p></div>
            <Button size="sm" variant="ghost" className="text-red-400" onClick={() => remove(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
        {!products.length && !loading && <p className="text-xs text-zinc-400 text-center py-4">Sin productos. Agrega tu primer producto.</p>}
      </div>
    </CardContent></Card>
  );
}

function ActivityLogConfig() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/settings/activity-log?limit=100').then(r => setLogs(r.data)).catch(() => {}).finally(() => setLoading(false)); }, []);
  return (
    <Card className="border-zinc-200 rounded-xl"><CardContent className="p-6 space-y-4">
      <h3 className="font-heading font-medium text-zinc-900">Log de Actividad</h3>
      <p className="text-xs text-zinc-500">Registro de todas las acciones realizadas por los usuarios del sistema.</p>
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {logs.map((log, i) => (
          <div key={log.id || i} className="flex items-start gap-3 p-2.5 hover:bg-zinc-50 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-zinc-700">{log.details}</p>
              <p className="text-[10px] text-zinc-400">{log.user_name} ({log.user_email}) &middot; {log.action} &middot; {log.created_at?.slice(0, 16).replace('T', ' ')}</p>
            </div>
          </div>
        ))}
        {!logs.length && !loading && <p className="text-xs text-zinc-400 text-center py-6">Sin actividad registrada.</p>}
      </div>
    </CardContent></Card>
  );
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
  const [editUser, setEditUser] = useState(null);
  const [editUserOpen, setEditUserOpen] = useState(false);
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
      window.dispatchEvent(new Event('modules-updated'));
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

  const openEditUser = (u) => {
    setEditUser({ id: u.id, name: u.name || '', role: u.role, password: '', email: u.email });
    setEditUserOpen(true);
  };

  const saveEditUser = async () => {
    if (!editUser?.name) return toast.error('El nombre es obligatorio');
    try {
      const payload = { name: editUser.name, role: editUser.role };
      if (editUser.password) payload.password = editUser.password;
      const { data } = await api.put(`/users/${editUser.id}`, payload);
      setUsers(prev => prev.map(u => (u.id === editUser.id ? { ...u, ...data } : u)));
      setEditUserOpen(false);
      setEditUser(null);
      toast.success('Usuario actualizado');
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al actualizar'); }
  };

  const deleteUser = async (u) => {
    if (!window.confirm(`¿Eliminar a ${u.name} (${u.email})? Esta accion no se puede deshacer.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
      toast.success('Usuario eliminado');
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al eliminar'); }
  };

  const requestConnect = async (name, note) => {
    try {
      await api.post('/settings/integrations/request-connect', { name, note: note || '' });
      toast.success('Solicitud enviada. Te contactaremos en breve.');
    } catch (err) { toast.error(err.response?.data?.detail || 'No se pudo enviar la solicitud'); }
  };

  const resetDemoData = async () => {
    if (!window.confirm('Estas seguro? Se eliminaran UNICAMENTE los datos creados por el modo Demo (leads, jobs y campanas marcadas como demo). Los datos reales NO se tocan. Esta accion no se puede deshacer.')) return;
    try {
      const { data } = await api.post('/admin/reset-demo-data');
      toast.success(data.message || 'Datos demo eliminados');
    } catch (err) { toast.error(err.response?.data?.detail || 'Error al resetear'); }
  };

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('settings')}</h1>

      <Tabs defaultValue="branding">
        <TabsList className="bg-zinc-100 flex flex-wrap h-auto gap-1 p-1">
          {/* General */}
          <TabsTrigger value="branding" data-testid="settings-tab-branding"><Building2 className="w-4 h-4 mr-1.5" />Empresa</TabsTrigger>
          <TabsTrigger value="users" data-testid="settings-tab-users"><Users className="w-4 h-4 mr-1.5" />{t('user_management')}</TabsTrigger>
          {user?.role === 'super_admin' && <TabsTrigger value="modules" data-testid="settings-tab-modules"><Package className="w-4 h-4 mr-1.5" />Modulos</TabsTrigger>}
          <span className="w-px h-6 bg-zinc-300 mx-1 self-center hidden sm:inline-block" aria-hidden />
          {/* Modulos de producto */}
          <TabsTrigger value="leads" data-testid="settings-tab-leads"><Users className="w-4 h-4 mr-1.5" />Leads</TabsTrigger>
          <TabsTrigger value="crm" data-testid="settings-tab-crm"><GitBranch className="w-4 h-4 mr-1.5" />CRM</TabsTrigger>
          <TabsTrigger value="scoring" data-testid="settings-tab-scoring"><Sliders className="w-4 h-4 mr-1.5" />Scoring</TabsTrigger>
          <span className="w-px h-6 bg-zinc-300 mx-1 self-center hidden sm:inline-block" aria-hidden />
          {/* Conexiones */}
          {user?.role === 'super_admin' && <TabsTrigger value="integrations" data-testid="settings-tab-integrations"><Link className="w-4 h-4 mr-1.5" />{t('integrations')}</TabsTrigger>}
          {user?.role === 'tenant_admin' && <TabsTrigger value="connections" data-testid="settings-tab-connections"><Link className="w-4 h-4 mr-1.5" />Conexiones</TabsTrigger>}
          <TabsTrigger value="domains" data-testid="settings-tab-domains"><Globe className="w-4 h-4 mr-1.5" />Dominios</TabsTrigger>
          {user?.role === 'super_admin' && <TabsTrigger value="activity" data-testid="settings-tab-activity"><Clock className="w-4 h-4 mr-1.5" />Actividad</TabsTrigger>}
        </TabsList>

        {/* Connections (cliente tenant_admin) - solo estado + solicitar conexion */}
        <TabsContent value="connections">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-6">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-5 text-xs text-blue-900">
                <p className="font-semibold mb-1">Gestión de conexiones externas</p>
                <p>Las credenciales de n8n, Outscraper, Dify y Resend son <strong>gestionadas por el equipo Spectra</strong> para garantizar seguridad. Podés solicitar la activación de cada servicio y lo configuramos en horas.</p>
              </div>
              <div className="space-y-3">
                {[
                  { name: 'n8n_bot', label: 'OptimIA BOT', desc: 'Workflow n8n que corre el bot de Chatwoot (WhatsApp + web widget), conversa con prospectos y los califica.' },
                  { name: 'outscraper', label: 'Spectra Prospection', desc: 'Motor oficial de scraping Google Maps / LinkedIn. Activalo para poder lanzar búsquedas masivas de empresas.' },
                  { name: 'dify', label: 'Entrenamiento Bot Optimia', desc: 'Cerebro IA de tu bot. Cargá tus materiales (FAQ, catálogo, tono de marca) en tu carpeta Drive privada y nosotros entrenamos al bot.' },
                  { name: 'resend', label: 'Spectra Email Marketing', desc: 'Envío de campañas y emails transaccionales con tu dominio propio verificado.' },
                ].map(({ name, label, desc }) => {
                  const intg = integrations.find(i => i.name === name);
                  const active = !!intg?.enabled;
                  const driveUrl = intg?.drive_url || '';
                  return (
                    <div key={name} className="border border-zinc-200 rounded-lg p-4 bg-white" data-testid={`connection-row-${name}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-heading font-medium text-zinc-900 text-sm">{label}</h4>
                            <Badge className={active ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-zinc-100 text-zinc-600'}>{active ? 'Conectado' : 'Sin conectar'}</Badge>
                          </div>
                          <p className="text-xs text-zinc-500">{desc}</p>
                          {name === 'dify' && driveUrl && (
                            <a href={driveUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 mt-2 text-xs font-medium text-blue-700 hover:text-blue-800 hover:underline" data-testid={`drive-link-${name}`}>
                              <ExternalLink className="w-3 h-3" /> Subir materiales a mi Drive de entrenamiento
                            </a>
                          )}
                          {name === 'dify' && !driveUrl && active && (
                            <p className="text-[11px] text-amber-700 mt-1">Tu carpeta Drive aún no fue asignada. Te la enviaremos a tu email en breve.</p>
                          )}
                        </div>
                        {!active && (
                          <Button size="sm" variant="outline" className="border-blue-300 text-blue-700 hover:bg-blue-50" onClick={() => requestConnect(name)} data-testid={`request-connect-${name}`}>
                            Solicitar conexión
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

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

              {/* Tenant ID widget */}
              <div className="mt-8 pt-6 border-t border-zinc-200">
                <h3 className="font-heading font-medium text-zinc-900 text-sm mb-1">Tu ID de Empresa (Tenant ID)</h3>
                <p className="text-xs text-zinc-500 mb-3">Necesitás este ID al configurar el webhook de Chatwoot u otros servicios externos. Pegalo en la URL <code className="px-1 bg-zinc-100 rounded text-[11px]">/api/webhooks/chatwoot/lead/{'{tenant_id}'}</code>.</p>
                <div className="flex items-center gap-2 max-w-xl" data-testid="tenant-id-widget">
                  <Input value={user?.tenant_id || ''} readOnly className="font-mono text-xs bg-zinc-50" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => { navigator.clipboard.writeText(user?.tenant_id || ''); toast.success('ID copiado'); }}
                    data-testid="copy-tenant-id-button"
                    className="shrink-0"
                  >
                    <Check className="w-3.5 h-3.5 mr-1" /> Copiar
                  </Button>
                </div>
              </div>

              {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                <div className="mt-8 pt-6 border-t border-red-200">
                  <h3 className="font-heading font-medium text-red-700 text-sm mb-1 flex items-center gap-2">
                    <Trash2 className="w-4 h-4" /> Zona peligrosa · Resetear datos demo
                  </h3>
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 space-y-1.5 mb-3">
                    <p className="font-semibold">¿Qué hace este botón?</p>
                    <p>Tu tenant viene precargado con <strong>datos de prueba</strong> (leads, campañas, jobs y contactos del CRM marcados como <code className="px-1 bg-white rounded">is_demo: true</code>) para que puedas explorar la plataforma sin tener que esperar a tu primer scraping real.</p>
                    <p>Al apretar <strong>Resetear datos demo</strong>:</p>
                    <ul className="list-disc pl-4 space-y-0.5">
                      <li><strong>Se borran</strong> únicamente los registros marcados como demo.</li>
                      <li><strong>NO se tocan</strong> los datos reales que ya cargaste vos, importaste por Excel, recibiste por bot/webhook, ni los que vinieron de un Job real.</li>
                      <li>Todos los nuevos registros que crees después serán reales por defecto.</li>
                    </ul>
                    <p className="pt-1">Recomendado hacerlo apenas estés listo para empezar a usar el sistema en producción. <strong>Esta acción no se puede deshacer.</strong></p>
                  </div>
                  <Button onClick={resetDemoData} variant="outline" className="border-red-300 text-red-700 hover:bg-red-50" data-testid="reset-demo-data-button">
                    <Trash2 className="w-4 h-4 mr-2" /> Resetear datos demo
                  </Button>
                </div>
              )}
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
                    {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                      <TableHead className="text-xs font-semibold text-zinc-500 uppercase text-right">Acciones</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u, i) => {
                    const roleLabel = { super_admin: 'Super Administrador', tenant_admin: 'Administrador', operator: 'Operador', viewer: 'Visor' }[u.role] || u.role;
                    const isSuperAdmin = u.role === 'super_admin';
                    const canManage = (user?.role === 'super_admin' || (user?.role === 'tenant_admin' && !isSuperAdmin)) && u.id !== user?.id;
                    return (
                      <TableRow key={u.id || i} data-testid={`user-row-${i}`}>
                        <TableCell className="font-medium text-zinc-900 text-sm">{u.name}</TableCell>
                        <TableCell className="text-sm text-zinc-600">{u.email}</TableCell>
                        <TableCell><Badge variant="secondary" className="text-xs">{roleLabel}</Badge></TableCell>
                        {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                          <TableCell className="text-right">
                            {canManage ? (
                              <div className="flex items-center justify-end gap-1">
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => openEditUser(u)} data-testid={`edit-user-${i}`} title="Editar">
                                  <Pencil className="w-3.5 h-3.5" />
                                </Button>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => deleteUser(u)} data-testid={`delete-user-${i}`} title="Eliminar">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </Button>
                              </div>
                            ) : (
                              <span className="text-xs text-zinc-400">{u.id === user?.id ? 'Tú' : '—'}</span>
                            )}
                          </TableCell>
                        )}
                      </TableRow>
                    );
                  })}
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
                      {user?.role === 'super_admin' && <SelectItem value="super_admin">Super Administrador</SelectItem>}
                      <SelectItem value="tenant_admin">Administrador</SelectItem>
                      <SelectItem value="operator">Operador</SelectItem>
                      <SelectItem value="viewer">Visor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createUser} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-user-button">Crear Usuario</Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit User Dialog */}
          <Dialog open={editUserOpen} onOpenChange={setEditUserOpen}>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-heading">Editar Usuario</DialogTitle></DialogHeader>
              {editUser && (
                <div className="space-y-4 mt-4">
                  <div><Label className="text-sm mb-1.5 block">Email</Label><Input value={editUser.email} disabled /></div>
                  <div><Label className="text-sm mb-1.5 block">Nombre</Label><Input data-testid="edit-user-name" value={editUser.name} onChange={e => setEditUser(u => ({ ...u, name: e.target.value }))} /></div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Rol</Label>
                    <Select value={editUser.role} onValueChange={v => setEditUser(u => ({ ...u, role: v }))}>
                      <SelectTrigger data-testid="edit-user-role"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {user?.role === 'super_admin' && <SelectItem value="super_admin">Super Administrador</SelectItem>}
                        <SelectItem value="tenant_admin">Administrador</SelectItem>
                        <SelectItem value="operator">Operador</SelectItem>
                        <SelectItem value="viewer">Visor</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm mb-1.5 block">Nueva contrasena <span className="text-zinc-400 text-xs">(opcional)</span></Label>
                    <Input data-testid="edit-user-password" type="password" placeholder="Dejar vacio para no cambiar" value={editUser.password} onChange={e => setEditUser(u => ({ ...u, password: e.target.value }))} />
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setEditUserOpen(false)} className="flex-1">Cancelar</Button>
                    <Button onClick={saveEditUser} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-edit-user">Guardar cambios</Button>
                  </div>
                </div>
              )}
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
                    {intg.name === 'n8n' && (
                      <Button size="sm" variant="outline" className="ml-auto" onClick={() => downloadFile('/export/n8n-workflow', 'spectra-flow-n8n-workflow.json')} data-testid="download-n8n-workflow">
                        <Download className="w-3.5 h-3.5 mr-1.5" /> Descargar Workflow n8n
                      </Button>
                    )}
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
                { key: 'prospeccion', label: 'Spectra Prospeccion', desc: 'Buscador de Prospectos y Flow IA', color: 'bg-blue-50 text-blue-700' },
                { key: 'leads', label: 'Leads', desc: 'Centro de leads (prospeccion, bot, LinkedIn)', color: 'bg-indigo-50 text-indigo-700' },
                { key: 'email_marketing', label: 'Spectra Email Marketing', desc: 'Listas, Campanas de Email, Plantillas', color: 'bg-purple-50 text-purple-700' },
                { key: 'crm', label: 'Spectra CRM', desc: 'Contactos, Pipeline de Oportunidades, Notas', color: 'bg-emerald-50 text-emerald-700' },
                { key: 'fidelity', label: 'Spectra Fidelity', desc: 'Fidelizacion, beneficios, retencion (Proximamente)', color: 'bg-pink-50 text-pink-700' },
                { key: 'web', label: 'Spectra Web', desc: 'Landing Pages, Formularios', color: 'bg-orange-50 text-orange-700' },
                { key: 'performance', label: 'Spectra Performance', desc: 'Meta Ads, Google Ads, TikTok, SEO, GEO', color: 'bg-red-50 text-red-700' },
                { key: 'finance', label: 'Spectra Finance', desc: 'Control financiero, caja, rentabilidad (Proximamente)', color: 'bg-emerald-50 text-emerald-700' },
                { key: 'project_management', label: 'Spectra Project Management', desc: 'Proyectos, tableros, tareas (Proximamente)', color: 'bg-blue-50 text-blue-700' },
              ].map(({ key, label, desc, color }) => (
                <div key={key} className="flex items-center justify-between p-4 border border-zinc-200 rounded-xl" data-testid={`module-${key}`}>
                  <div className="flex items-center gap-4">
                    <Badge className={color}>{label}</Badge>
                    <p className="text-sm text-zinc-500">{desc}</p>
                  </div>
                  <Switch checked={modules[key] ?? false} onCheckedChange={v => toggleModule(key, v)} data-testid={`module-toggle-${key}`} />
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

        {/* CRM TAB - subsecciones */}
        <TabsContent value="crm">
          <CrmSettingsPanel role={user?.role} />
        </TabsContent>

        {/* LEADS TAB */}
        <TabsContent value="leads">
          <LeadsTaxonomiesConfig role={user?.role} />
        </TabsContent>

        {/* PRODUCTS TAB - REMOVED, ahora dentro de CRM */}

        {/* ACTIVITY LOG TAB */}
        {user?.role === 'super_admin' && (
          <TabsContent value="activity">
            <ActivityLogConfig />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

// ==================== PIPELINE CRM CONFIG ====================
function PipelineConfig({ role }) {
  const [stages, setStages] = useState([]);
  const [saving, setSaving] = useState(false);
  const isAdmin = role === 'super_admin' || role === 'tenant_admin';

  useEffect(() => {
    api.get('/tenant/pipeline-stages').then(r => setStages(r.data || [])).catch(() => {});
  }, []);

  const colors = ['blue', 'indigo', 'purple', 'violet', 'pink', 'red', 'orange', 'amber', 'lime', 'emerald', 'teal', 'cyan', 'slate'];

  const addStage = () => setStages([...stages, { key: `etapa_${stages.length + 1}`, label: `Nueva etapa ${stages.length + 1}`, color: 'blue' }]);
  const updateStage = (i, field, val) => {
    const next = [...stages];
    next[i] = { ...next[i], [field]: val };
    if (field === 'label') next[i].key = val.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    setStages(next);
  };
  const removeStage = (i) => { if (stages.length <= 1) return toast.error('Debe haber al menos una etapa'); setStages(stages.filter((_, idx) => idx !== i)); };
  const moveStage = (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= stages.length) return;
    const next = [...stages];
    [next[i], next[j]] = [next[j], next[i]];
    setStages(next);
  };
  const resetDefault = () => {
    if (!window.confirm('Restaurar las 9 etapas por defecto? (Diagnostico, Reunion, Propuesta, Negociacion, Aprobada, Ganada, Perdida, Pausada)')) return;
    setStages([
      { key: 'diagnostico', label: 'Diagnostico', color: 'blue' },
      { key: 'reunion', label: 'Reunion agendada', color: 'indigo' },
      { key: 'propuesta_preparar', label: 'Propuesta a preparar', color: 'purple' },
      { key: 'propuesta_enviada', label: 'Propuesta enviada', color: 'violet' },
      { key: 'negociacion', label: 'Negociacion', color: 'amber' },
      { key: 'aprobada', label: 'Aprobada', color: 'lime' },
      { key: 'ganada', label: 'Ganada', color: 'emerald' },
      { key: 'perdida', label: 'Perdida', color: 'red' },
      { key: 'pausada', label: 'Pausada', color: 'slate' },
    ]);
  };
  const save = async () => {
    if (!stages.length) return toast.error('Agrega al menos una etapa');
    setSaving(true);
    try {
      await api.put('/tenant/pipeline-stages', { stages });
      toast.success('Pipeline guardado');
      window.dispatchEvent(new Event('pipeline-updated'));
    } catch (e) { toast.error(e.response?.data?.detail || 'Error al guardar'); }
    setSaving(false);
  };

  return (
    <Card className="border-zinc-200 rounded-xl">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-heading font-medium text-zinc-900 text-lg flex items-center gap-2"><GitBranch className="w-5 h-5 text-blue-600" /> Etapas del Pipeline CRM</h3>
            <p className="text-xs text-zinc-500 mt-1">Define las etapas que aparecen en el Kanban y la lista de oportunidades. Cambialas cuando quieras.</p>
          </div>
          {isAdmin && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={resetDefault} size="sm" data-testid="pipeline-reset-default">Restaurar default</Button>
              <Button variant="outline" onClick={addStage} size="sm" data-testid="pipeline-add-stage"><Plus className="w-4 h-4 mr-1" /> Agregar etapa</Button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          {stages.map((s, i) => (
            <div key={i} className="flex items-center gap-2 p-2 bg-zinc-50 rounded-lg border border-zinc-200" data-testid={`pipeline-stage-row-${i}`}>
              <div className="flex flex-col gap-0.5">
                <button onClick={() => moveStage(i, -1)} disabled={!isAdmin || i === 0} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30" title="Subir"><ArrowUp className="w-3 h-3" /></button>
                <button onClick={() => moveStage(i, 1)} disabled={!isAdmin || i === stages.length - 1} className="text-zinc-400 hover:text-zinc-700 disabled:opacity-30" title="Bajar"><ArrowDown className="w-3 h-3" /></button>
              </div>
              <span className="text-xs font-mono text-zinc-400 w-6 text-center">{i + 1}</span>
              <Input value={s.label} onChange={e => updateStage(i, 'label', e.target.value)} disabled={!isAdmin} placeholder="Nombre de la etapa" className="flex-1 h-8 text-sm" />
              <select value={s.color} onChange={e => updateStage(i, 'color', e.target.value)} disabled={!isAdmin} className="h-8 rounded-md border border-zinc-200 px-2 text-xs">
                {colors.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className={`px-2 py-1 rounded-md text-xs bg-${s.color}-50 text-${s.color}-700 border border-${s.color}-200 hidden sm:inline`}>preview</span>
              <button onClick={() => removeStage(i)} disabled={!isAdmin} className="p-1 text-red-500 hover:bg-red-50 rounded disabled:opacity-30" title="Eliminar"><X className="w-4 h-4" /></button>
            </div>
          ))}
          {!stages.length && <p className="text-center text-sm text-zinc-400 py-8">Sin etapas definidas. Click en "Agregar etapa" para empezar.</p>}
        </div>

        {isAdmin && (
          <div className="pt-3 border-t border-zinc-200 flex justify-end">
            <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="pipeline-save">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} Guardar pipeline
            </Button>
          </div>
        )}
        {!isAdmin && <p className="text-xs text-zinc-500">Solo administradores pueden modificar el pipeline.</p>}
      </CardContent>
    </Card>
  );
}

// ==================== LEADS TAXONOMIES CONFIG ====================
function LeadsTaxonomiesConfig({ role }) {
  const [data, setData] = useState({ sources: [], statuses: [], categories: [], channels: [], provinces: [], cities: [] });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const isAdmin = role === 'super_admin' || role === 'tenant_admin';

  useEffect(() => {
    api.get('/tenant/lead-taxonomies').then(r => setData({ sources: [], statuses: [], categories: [], channels: [], provinces: [], cities: [], ...r.data })).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try { await api.put('/tenant/lead-taxonomies', data); toast.success('Configuracion de Leads guardada'); }
    catch { toast.error('Error al guardar'); }
    setSaving(false);
  };

  const lists = [
    { key: 'sources', label: 'Fuentes', desc: 'Origen del lead (manual, formulario, ads, referido, etc.)', placeholder: 'Ej: meta_ads' },
    { key: 'statuses', label: 'Estados', desc: 'Estado actual del lead en el funnel', placeholder: 'Ej: calificado' },
    { key: 'categories', label: 'Categorias / Industrias', desc: 'Sector o vertical del lead', placeholder: 'Ej: gastronomia' },
    { key: 'channels', label: 'Canales de origen', desc: 'Canal por el que llego (whatsapp, web, etc.)', placeholder: 'Ej: instagram' },
    { key: 'provinces', label: 'Provincias / Estados', desc: 'Provincias frecuentes para autocompletar', placeholder: 'Ej: Tucuman' },
    { key: 'cities', label: 'Ciudades', desc: 'Ciudades frecuentes para autocompletar', placeholder: 'Ej: San Miguel de Tucuman' },
  ];

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 py-8"><Loader2 className="w-4 h-4 animate-spin" /> Cargando...</div>;

  return (
    <div className="space-y-3" data-testid="leads-config">
      <Card className="border-zinc-200 rounded-xl bg-blue-50/50">
        <CardContent className="p-4 flex items-start gap-3">
          <Users className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-heading font-medium text-zinc-900 text-sm">Configuracion de Leads</h3>
            <p className="text-xs text-zinc-600 mt-0.5">Personaliza las opciones que aparecen al crear o editar leads. Los cambios se reflejan en toda la app.</p>
          </div>
        </CardContent>
      </Card>

      {lists.map(({ key, label, desc, placeholder }) => (
        <EditableTagList
          key={key}
          title={label}
          description={desc}
          placeholder={placeholder}
          items={data[key] || []}
          onChange={(items) => setData(d => ({ ...d, [key]: items }))}
          disabled={!isAdmin}
          testId={`leads-config-${key}`}
        />
      ))}

      {isAdmin && (
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="leads-config-save">
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />} Guardar configuracion de Leads
          </Button>
        </div>
      )}
      {!isAdmin && <p className="text-xs text-zinc-500">Solo administradores pueden modificar la configuracion de Leads.</p>}
    </div>
  );
}

function EditableTagList({ title, description, placeholder, items, onChange, disabled, testId }) {
  const [input, setInput] = useState('');
  const add = () => {
    const v = input.trim();
    if (!v || items.includes(v)) { setInput(''); return; }
    onChange([...items, v]);
    setInput('');
  };
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));
  return (
    <Card className="border-zinc-200 rounded-xl" data-testid={testId}>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h4 className="font-heading font-medium text-zinc-900 text-sm">{title} <span className="text-xs text-zinc-400 font-normal">({items.length})</span></h4>
            <p className="text-xs text-zinc-500 mt-0.5">{description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.length === 0 && <p className="text-xs text-zinc-400 italic">Sin opciones cargadas. Agrega la primera abajo.</p>}
          {items.map((it, i) => (
            <span key={i} className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-700 text-xs px-2 py-1 rounded-md border border-zinc-200">
              {it}
              {!disabled && <button onClick={() => remove(i)} className="text-zinc-400 hover:text-red-600" aria-label="Eliminar"><X className="w-3 h-3" /></button>}
            </span>
          ))}
        </div>
        {!disabled && (
          <div className="flex gap-2">
            <Input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} placeholder={placeholder} className="h-8 text-sm" />
            <Button onClick={add} variant="outline" size="sm" disabled={!input.trim()}><Plus className="w-3.5 h-3.5" /></Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// ==================== CRM SETTINGS PANEL (sub-tabs internos) ====================
function CrmSettingsPanel({ role }) {
  const [active, setActive] = useState('pipeline');
  const subs = [
    { key: 'pipeline', label: 'Pipeline', icon: GitBranch },
    { key: 'products', label: 'Productos', icon: Package },
    { key: 'budgets', label: 'Presupuestos', icon: Package, soon: true },
    { key: 'invoicing', label: 'Facturacion', icon: Package, soon: true },
  ];
  return (
    <div className="space-y-3" data-testid="crm-settings-panel">
      <div className="flex flex-wrap gap-1.5 border-b border-zinc-200 pb-3">
        {subs.map(s => {
          const Icon = s.icon;
          const isActive = active === s.key;
          return (
            <button key={s.key} onClick={() => setActive(s.key)} data-testid={`crm-subtab-${s.key}`}
              className={`px-3 py-1.5 rounded-md text-sm font-medium flex items-center gap-1.5 transition-colors ${isActive ? 'bg-zinc-900 text-white' : 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200'}`}>
              <Icon className="w-3.5 h-3.5" /> {s.label}
              {s.soon && <span className="text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full ml-1">Pronto</span>}
            </button>
          );
        })}
      </div>
      {active === 'pipeline' && <PipelineConfig role={role} />}
      {active === 'products' && <ProductsConfig />}
      {active === 'budgets' && <ComingSoonCard title="Presupuestos" subtitle="Creacion, envio y seguimiento de presupuestos comerciales conectados con clientes y oportunidades." />}
      {active === 'invoicing' && <ComingSoonCard title="Facturacion" subtitle="Gestion de facturas, ventas emitidas y conexion futura con Spectra Finance." />}
    </div>
  );
}

function ComingSoonCard({ title, subtitle }) {
  return (
    <Card className="border-2 border-dashed border-amber-200 rounded-xl bg-amber-50/30">
      <CardContent className="p-10 text-center space-y-3">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center">
          <Clock className="w-7 h-7 text-amber-600" />
        </div>
        <h3 className="text-xl font-heading font-semibold text-zinc-900">{title}</h3>
        <p className="text-sm text-zinc-600 max-w-md mx-auto">{subtitle}</p>
        <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
          Este modulo estara disponible proximamente
        </div>
      </CardContent>
    </Card>
  );
}
