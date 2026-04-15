import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDemo } from '@/contexts/DemoContext';
import { Outlet, useNavigate } from 'react-router-dom';
import { Globe, User, Zap, Loader2, LogOut, KeyRound, UserCircle, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { lang, toggleLang } = useLanguage();
  const { demoActive, setDemoActive } = useDemo();
  const navigate = useNavigate();
  const [demoRunning, setDemoRunning] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: user?.name || '', phone: user?.phone || '', job_title: user?.job_title || '' });
  const [avatarUrl, setAvatarUrl] = useState(user?.avatar_url || '');
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm: '' });

  const saveProfile = async () => {
    try {
      await api.put('/auth/profile', profileForm);
      toast.success('Perfil actualizado');
      setProfileOpen(false);
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };
  const uploadAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const { data } = await api.post('/auth/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setAvatarUrl(data.avatar_url);
      toast.success('Foto de perfil actualizada');
    } catch { toast.error('Error al subir foto'); }
  };
  const changePassword = async () => {
    if (pwForm.new_password !== pwForm.confirm) { toast.error('Las passwords no coinciden'); return; }
    try {
      await api.put('/auth/change-password', { current_password: pwForm.current_password, new_password: pwForm.new_password });
      toast.success('Password cambiada exitosamente');
      setPasswordOpen(false);
      setPwForm({ current_password: '', new_password: '', confirm: '' });
    } catch (err) { toast.error(err.response?.data?.detail || 'Error'); }
  };

  const runDemo = async () => {
    setDemoRunning(true);
    setDemoActive(true);
    toast.info('Modo Demo activado. Creando trabajo de prospeccion...');

    try {
      // Step 1: Create a prospect job
      const { data: job } = await api.post('/prospect-jobs', {
        province: 'Tucuman',
        city: 'San Miguel de Tucuman',
        category: 'Real Estate',
        quantity: 50
      });
      toast.success(`Trabajo creado: Real Estate en San Miguel de Tucuman`);

      // Navigate to jobs page
      navigate(`/jobs?id=${job.id}`);

      // Step 2: Wait a moment then start the job
      await new Promise(r => setTimeout(r, 1500));
      toast.info('Iniciando busqueda de prospectos...');

      const { data: completedJob } = await api.post(`/prospect-jobs/${job.id}/start`);
      toast.success(`${completedJob.qualified_count} leads calificados encontrados!`);

      // Step 3: Create a demo campaign
      await new Promise(r => setTimeout(r, 1000));
      const { data: campaign } = await api.post('/campaigns', { name: 'Demo - Real Estate Tucuman' });
      toast.success('Campana demo creada');

      // Step 4: Simulate campaign sending
      await new Promise(r => setTimeout(r, 1000));
      const { data: simulated } = await api.post(`/campaigns/${campaign.id}/simulate`);
      toast.success(`Simulacion completa: ${simulated.sent_count} enviados, ${simulated.open_count} aperturas, ${simulated.interested_count} interesados`);

      toast.info('Demo listo! Navega por los modulos para ver los resultados. Los leads estan en "Leads", la campana en "Campanas".');

    } catch (err) {
      toast.error('Error en demo: ' + (err.response?.data?.detail || err.message));
    } finally {
      setDemoRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="ml-[260px] min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-zinc-200 px-8 py-3">
          <div className="flex items-center justify-end gap-3">
            {/* Demo Button */}
            <Button
              onClick={runDemo}
              disabled={demoRunning}
              data-testid="demo-button"
              variant={demoActive ? "default" : "outline"}
              size="sm"
              className={demoActive
                ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 font-medium"
                : "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 gap-1.5 font-medium"
              }
            >
              {demoRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              {demoRunning ? 'Ejecutando Demo...' : demoActive ? 'Demo Activo' : 'Demo'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLang}
              data-testid="language-toggle"
              className="text-zinc-500 hover:text-zinc-900 gap-1.5 font-medium"
            >
              <Globe className="w-4 h-4" />
              {lang.toUpperCase()}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" data-testid="user-menu-trigger" className="gap-2">
                  {avatarUrl ? (
                    <img src={`${process.env.REACT_APP_BACKEND_URL}${avatarUrl}`} alt="" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <span className="text-sm font-medium text-zinc-700">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-zinc-900">{user?.name}</p>
                  <p className="text-xs text-zinc-500">{user?.email}</p>
                  <p className="text-[10px] text-zinc-400 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setProfileForm({ name: user?.name || '', phone: user?.phone || '', job_title: user?.job_title || '' }); setProfileOpen(true); }} data-testid="user-menu-profile">
                  <UserCircle className="w-4 h-4 mr-2" /> Mi Perfil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setPasswordOpen(true)} data-testid="user-menu-password">
                  <KeyRound className="w-4 h-4 mr-2" /> Cambiar Password
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="user-menu-logout" className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" /> Cerrar sesion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Demo Banner */}
        {demoActive && (
          <div className="bg-amber-50 border-b border-amber-200 px-8 py-2 flex items-center justify-between">
            <p className="text-xs text-amber-700 font-medium">
              Modo Demo activo - Los datos son simulados. Navega por Leads, Campanas y Analytics para ver los resultados.
            </p>
            <Button variant="ghost" size="sm" onClick={() => setDemoActive(false)} className="text-amber-600 text-xs h-6">
              Ocultar
            </Button>
          </div>
        )}

        {/* Main Content */}
        <main className="px-8 pt-6 pb-12">
          <Outlet />
        </main>
      </div>

      {/* Profile Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Mi Perfil</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group relative">
                {avatarUrl ? (
                  <img src={`${process.env.REACT_APP_BACKEND_URL}${avatarUrl}`} alt="" className="w-20 h-20 rounded-full object-cover ring-2 ring-zinc-200 group-hover:ring-blue-400 transition-all" />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-blue-600 flex items-center justify-center text-white text-3xl font-bold ring-2 ring-zinc-200 group-hover:ring-blue-400 transition-all">
                    {profileForm.name?.charAt(0)?.toUpperCase() || 'U'}
                  </div>
                )}
                <div className="absolute bottom-0 right-0 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
                  <Pencil className="w-3 h-3" />
                </div>
                <input type="file" accept="image/*" onChange={uploadAvatar} className="hidden" />
              </label>
              <p className="text-[10px] text-zinc-400">Click para cambiar foto</p>
            </div>
            <div><Label>Nombre</Label><Input value={profileForm.name} onChange={e => setProfileForm(p => ({...p, name: e.target.value}))} data-testid="profile-name" /></div>
            <div><Label>Cargo</Label><Input value={profileForm.job_title} onChange={e => setProfileForm(p => ({...p, job_title: e.target.value}))} placeholder="Director Comercial" /></div>
            <div><Label>Telefono</Label><Input value={profileForm.phone} onChange={e => setProfileForm(p => ({...p, phone: e.target.value}))} placeholder="+54 11 1234-5678" /></div>
            <div><Label>Email</Label><Input value={user?.email || ''} disabled className="bg-zinc-50" /></div>
            <div><Label>Rol</Label><Input value={user?.role?.replace('_', ' ') || ''} disabled className="bg-zinc-50 capitalize" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProfileOpen(false)}>Cancelar</Button>
            <Button onClick={saveProfile} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-profile">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cambiar Password</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Password actual</Label><Input type="password" value={pwForm.current_password} onChange={e => setPwForm(p => ({...p, current_password: e.target.value}))} data-testid="current-password" /></div>
            <div><Label>Nueva password</Label><Input type="password" value={pwForm.new_password} onChange={e => setPwForm(p => ({...p, new_password: e.target.value}))} data-testid="new-password" /></div>
            <div><Label>Confirmar nueva password</Label><Input type="password" value={pwForm.confirm} onChange={e => setPwForm(p => ({...p, confirm: e.target.value}))} data-testid="confirm-password" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasswordOpen(false)}>Cancelar</Button>
            <Button onClick={changePassword} className="bg-blue-600 hover:bg-blue-700 text-white" data-testid="save-password">Cambiar Password</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
