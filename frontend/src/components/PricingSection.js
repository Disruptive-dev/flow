import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Check, Tag, Sparkles, Gift, Zap } from 'lucide-react';
import api from '@/lib/api';
import { toast } from 'sonner';

const COPY = {
  es: {
    kicker: 'Precios', title: 'Armá tu plan, pagá solo lo que usás',
    desc: 'Activá los módulos que necesitás. El precio se calcula dinámicamente. Probá 15 días gratis.',
    included: 'Incluido', select: 'Seleccionar', active: 'Activo', inactive: 'Inactivo',
    summary: 'Resumen mensual', subtotal: 'Subtotal', discount: 'Descuento',
    trial: '15 días de prueba GRATIS', free: 'Plan FREE', coupon: 'Cupón de descuento',
    apply: 'Aplicar', total: 'Total mensual', cta: 'Empezar prueba 15 días',
    coupon_placeholder: 'Ej: BIENVENIDO20', no_modules: 'Seleccioná al menos un módulo',
    mo: '/mes',
  },
  en: {
    kicker: 'Pricing', title: 'Build your plan, pay only for what you use',
    desc: 'Activate the modules you need. Price auto-calculates. Try free for 15 days.',
    included: 'Included', select: 'Select', active: 'Active', inactive: 'Inactive',
    summary: 'Monthly summary', subtotal: 'Subtotal', discount: 'Discount',
    trial: '15-day free trial', free: 'FREE plan', coupon: 'Discount coupon',
    apply: 'Apply', total: 'Monthly total', cta: 'Start 15-day trial',
    coupon_placeholder: 'E.g.: WELCOME20', no_modules: 'Select at least one module',
    mo: '/mo',
  },
};

export default function PricingSection({ lang }) {
  const t = COPY[lang] || COPY.es;
  const [modules, setModules] = useState({});
  const [selected, setSelected] = useState({});
  const [couponCode, setCouponCode] = useState('');
  const [coupon, setCoupon] = useState(null);
  const [freeMode, setFreeMode] = useState(false);

  useEffect(() => {
    api.get('/public/pricing').then(r => {
      setModules(r.data.modules || {});
      // Default selection: prospection + leads + crm (most popular)
      setSelected({ prospeccion: true, leads: true, crm: true });
    }).catch(() => {});
  }, []);

  const subtotal = useMemo(() => {
    return Object.entries(selected).reduce((sum, [k, on]) => on && modules[k] ? sum + (modules[k].price_usd || 0) : sum, 0);
  }, [selected, modules]);

  const discountPct = freeMode ? 100 : (coupon?.discount_percent || 0);
  const total = Math.max(0, Math.round(subtotal * (1 - discountPct / 100)));

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const { data } = await api.post('/public/apply-coupon', { code: couponCode.trim() });
      if (data.ok) { setCoupon(data); toast.success(`Cupón ${data.code} aplicado: -${data.discount_percent}%`); }
      else { setCoupon(null); toast.error(data.message || 'Cupón inválido'); }
    } catch { toast.error('Error al aplicar cupón'); }
  };

  if (!Object.keys(modules).length) return null;

  return (
    <section id="precios" className="py-20 px-4 sm:px-8 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/30">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest text-blue-600 dark:text-blue-400 font-semibold mb-2">{t.kicker}</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-heading font-bold leading-tight">{t.title}</h2>
          <p className="text-zinc-600 dark:text-zinc-400 mt-4 max-w-2xl mx-auto">{t.desc}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* MODULES GRID */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(modules).map(([key, m]) => {
              const on = !!selected[key];
              return (
                <Card key={key} className={`transition-all cursor-pointer ${on ? 'border-blue-500 ring-1 ring-blue-500 bg-white dark:bg-zinc-900' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:border-zinc-300'}`} onClick={() => setSelected(s => ({ ...s, [key]: !s[key] }))} data-testid={`pricing-module-${key}`}>
                  <CardContent className="p-4 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {on && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                        <h3 className="font-heading font-semibold text-sm text-zinc-900 dark:text-white truncate">{m.label}</h3>
                      </div>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-snug">{m.description}</p>
                      <p className="mt-2 font-heading font-bold text-blue-600 dark:text-blue-400">USD ${m.price_usd}<span className="text-[10px] font-normal text-zinc-500">{t.mo}</span></p>
                    </div>
                    <Switch checked={on} onClick={(e) => e.stopPropagation()} onCheckedChange={(v) => setSelected(s => ({ ...s, [key]: v }))} />
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* SUMMARY */}
          <Card className="border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 h-fit sticky top-20">
            <CardContent className="p-5 space-y-4">
              <h3 className="font-heading font-semibold text-zinc-900 dark:text-white flex items-center gap-2"><Sparkles className="w-4 h-4 text-blue-600" /> {t.summary}</h3>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 dark:bg-emerald-950/40 dark:border-emerald-900 p-3 flex items-start gap-2">
                <Gift className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-xs text-emerald-900 dark:text-emerald-200"><strong>{t.trial}</strong> — sin tarjeta, cancelás cuando quieras.</p>
              </div>

              {/* Free toggle */}
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 cursor-pointer">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> {t.free}
                </label>
                <Switch checked={freeMode} onCheckedChange={setFreeMode} data-testid="pricing-free-toggle" />
              </div>

              {/* Coupon */}
              <div>
                <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5 mb-1.5"><Tag className="w-3 h-3" /> {t.coupon}</label>
                <div className="flex gap-1.5">
                  <Input value={couponCode} onChange={e => setCouponCode(e.target.value.toUpperCase())} placeholder={t.coupon_placeholder} className="h-9 text-xs font-mono" data-testid="pricing-coupon-input" />
                  <Button size="sm" variant="outline" onClick={applyCoupon} className="h-9" data-testid="pricing-coupon-apply">{t.apply}</Button>
                </div>
                {coupon && <p className="text-[10px] text-emerald-600 mt-1">✓ {coupon.code}: -{coupon.discount_percent}%</p>}
              </div>

              <div className="border-t border-zinc-200 dark:border-zinc-800 pt-3 space-y-1.5 text-sm">
                <div className="flex justify-between text-zinc-600 dark:text-zinc-400"><span>{t.subtotal}</span><span>USD ${subtotal}{t.mo}</span></div>
                {discountPct > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>{t.discount} ({discountPct}%)</span><span>-USD ${subtotal - total}</span></div>
                )}
                <div className="flex justify-between font-heading font-bold text-zinc-900 dark:text-white text-lg pt-1.5 border-t border-zinc-100 dark:border-zinc-800"><span>{t.total}</span><span>USD ${total}{t.mo}</span></div>
              </div>

              <a href="#contacto" className="block" data-testid="pricing-cta">
                <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white h-11 font-medium">{t.cta}</Button>
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
