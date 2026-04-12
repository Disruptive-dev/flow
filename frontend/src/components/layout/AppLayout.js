import Sidebar from '@/components/layout/Sidebar';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Outlet } from 'react-router-dom';
import { Globe, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { lang, toggleLang } = useLanguage();

  return (
    <div className="min-h-screen bg-zinc-50">
      <Sidebar />
      <div className="ml-[260px] min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-sm border-b border-zinc-200 px-8 py-3">
          <div className="flex items-center justify-end gap-3">
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
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Main Content */}
        <main className="px-8 pt-6 pb-12">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
