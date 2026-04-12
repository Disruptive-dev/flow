import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  LayoutDashboard, Search, Briefcase, Users, Mail, FileText,
  RefreshCw, BarChart3, Settings, LogOut, Zap, AtSign
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

const navSections = [
  { title: null, items: [
    { key: 'dashboard', path: '/', icon: LayoutDashboard },
  ]},
  { title: 'Prospeccion', module: 'prospeccion', items: [
    { key: 'prospect_finder', path: '/prospect-finder', icon: Search },
    { key: 'jobs', path: '/jobs', icon: Zap },
    { key: 'leads', path: '/leads', icon: Users },
  ]},
  { title: 'Email Marketing', module: 'email_marketing', items: [
    { key: 'email_marketing', path: '/email-marketing', icon: AtSign },
    { key: 'campaigns', path: '/campaigns', icon: Mail },
    { key: 'templates', path: '/templates', icon: FileText },
  ]},
  { title: 'CRM', module: 'crm', items: [
    { key: 'crm_sync', path: '/crm-sync', icon: RefreshCw },
  ]},
  { title: null, items: [
    { key: 'analytics', path: '/analytics', icon: BarChart3 },
    { key: 'settings', path: '/settings', icon: Settings },
  ]},
];

export default function Sidebar() {
  const { logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

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
          {navSections.map((section, si) => (
            <div key={si}>
              {section.title && (
                <p className="px-3 pt-4 pb-1.5 text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{section.title}</p>
              )}
              {!section.title && si > 0 && <Separator className="my-2 bg-zinc-800" />}
              <div className="space-y-0.5">
                {section.items.map(({ key, path, icon: Icon }) => {
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
                      <span>{t(key)}</span>
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="p-3 border-t border-zinc-800">
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
