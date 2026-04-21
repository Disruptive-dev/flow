import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Rocket } from 'lucide-react';
import FlowBotButton from '@/components/FlowBotButton';

const channels = [
  { name: 'Meta Ads', desc: 'Facebook & Instagram Ads', icon: '📱', color: 'bg-blue-50 border-blue-200' },
  { name: 'Google Ads', desc: 'Search, Display & YouTube', icon: '🔍', color: 'bg-red-50 border-red-200' },
  { name: 'TikTok Ads', desc: 'TikTok for Business', icon: '🎵', color: 'bg-zinc-900 border-zinc-700 text-white' },
  { name: 'SEO', desc: 'Search Engine Optimization', icon: '📊', color: 'bg-emerald-50 border-emerald-200' },
  { name: 'GEO', desc: 'Generative Engine Optimization', icon: '🌐', color: 'bg-purple-50 border-purple-200' },
];

export default function PerformancePage() {
  return (
    <div className="space-y-8 animate-fade-in" data-testid="performance-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">Spectra Performance</h1>
          <p className="text-sm text-zinc-500 mt-1">Conecta tus campanas publicitarias y mide el rendimiento desde un solo lugar</p>
        </div>
        <FlowBotButton section="performance" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map(ch => (
          <Card key={ch.name} className={`${ch.color} rounded-xl border-2 hover:shadow-lg transition-all`}>
            <CardContent className="p-8 text-center space-y-4">
              <span className="text-4xl">{ch.icon}</span>
              <h2 className="text-xl font-heading font-semibold">{ch.name}</h2>
              <p className="text-sm opacity-70">{ch.desc}</p>
              <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
                <Rocket className="w-4 h-4" /> Muy Pronto
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-zinc-200 rounded-xl">
        <CardContent className="p-8 text-center space-y-3">
          <h3 className="text-lg font-heading font-medium text-zinc-900">Tablero Unificado de Performance</h3>
          <p className="text-sm text-zinc-500 max-w-lg mx-auto">Conecta tus cuentas de Meta, Google, TikTok y herramientas SEO para ver metricas de todas tus campanas en un solo dashboard. Compara rendimiento, optimiza presupuestos y toma decisiones basadas en datos reales.</p>
          <Badge className="bg-amber-50 text-amber-700 text-sm"><Rocket className="w-3.5 h-3.5 mr-1" /> Proximamente</Badge>
        </CardContent>
      </Card>
    </div>
  );
}
