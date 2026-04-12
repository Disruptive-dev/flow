import { useState } from 'react';
import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useDemo } from '@/contexts/DemoContext';
import { Outlet, useNavigate } from 'react-router-dom';
import { Globe, User, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { lang, toggleLang } = useLanguage();
  const { demoActive, setDemoActive } = useDemo();
  const navigate = useNavigate();
  const [demoRunning, setDemoRunning] = useState(false);

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
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center">
                    <User className="w-3.5 h-3.5 text-white" />
                  </div>
                  <span className="text-sm font-medium text-zinc-700">{user?.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem className="text-xs text-zinc-500">{user?.email}</DropdownMenuItem>
                <DropdownMenuItem className="text-xs text-zinc-500 capitalize">{user?.role?.replace('_', ' ')}</DropdownMenuItem>
                <DropdownMenuItem onClick={logout} data-testid="user-menu-logout" className="text-red-600">
                  Cerrar sesion
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
    </div>
  );
}
