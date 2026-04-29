import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ShieldCheck, Plus, Users, Target, Mail, Building2, Pencil, Loader2, DollarSign, TrendingUp, Eye, Copy, Save, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

const planColors = {
  starter: 'bg-zinc-100 text-zinc-700',
  professional: 'bg-blue-50 text-blue-700',
  enterprise: 'bg-amber-50 text-amber-700',
};

const defaultModules = { prospeccion: true, leads: true, email_marketing: true, crm: true };

export default function TenantAdminPage() {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editTenant, setEditTenant] = useState(null);
  const [funnel, setFunnel] = useState(null);
  const [form, setForm] = useState({ name: '', admin_email: '', admin_password: '', admin_name: '', plan: 'starter', price: 0, modules: { ...defaultModules } });
  const [detailTenant, setDetailTenant] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [savingIntegration, setSavingIntegration] = useState('');

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/admin/tenants');
      setTenants(data);
    } catch (err) { toast.error('Error cargando tenants'); }
    setLoading(false);
  };

  useEffect(() => {
    fetchTenants();
    api.get('/admin/conversion-funnel').then(r => setFunnel(r.data)).catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!form.name || !form.admin_email || !form.admin_password) {
      toast.error('Nombre, email y password son requeridos');
      return;
    }
    try {
      await api.post('/admin/tenants', form);
      toast.success(`Tenant "${form.name}" creado`);
      setCreateOpen(false);
      setForm({ name: '', admin_email: '', admin_password: '', admin_name: '', plan: 'starter', price: 0, modules: { ...defaultModules } });
      fetchTenants();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error creando tenant'); }
  };

  const handleUpdate = async () => {
    if (!editTenant) return;
    try {
      await api.put(`/admin/tenants/${editTenant.id}`, {
        name: editTenant.name,
        plan: editTenant.plan,
        price: editTenant.price,
        modules: editTenant.modules,
        active: editTenant.active,
      });
      toast.success('Tenant actualizado');
      setEditTenant(null);
      fetchTenants();
    } catch (err) { toast.error('Error actualizando'); }
  };

  const toggleEditModule = (mod) => {
    setEditTenant(prev => ({ ...prev, modules: { ...prev.modules, [mod]: !prev.modules?.[mod] } }));
  };

  const toggleCreateModule = (mod) => {
    setForm(prev => ({ ...prev, modules: { ...prev.modules, [mod]: !prev.modules[mod] } }));
  };

  const openDetail = async (tenantId) => {
    setDetailLoading(true);
    setDetailTenant({ id: tenantId, loading: true });
    try {
      const { data } = await api.get(`/admin/tenants/${tenantId}`);
      setDetailTenant(data);
    } catch (err) { toast.error('Error cargando detalle'); setDetailTenant(null); }
    setDetailLoading(false);
  };

  const updateTenantIntegration = async (name, patch) => {
    if (!detailTenant) return;
    setSavingIntegration(name);
    try {
      const { data } = await api.put(`/admin/tenants/${detailTenant.id}/integrations/${name}`, patch);
      setDetailTenant(prev => ({
        ...prev,
        integrations: (prev.integrations || []).map(i => i.name === name ? data : i),
      }));
      toast.success(`${name} actualizado`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error guardando'); }
    setSavingIntegration('');
  };

  const testTenantIntegration = async (name) => {
    if (!detailTenant) return;
    setSavingIntegration(name);
    try {
      const { data } = await api.post(`/admin/tenants/${detailTenant.id}/integrations/${name}/test`);
      if (data.ok) toast.success(`✓ ${name}: ${data.message}`);
      else toast.error(`✗ ${name}: ${data.message || 'Sin respuesta'}`);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error probando conexion'); }
    setSavingIntegration('');
  };

  const moduleList = [
    { key: 'prospeccion', label: 'Spectra Prospeccion', color: 'bg-blue-100 text-blue-800' },
    { key: 'leads', label: 'Leads', color: 'bg-indigo-100 text-indigo-800' },
    { key: 'email_marketing', label: 'Spectra Email Marketing', color: 'bg-purple-100 text-purple-800' },
    { key: 'crm', label: 'Spectra CRM', color: 'bg-emerald-100 text-emerald-800' },
  ];

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="tenant-admin-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight flex items-center gap-3">
            <ShieldCheck className="w-8 h-8 text-amber-600" />
            Administracion de Tenants
          </h1>
          <p className="text-sm text-zinc-500 mt-1">{tenants.length} clientes registrados</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white gap-2" data-testid="create-tenant-btn">
          <Plus className="w-4 h-4" /> Nuevo Cliente
        </Button>
      </div>

      {/* Conversion Funnel */}
      {funnel && (
        <Card className="border-zinc-200 rounded-xl" data-testid="conversion-funnel">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-heading font-medium text-zinc-900 text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5 text-emerald-600" /> Embudo de Conversion Trial to Pro</h3>
              <div className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-900">{funnel.totals?.trial_tenants || 0}</span> trial · <span className="font-semibold text-emerald-700">{funnel.totals?.paid_tenants || 0}</span> paid
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-[10px] uppercase font-semibold text-blue-700 mb-1">Banner visto</p>
                <p className="text-2xl font-bold text-blue-900">{funnel.funnel?.banner_shown_unique || 0}</p>
                <p className="text-[10px] text-blue-600 mt-0.5">tenants unicos</p>
              </div>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                <p className="text-[10px] uppercase font-semibold text-indigo-700 mb-1">Abrio dialog</p>
                <p className="text-2xl font-bold text-indigo-900">{funnel.funnel?.dialog_opened_unique || 0}</p>
                <p className="text-[10px] text-indigo-600 mt-0.5">{funnel.funnel?.dialog_open_rate || 0}% del total</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                <p className="text-[10px] uppercase font-semibold text-emerald-700 mb-1">Solicito upgrade</p>
                <p className="text-2xl font-bold text-emerald-900">{funnel.funnel?.requested_unique || 0}</p>
                <p className="text-[10px] text-emerald-600 mt-0.5">{funnel.funnel?.request_rate || 0}% de los que abrieron</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[10px] uppercase font-semibold text-amber-700 mb-1">Conversion E2E</p>
                <p className="text-2xl font-bold text-amber-900">{funnel.funnel?.end_to_end_rate || 0}%</p>
                <p className="text-[10px] text-amber-600 mt-0.5">banner to request</p>
              </div>
              <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3">
                <p className="text-[10px] uppercase font-semibold text-zinc-700 mb-1">Solicitudes pendientes</p>
                <p className="text-2xl font-bold text-zinc-900">{funnel.recent_requests?.filter(r => r.status === 'pending').length || 0}</p>
                <p className="text-[10px] text-zinc-600 mt-0.5">por contactar</p>
              </div>
            </div>
            {funnel.recent_requests && funnel.recent_requests.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <p className="text-xs font-semibold text-zinc-600 uppercase">Ultimas solicitudes</p>
                {funnel.recent_requests.slice(0, 5).map((r, i) => (
                  <div key={i} className="flex items-center justify-between text-xs bg-zinc-50 rounded-md px-3 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-zinc-900 truncate">{r.tenant_name}</span>
                      <span className="text-zinc-500 truncate">{r.user_email}</span>
                    </div>
                    <span className="text-zinc-400 shrink-0">{new Date(r.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tenant Table */}
      <Card className="border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50">
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Cliente</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Plan</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Precio</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Modulos</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Usuarios</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Leads</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Contactos</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Estado</TableHead>
                <TableHead className="text-xs font-semibold text-zinc-500 uppercase w-12">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((t, i) => (
                <TableRow key={t.id} className="hover:bg-zinc-50/80" data-testid={`tenant-row-${i}`}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                        {t.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <div>
                        <p className="font-medium text-zinc-900 text-sm">{t.name}</p>
                        <p className="text-xs text-zinc-400">{t.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge className={planColors[t.plan] || planColors.starter}>{t.plan || 'starter'}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">${t.price || 0}/mes</TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {moduleList.filter(m => t.modules?.[m.key]).map(m => (
                        <span key={m.key} className={`text-[10px] px-1.5 py-0.5 rounded ${m.color}`}>{m.label.split(' ').pop()}</span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-zinc-600">{t.user_count || 0}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{t.lead_count || 0}</TableCell>
                  <TableCell className="text-sm text-zinc-600">{t.contact_count || 0}</TableCell>
                  <TableCell>
                    <Badge className={t.active !== false ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}>
                      {t.active !== false ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => openDetail(t.id)} data-testid={`view-tenant-${i}`} title="Ver detalle, usuarios e integraciones">
                        <Eye className="w-3.5 h-3.5" /> Configurar
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditTenant({ ...t })} data-testid={`edit-tenant-${i}`} title="Editar plan/módulos">
                        <Pencil className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Create Tenant Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" /> Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre del cliente</Label>
              <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Empresa XYZ SRL" data-testid="tenant-name-input" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email del admin</Label>
                <Input value={form.admin_email} onChange={e => setForm(p => ({ ...p, admin_email: e.target.value }))} placeholder="admin@empresa.com" data-testid="tenant-email-input" />
              </div>
              <div>
                <Label>Password</Label>
                <Input type="password" value={form.admin_password} onChange={e => setForm(p => ({ ...p, admin_password: e.target.value }))} data-testid="tenant-password-input" />
              </div>
            </div>
            <div>
              <Label>Nombre del admin</Label>
              <Input value={form.admin_name} onChange={e => setForm(p => ({ ...p, admin_name: e.target.value }))} placeholder="Juan Perez" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Plan</Label>
                <Select value={form.plan} onValueChange={v => setForm(p => ({ ...p, plan: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="professional">Professional</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Precio mensual (USD)</Label>
                <Input type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label className="mb-2 block">Modulos habilitados</Label>
              <div className="space-y-2">
                {moduleList.map(m => (
                  <div key={m.key} className="flex items-center justify-between p-2 border rounded-lg">
                    <Badge className={m.color}>{m.label}</Badge>
                    <Switch checked={form.modules[m.key]} onCheckedChange={() => toggleCreateModule(m.key)} data-testid={`create-module-${m.key}`} />
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-create-tenant">Crear Cliente</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Tenant Dialog */}
      <Dialog open={!!editTenant} onOpenChange={(open) => !open && setEditTenant(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Pencil className="w-5 h-5" /> Editar: {editTenant?.name}</DialogTitle>
          </DialogHeader>
          {editTenant && (
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input value={editTenant.name} onChange={e => setEditTenant(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Plan</Label>
                  <Select value={editTenant.plan || 'starter'} onValueChange={v => setEditTenant(p => ({ ...p, plan: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="starter">Starter</SelectItem>
                      <SelectItem value="professional">Professional</SelectItem>
                      <SelectItem value="enterprise">Enterprise</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Precio mensual (USD)</Label>
                  <Input type="number" value={editTenant.price || 0} onChange={e => setEditTenant(p => ({ ...p, price: parseFloat(e.target.value) || 0 }))} />
                </div>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <Label>Estado del tenant</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-zinc-500">{editTenant.active !== false ? 'Activo' : 'Inactivo'}</span>
                  <Switch checked={editTenant.active !== false} onCheckedChange={v => setEditTenant(p => ({ ...p, active: v }))} />
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Modulos habilitados</Label>
                <div className="space-y-2">
                  {moduleList.map(m => (
                    <div key={m.key} className="flex items-center justify-between p-2 border rounded-lg">
                      <Badge className={m.color}>{m.label}</Badge>
                      <Switch checked={editTenant.modules?.[m.key] ?? true} onCheckedChange={() => toggleEditModule(m.key)} data-testid={`edit-module-${m.key}`} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-zinc-50 p-3 rounded-lg text-xs text-zinc-500 space-y-1">
                <p>ID: {editTenant.id}</p>
                <p>Creado: {editTenant.created_at?.slice(0, 10)}</p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>Cancelar</Button>
            <Button onClick={handleUpdate} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="confirm-edit-tenant">Guardar Cambios</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tenant Detail Dialog: users + integrations (super_admin only) */}
      <Dialog open={!!detailTenant} onOpenChange={(o) => !o && setDetailTenant(null)}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" /> {detailTenant?.name || 'Detalle del cliente'}
            </DialogTitle>
          </DialogHeader>
          {detailLoading || detailTenant?.loading ? (
            <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-blue-600" /></div>
          ) : detailTenant && (
            <div className="space-y-6">
              {/* IDs and stats */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-zinc-50 rounded-lg p-3">
                  <p className="text-[11px] uppercase text-zinc-500 mb-1">Tenant ID</p>
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-zinc-800 truncate flex-1">{detailTenant.id}</code>
                    <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { navigator.clipboard.writeText(detailTenant.id); toast.success('Copiado'); }}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="bg-zinc-50 rounded-lg p-3 grid grid-cols-4 gap-2 text-center">
                  <div><p className="text-base font-semibold text-zinc-900">{detailTenant.stats?.leads || 0}</p><p className="text-[10px] text-zinc-500">Leads</p></div>
                  <div><p className="text-base font-semibold text-zinc-900">{detailTenant.stats?.contacts || 0}</p><p className="text-[10px] text-zinc-500">Contactos</p></div>
                  <div><p className="text-base font-semibold text-zinc-900">{detailTenant.stats?.deals || 0}</p><p className="text-[10px] text-zinc-500">Deals</p></div>
                  <div><p className="text-base font-semibold text-zinc-900">{detailTenant.stats?.campaigns || 0}</p><p className="text-[10px] text-zinc-500">Camp.</p></div>
                </div>
              </div>

              {/* Users */}
              <div>
                <h3 className="text-sm font-heading font-semibold mb-2 flex items-center gap-2"><Users className="w-4 h-4" /> Usuarios del cliente ({detailTenant.users?.length || 0})</h3>
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  {/* Quick access banner: lead super_admin to integrations modal */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 mb-4 text-xs text-blue-900 flex items-start gap-2">
                <SettingsIcon className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-semibold mb-0.5">¿Cómo cargar las credenciales (n8n, Dify, Resend, Apify) de un cliente?</p>
                  <p>Hacé click en el ícono <Eye className="w-3 h-3 inline mb-0.5" /> <strong>Configurar / Ver detalle</strong> de la fila del tenant. En el modal vas a encontrar la sección <strong>Integraciones (solo Super Admin)</strong> donde cargás Base URL y API Key. El cliente final NO ve esos valores, solo el estado activado/desactivado.</p>
                </div>
              </div>
              <Table>
                    <TableHeader>
                      <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                        <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase">Nombre</TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase">Email</TableHead>
                        <TableHead className="text-[11px] font-semibold text-zinc-500 uppercase">Rol</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(detailTenant.users || []).map((u) => {
                        const roleLabel = { super_admin: 'Super Administrador', tenant_admin: 'Administrador', operator: 'Operador', viewer: 'Visor' }[u.role] || u.role;
                        return (
                          <TableRow key={u.id || u.email}>
                            <TableCell className="text-sm font-medium">{u.name}</TableCell>
                            <TableCell className="text-sm text-zinc-600">{u.email}</TableCell>
                            <TableCell><Badge variant="secondary" className="text-[11px]">{roleLabel}</Badge></TableCell>
                          </TableRow>
                        );
                      })}
                      {(!detailTenant.users || detailTenant.users.length === 0) && (
                        <TableRow><TableCell colSpan={3} className="text-center py-4 text-xs text-zinc-400">Sin usuarios</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Integrations (super_admin only — credentials hidden from clients) */}
              <div>
                <h3 className="text-sm font-heading font-semibold mb-1 flex items-center gap-2"><SettingsIcon className="w-4 h-4" /> Integraciones (solo Super Admin)</h3>
                <p className="text-[11px] text-zinc-500 mb-3">Configurás las credenciales acá. El cliente verá solo el estado (activado/desactivado) sin las claves.</p>
                <div className="space-y-3">
                  {['n8n', 'dify', 'resend', 'apify'].map((name) => {
                    const intg = (detailTenant.integrations || []).find(i => i.name === name) || { name, base_url: '', api_key: '', enabled: false };
                    const labels = { n8n: 'n8n (Workflows)', dify: 'Dify (AI Scoring)', resend: 'Resend (Emails)', apify: 'Apify (LinkedIn)' };
                    const placeholders = {
                      n8n: 'https://n8n.tudominio.com/webhook/spectra-prospect',
                      dify: 'https://api.dify.ai/v1',
                      resend: 'https://api.resend.com',
                      apify: 'https://api.apify.com/v2',
                    };
                    return (
                      <div key={name} className="border border-zinc-200 rounded-lg p-3 bg-white">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-semibold">{labels[name]}</p>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-xs"
                              onClick={() => testTenantIntegration(name)}
                              disabled={savingIntegration === name}
                              data-testid={`test-${name}`}
                            >
                              {savingIntegration === name ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Probar'}
                            </Button>
                            <Switch
                              checked={!!intg.enabled}
                              onCheckedChange={(v) => updateTenantIntegration(name, { enabled: v })}
                              data-testid={`toggle-${name}`}
                            />
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-zinc-500 mb-1 block">Base URL / Webhook URL</Label>
                            <Input
                              defaultValue={intg.base_url || ''}
                              placeholder={placeholders[name]}
                              data-testid={`url-${name}`}
                              onBlur={(e) => e.target.value !== (intg.base_url || '') && updateTenantIntegration(name, { base_url: e.target.value })}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-zinc-500 mb-1 block">API Key / Token</Label>
                            <Input
                              type="password"
                              defaultValue={intg.api_key || ''}
                              placeholder="sk_xxx..."
                              data-testid={`key-${name}`}
                              onBlur={(e) => e.target.value !== (intg.api_key || '') && updateTenantIntegration(name, { api_key: e.target.value })}
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>
                        {savingIntegration === name && <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Guardando...</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailTenant(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
