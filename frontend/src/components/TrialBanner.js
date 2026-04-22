import { useState, useEffect } from 'react';
import { Clock, Zap, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import api from '@/lib/api';
import { toast } from 'sonner';

export default function TrialBanner() {
  const [status, setStatus] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [blocked, setBlocked] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    const fetchStatus = () => api.get('/tenant/status').then(r => setStatus(r.data)).catch(() => {});
    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000); // refresh every 5 min
    const onBlock = (e) => setBlocked(e.detail);
    window.addEventListener('trial-blocked', onBlock);
    return () => { clearInterval(interval); window.removeEventListener('trial-blocked', onBlock); };
  }, []);

  const requestUpgrade = async () => {
    try {
      await api.post('/tenant/request-upgrade', { message: 'Quiero pasar a plan Pro' });
      toast.success('Solicitud enviada. Te contactaremos en breve.');
      setUpgradeOpen(false);
    } catch {
      // fallback: open mailto
      window.location.href = 'mailto:info@spectra-metrics.com?subject=Upgrade%20Plan%20Pro%20-%20Spectra%20Flow&body=Hola,%20quiero%20pasar%20mi%20cuenta%20a%20plan%20Pro.';
      setUpgradeOpen(false);
    }
  };

  if (!status || !status.is_trial || dismissed) return (
    <>
      {blocked && (
        <Dialog open={true}>
          <DialogContent className="max-w-md" data-testid="trial-blocked-dialog">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="w-5 h-5" /> Trial expirado</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 text-sm text-zinc-600">
              <p>Tu trial de 15 dias ha finalizado. Para seguir usando Spectra Flow, contacta con nosotros para activar tu plan Pro.</p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">Todas tus campanas, leads y contactos estan seguros. Solo necesitas activar tu plan para volver a acceder.</div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={requestUpgrade} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="trial-blocked-upgrade"><Zap className="w-4 h-4 mr-2" /> Activar plan Pro</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );

  const days = status.days_remaining;
  const urgent = days <= 3;
  const warning = days <= 7 && days > 3;

  const bgClass = urgent
    ? 'bg-red-50 border-red-200 text-red-800'
    : warning
      ? 'bg-amber-50 border-amber-200 text-amber-800'
      : 'bg-blue-50 border-blue-200 text-blue-800';

  return (
    <>
      <div className={`border-b px-4 sm:px-8 py-2.5 flex items-center justify-between gap-3 ${bgClass}`} data-testid="trial-banner">
        <div className="flex items-center gap-2 text-sm min-w-0">
          <Clock className="w-4 h-4 shrink-0" />
          <span className="font-medium truncate">
            {days === 0
              ? 'Tu trial expira hoy'
              : days === 1
                ? 'Te queda 1 dia de trial'
                : `Te quedan ${days} dias de trial`}
          </span>
          <span className="hidden sm:inline text-xs opacity-80">· Activa tu plan Pro para desbloquear todos los modulos</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <Button size="sm" onClick={() => setUpgradeOpen(true)} className="h-7 bg-blue-600 hover:bg-blue-700 text-white text-xs gap-1" data-testid="trial-banner-upgrade">
            <Zap className="w-3 h-3" /> Activar Pro
          </Button>
          <button onClick={() => setDismissed(true)} className="p-1 hover:bg-black/5 rounded" data-testid="trial-banner-dismiss" aria-label="Cerrar">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent className="max-w-md" data-testid="trial-upgrade-dialog">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Zap className="w-5 h-5 text-blue-600" /> Activar plan Pro</DialogTitle></DialogHeader>
          <div className="space-y-4 text-sm text-zinc-600">
            <p>Pasa a plan Pro y desbloquea:</p>
            <ul className="space-y-1.5 text-xs">
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> Prospeccion ilimitada (Google Maps + LinkedIn)</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> Email Marketing (campanas, segmentos, templates)</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> Spectra Performance (Meta, Google Ads, TikTok)</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> Landing Pages + Formularios</li>
              <li className="flex gap-2"><span className="text-emerald-500">✓</span> Soporte prioritario 24/7</li>
            </ul>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
              Te contactaremos para configurar tu plan a medida.
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" onClick={() => setUpgradeOpen(false)} className="flex-1">Cancelar</Button>
            <Button onClick={requestUpgrade} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" data-testid="trial-upgrade-confirm">
              <Zap className="w-4 h-4 mr-2" /> Solicitar upgrade
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
