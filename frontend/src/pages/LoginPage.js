import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Globe } from 'lucide-react';

export default function LoginPage() {
  const { user, login, register, formatApiError } = useAuth();
  const { lang, toggleLang, t } = useLanguage();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, name, orgName);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex" data-testid="login-page">
      {/* Left Side - Form */}
      <div className="w-full lg:w-[480px] flex flex-col justify-center px-8 lg:px-16 relative">
        <button
          onClick={toggleLang}
          className="absolute top-6 right-6 text-zinc-500 hover:text-white flex items-center gap-1.5 text-sm transition-colors"
          data-testid="login-language-toggle"
        >
          <Globe className="w-4 h-4" />
          {lang.toUpperCase()}
        </button>

        <div className="mb-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-2xl font-heading font-semibold text-white tracking-tight">Spectra Flow</span>
          </div>
          <h1 className="text-3xl font-heading font-semibold text-white mb-2">
            {isRegister ? t('create_account') : t('welcome_back')}
          </h1>
          <p className="text-zinc-400 text-sm">{t('sign_in_continue')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {isRegister && (
            <>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">{t('name')}</Label>
                <Input
                  data-testid="register-name-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-600 h-11"
                  placeholder="John Doe"
                  required
                />
              </div>
              <div>
                <Label className="text-zinc-300 text-sm mb-1.5 block">{t('organization')}</Label>
                <Input
                  data-testid="register-org-input"
                  value={orgName}
                  onChange={e => setOrgName(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-600 h-11"
                  placeholder="Acme Inc."
                />
              </div>
            </>
          )}
          <div>
            <Label className="text-zinc-300 text-sm mb-1.5 block">{t('email')}</Label>
            <Input
              data-testid="login-email-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-600 h-11"
              placeholder="you@company.com"
              required
            />
          </div>
          <div>
            <Label className="text-zinc-300 text-sm mb-1.5 block">{t('password')}</Label>
            <Input
              data-testid="login-password-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600 focus:border-blue-600 h-11"
              placeholder="********"
              required
            />
          </div>

          {error && (
            <div data-testid="auth-error" className="text-red-400 text-sm bg-red-950/30 border border-red-900/50 rounded-lg px-4 py-2.5">
              {error}
            </div>
          )}

          <Button
            type="submit"
            data-testid="login-submit-button"
            disabled={loading}
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-medium"
          >
            {loading ? '...' : isRegister ? t('sign_up') : t('login')}
          </Button>
        </form>

        <p className="mt-6 text-sm text-zinc-500 text-center">
          {isRegister ? t('have_account') : t('no_account')}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            data-testid="auth-toggle-mode"
            className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
          >
            {isRegister ? t('login') : t('sign_up')}
          </button>
        </p>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 items-center justify-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-zinc-950 to-zinc-950" />
        <div className="relative text-center px-16">
          <div className="w-20 h-20 rounded-2xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-8">
            <Zap className="w-10 h-10 text-blue-500" />
          </div>
          <h2 className="text-3xl font-heading font-semibold text-white mb-4 tracking-tight">
            Find. Clean. Activate. Convert.
          </h2>
          <p className="text-zinc-400 text-base leading-relaxed max-w-md mx-auto">
            Spectra Flow finds, cleans, activates, and converts business opportunities from a single premium platform.
          </p>
        </div>
      </div>
    </div>
  );
}
