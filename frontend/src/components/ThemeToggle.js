import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

/**
 * Dark mode toggle. Persists in localStorage and applies `dark` class to <html>.
 * Tailwind config debe tener `darkMode: 'class'` (default v3).
 */
export function useTheme() {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem('sf_theme') || 'light'; } catch { return 'light'; }
  });
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark'); else root.classList.remove('dark');
    try { localStorage.setItem('sf_theme', theme); } catch {}
  }, [theme]);
  const toggle = () => setTheme(t => t === 'dark' ? 'light' : 'dark');
  return { theme, toggle };
}

export default function ThemeToggle({ className = '', variant = 'header' }) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  if (variant === 'login') {
    return (
      <button
        onClick={toggle}
        className={`text-zinc-500 hover:text-white flex items-center gap-1.5 text-sm transition-colors ${className}`}
        data-testid="theme-toggle"
        aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
        title={isDark ? 'Modo claro' : 'Modo oscuro'}
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>
    );
  }
  return (
    <button
      onClick={toggle}
      className={`p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 transition-colors ${className}`}
      data-testid="theme-toggle"
      aria-label={isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
      title={isDark ? 'Modo claro' : 'Modo oscuro'}
    >
      {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
    </button>
  );
}
