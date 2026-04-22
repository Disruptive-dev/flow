import { useState } from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Zap, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) return <Navigate to="/login" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { toast.error('Las passwords no coinciden'); return; }
    if (password.length < 6) { toast.error('Minimo 6 caracteres'); return; }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      toast.success('Password restablecida. Ya podes iniciar sesion.');
      setDone(true);
    } catch (err) { toast.error(err.response?.data?.detail || 'Token invalido o expirado'); }
    setLoading(false);
  };

  if (done) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center mx-auto mb-4"><Zap className="w-6 h-6 text-white" /></div>
          <h1 className="text-2xl font-heading font-semibold text-white">Restablecer password</h1>
          <p className="text-sm text-zinc-400 mt-1">Ingresa tu nueva password</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><Label className="text-zinc-300 text-sm mb-1.5 block">Nueva password</Label><Input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="bg-zinc-900 border-zinc-800 text-white h-11" /></div>
          <div><Label className="text-zinc-300 text-sm mb-1.5 block">Confirmar password</Label><Input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="bg-zinc-900 border-zinc-800 text-white h-11" /></div>
          <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Restablecer
          </Button>
        </form>
      </div>
    </div>
  );
}
