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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Palette, User, Link, Users, Plus, Loader2, Check, ExternalLink, Bot } from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [settings, setSettings] = useState(null);
  const [integrations, setIntegrations] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [branding, setBranding] = useState({ company_name: '', logo_url: '', primary_color: '#1D4ED8', secondary_color: '#6366F1' });
  const [userDialogOpen, setUserDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'operator' });

  useEffect(() => {
    Promise.all([
      api.get('/settings'),
      api.get('/settings/integrations'),
      api.get('/users').catch(() => ({ data: [] })),
    ]).then(([s, i, u]) => {
      setSettings(s.data);
      setBranding(s.data?.branding || {});
      setIntegrations(i.data);
      setUsers(u.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const saveBranding = async () => {
    setSaving(true);
    try {
      const { data } = await api.put('/settings', branding);
      setSettings(data);
      toast.success('Settings saved');
    } catch { toast.error('Failed to save'); }
    setSaving(false);
  };

  const toggleIntegration = async (name, enabled) => {
    try {
      const { data } = await api.put(`/settings/integrations/${name}`, { enabled });
      setIntegrations(prev => prev.map(i => i.name === name ? data : i));
      toast.success(`${name} ${enabled ? 'enabled' : 'disabled'}`);
    } catch { toast.error('Failed to update'); }
  };

  const updateIntegration = async (name, field, value) => {
    try {
      const { data } = await api.put(`/settings/integrations/${name}`, { [field]: value });
      setIntegrations(prev => prev.map(i => i.name === name ? data : i));
    } catch { console.error('Failed to update integration'); }
  };

  const createUser = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) return toast.error('Fill all fields');
    try {
      const { data } = await api.post('/users', newUser);
      setUsers(prev => [...prev, data]);
      setUserDialogOpen(false);
      setNewUser({ email: '', password: '', name: '', role: 'operator' });
      toast.success('User created');
    } catch (err) { toast.error(err.response?.data?.detail || 'Failed to create user'); }
  };

  if (loading) return <div className="flex items-center gap-2 text-zinc-400 animate-fade-in"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>;

  return (
    <div className="space-y-6 animate-fade-in" data-testid="settings-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('settings')}</h1>

      <Tabs defaultValue="branding">
        <TabsList className="bg-zinc-100">
          <TabsTrigger value="branding" data-testid="settings-tab-branding"><Palette className="w-4 h-4 mr-1.5" />{t('branding')}</TabsTrigger>
          <TabsTrigger value="users" data-testid="settings-tab-users"><Users className="w-4 h-4 mr-1.5" />{t('user_management')}</TabsTrigger>
          <TabsTrigger value="integrations" data-testid="settings-tab-integrations"><Link className="w-4 h-4 mr-1.5" />{t('integrations')}</TabsTrigger>
          <TabsTrigger value="optimia" data-testid="settings-tab-optimia"><Bot className="w-4 h-4 mr-1.5" />OptimIA Bot</TabsTrigger>
        </TabsList>

        {/* Branding */}
        <TabsContent value="branding">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-6 space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <Label className="text-sm mb-1.5 block">{t('company_name')}</Label>
                  <Input data-testid="branding-company-name" value={branding.company_name || ''} onChange={e => setBranding(b => ({ ...b, company_name: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{t('logo')} URL</Label>
                  <Input value={branding.logo_url || ''} onChange={e => setBranding(b => ({ ...b, logo_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{t('primary_color')}</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={branding.primary_color || '#1D4ED8'} onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))} className="w-12 h-10 p-1" />
                    <Input value={branding.primary_color || '#1D4ED8'} onChange={e => setBranding(b => ({ ...b, primary_color: e.target.value }))} className="flex-1" />
                  </div>
                </div>
                <div>
                  <Label className="text-sm mb-1.5 block">{t('secondary_color')}</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={branding.secondary_color || '#6366F1'} onChange={e => setBranding(b => ({ ...b, secondary_color: e.target.value }))} className="w-12 h-10 p-1" />
                    <Input value={branding.secondary_color || '#6366F1'} onChange={e => setBranding(b => ({ ...b, secondary_color: e.target.value }))} className="flex-1" />
                  </div>
                </div>
              </div>
              <Button onClick={saveBranding} disabled={saving} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-branding-button">
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}{t('save')}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users */}
        <TabsContent value="users">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-heading font-medium text-zinc-900">Team Members</h3>
                {(user?.role === 'super_admin' || user?.role === 'tenant_admin') && (
                  <Button size="sm" onClick={() => setUserDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="add-user-button">
                    <Plus className="w-4 h-4 mr-1" /> Add User
                  </Button>
                )}
              </div>
              <Table>
                <TableHeader>
                  <TableRow className="bg-zinc-50 hover:bg-zinc-50">
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('name')}</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">{t('email')}</TableHead>
                    <TableHead className="text-xs font-semibold text-zinc-500 uppercase">Role</TableHead>
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
              <DialogHeader><DialogTitle className="font-heading">Add Team Member</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label className="text-sm mb-1.5 block">{t('name')}</Label><Input data-testid="new-user-name" value={newUser.name} onChange={e => setNewUser(u => ({ ...u, name: e.target.value }))} /></div>
                <div><Label className="text-sm mb-1.5 block">{t('email')}</Label><Input data-testid="new-user-email" value={newUser.email} onChange={e => setNewUser(u => ({ ...u, email: e.target.value }))} type="email" /></div>
                <div><Label className="text-sm mb-1.5 block">{t('password')}</Label><Input data-testid="new-user-password" value={newUser.password} onChange={e => setNewUser(u => ({ ...u, password: e.target.value }))} type="password" /></div>
                <div>
                  <Label className="text-sm mb-1.5 block">Role</Label>
                  <Select value={newUser.role} onValueChange={v => setNewUser(u => ({ ...u, role: v }))}>
                    <SelectTrigger data-testid="new-user-role"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
                      <SelectItem value="operator">Operator</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createUser} className="w-full bg-blue-600 hover:bg-blue-700 text-white" data-testid="create-user-button">{t('create')}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Integrations */}
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                      <div>
                        <Label className="text-xs mb-1 block">Base URL</Label>
                        <Input value={intg.base_url || ''} onChange={e => updateIntegration(intg.name, 'base_url', e.target.value)} placeholder="https://..." className="text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">API Key</Label>
                        <Input value={intg.api_key || ''} onChange={e => updateIntegration(intg.name, 'api_key', e.target.value)} placeholder="sk-..." type="password" className="text-sm" />
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-3 mt-3">
                    <Badge className={intg.status === 'connected' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}>{intg.status?.replace(/_/g, ' ')}</Badge>
                    {intg.last_sync && <span className="text-xs text-zinc-400">Last sync: {new Date(intg.last_sync).toLocaleString()}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
            {!integrations.length && <p className="text-sm text-zinc-400">No integrations configured.</p>}
          </div>
        </TabsContent>

        {/* OptimIA Bot */}
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
              <Button
                asChild
                className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-8 text-base"
                data-testid="optimia-bot-button"
              >
                <a href="https://inbox.optimia.disruptive-sw.com/app/login" target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Abrir OptimIA Bot
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
