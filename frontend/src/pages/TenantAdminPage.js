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
import { ShieldCheck, Plus, Users, Target, Mail, Building2, Pencil, Loader2, DollarSign } from 'lucide-react';
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
  const [form, setForm] = useState({ name: '', admin_email: '', admin_password: '', admin_name: '', plan: 'starter', price: 0, modules: { ...defaultModules } });

  const fetchTenants = async () => {
    try {
      const { data } = await api.get('/admin/tenants');
      setTenants(data);
    } catch (err) { toast.error('Error cargando tenants'); }
    setLoading(false);
  };

  useEffect(() => { fetchTenants(); }, []);

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
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => setEditTenant({ ...t })} data-testid={`edit-tenant-${i}`}>
                      <Pencil className="w-4 h-4" />
                    </Button>
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
    </div>
  );
}
