import { NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, Search, Zap, Users, Mail, FileText,
  RefreshCw, BarChart3, Settings, LogOut, AtSign, ShieldCheck,
  MessageCircle, Palette, Brain
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import api from '@/lib/api';

const navSections = [
  { title: null, items: [
    { key: 'dashboard', label: 'Panel Principal', path: '/', icon: LayoutDashboard },
  ]},
  { title: 'Spectra Prospeccion', module: 'prospeccion', items: [
    { key: 'prospect_finder', label: 'Buscador de Prospectos', path: '/prospect-finder', icon: Search },
    { key: 'jobs', label: 'Flow IA', path: '/jobs', icon: Zap },
  ]},
  { title: 'Leads', module: 'leads', items: [
    { key: 'leads', label: 'Leads', path: '/leads', icon: Users },
  ]},
  { title: 'Spectra Email Marketing', module: 'email_marketing', items: [
    { key: 'email_marketing', label: 'Email Marketing', path: '/email-marketing', icon: AtSign },
    { key: 'campaigns', label: 'Campanas', path: '/campaigns', icon: Mail },
    { key: 'templates', label: 'Plantillas', path: '/templates', icon: FileText },
    { key: 'forms', label: 'Formularios', path: '/forms', icon: FileText, badge: 'Pronto' },
  ]},
  { title: 'Spectra CRM', module: 'crm', items: [
    { key: 'crm_sync', label: 'Spectra CRM', path: '/crm-sync', icon: RefreshCw },
  ]},
  { title: 'Spectra Web', module: 'web', items: [
    { key: 'landing_pages', label: 'Landing Pages', path: '/landing-pages', icon: LayoutDashboard, badge: 'Pronto' },
  ]},
  { title: 'Spectra Performance', module: 'performance', items: [
    { key: 'performance', label: 'Performance', path: '/performance', icon: BarChart3 },
  ]},
  { title: null, items: [
    { key: 'analytics', label: 'Analisis', path: '/analytics', icon: BarChart3 },
    { key: 'settings', label: 'Configuracion', path: '/settings', icon: Settings },
  ]},
];

const superAdminSection = { key: 'tenants', label: 'Admin Tenants', path: '/admin/tenants', icon: ShieldCheck };

export default function Sidebar() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [modules, setModules] = useState({ prospeccion: true, leads: true, crm: true, email_marketing: true });

  useEffect(() => {
    const loadModules = () => api.get('/tenant/modules').then(r => setModules({ leads: true, ...r.data })).catch(() => {});
    loadModules();
    // Listen for module changes
    window.addEventListener('modules-updated', loadModules);
    return () => window.removeEventListener('modules-updated', loadModules);
  }, []);

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <aside data-testid="sidebar" className="fixed left-0 top-0 h-screen w-[260px] bg-zinc-950 text-white flex flex-col z-50">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-6 border-b border-zinc-800">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <span className="text-lg font-heading font-semibold tracking-tight">Spectra Flow</span>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-3">
          {navSections.map((section, si) => {
            // Check if module is enabled
            if (section.module && !modules[section.module]) return null;
            return (
              <div key={si}>
                {section.title && (
                  <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{section.title}</p>
                )}
                {!section.title && si > 0 && <Separator className="my-2 bg-zinc-800" />}
                <div className="space-y-0.5">
                  {section.items.map(({ key, label, path, icon: Icon, badge }) => {
                    const isActive = path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
                    return (
                      <NavLink
                        key={key}
                        to={path}
                        data-testid={`sidebar-nav-${key}`}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-zinc-800 text-white'
                            : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                        }`}
                      >
                        <Icon className="w-[18px] h-[18px]" />
                        <span>{t(key) !== key ? t(key) : label}</span>
                        {badge && <span className="ml-auto text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded-full">{badge}</span>}
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {/* Super Admin Section */}
          {isSuperAdmin && (
            <>
              <Separator className="my-2 bg-zinc-800" />
              <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-amber-500 uppercase tracking-widest">Super Admin</p>
              <NavLink
                to={superAdminSection.path}
                data-testid="sidebar-nav-tenants"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  location.pathname.startsWith('/admin')
                    ? 'bg-amber-900/30 text-amber-400'
                    : 'text-zinc-400 hover:text-amber-400 hover:bg-zinc-800/60'
                }`}
              >
                <ShieldCheck className="w-[18px] h-[18px]" />
                <span>{superAdminSection.label}</span>
              </NavLink>
            </>
          )}
          {/* Products — visible for ALL users */}
          <Separator className="my-2 bg-zinc-800" />
          <p className="px-3 pt-3 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">Productos</p>
          <a href="https://inbox.optimia.disruptive-sw.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-emerald-400 hover:bg-zinc-800/60 transition-all duration-200"
            data-testid="sidebar-nav-optimia">
            <MessageCircle className="w-[18px] h-[18px] text-emerald-400" />
            <span>OptimIA Bot</span>
          </a>
          <a href="https://content-ia.spectra-metrics.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-purple-400 hover:bg-zinc-800/60 transition-all duration-200"
            data-testid="sidebar-nav-content-ia">
            <Palette className="w-[18px] h-[18px] text-purple-400" />
            <span>Spectra Content IA</span>
          </a>
          <a href="https://brain.spectra-metrics.com" target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-pink-400 hover:bg-zinc-800/60 transition-all duration-200"
            data-testid="sidebar-nav-brain">
            <Brain className="w-[18px] h-[18px] text-pink-400" />
            <span>Spectra Brain</span>
          </a>
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <a
          href="mailto:flow@spectra-metrics.com"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-white hover:bg-zinc-800/60 transition-colors w-full"
          data-testid="sidebar-contact-link"
        >
          <Mail className="w-[18px] h-[18px]" />
          <span>flow@spectra-metrics.com</span>
        </a>
        <button
          onClick={logout}
          data-testid="sidebar-logout-button"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-400 hover:text-white hover:bg-zinc-800/60 transition-colors w-full"
        >
          <LogOut className="w-[18px] h-[18px]" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>
  );
}
