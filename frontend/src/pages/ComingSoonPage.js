import { Card, CardContent } from '@/components/ui/card';
import { Rocket, DollarSign, FolderKanban, Heart } from 'lucide-react';

const PRESETS = {
  finance: {
    icon: DollarSign,
    title: 'Spectra Finance',
    subtitle: 'Control financiero, rentabilidad, caja y punto de equilibrio dentro de Spectra Flow.',
    bullets: [
      'Ingresos, gastos, costos y proveedores',
      'Cuentas por cobrar y pagar con semaforos visuales',
      'Flujo de caja proyectado a 7, 15 y 30 dias',
      'Punto de equilibrio y rentabilidad por unidad de negocio',
      'Reportes ejecutivos y exportacion CSV/Excel/PDF',
    ],
    color: 'emerald',
  },
  project_management: {
    icon: FolderKanban,
    title: 'Spectra Project Management',
    subtitle: 'Gestion de proyectos, tableros, tareas, responsables y entregables dentro del ecosistema Spectra Flow.',
    bullets: [
      'Tableros Kanban por proyecto',
      'Asignacion de tareas y responsables',
      'Seguimiento de fechas de entrega',
      'Integracion con Spectra Finance para tracking de costos',
      'Reportes de productividad y carga de equipo',
    ],
    color: 'blue',
  },
  fidelity: {
    icon: Heart,
    title: 'Spectra Fidelity',
    subtitle: 'Fidelizacion de clientes, beneficios, segmentos, retencion y seguimiento de relaciones comerciales.',
    bullets: [
      'Sistema de puntos y recompensas',
      'Segmentacion automatica de clientes',
      'Campanas de retencion personalizadas',
      'NPS y encuestas de satisfaccion',
      'Programas de referidos',
    ],
    color: 'pink',
  },
};

const COLORS = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-500' },
  pink: { bg: 'bg-pink-50', text: 'text-pink-600', border: 'border-pink-200', dot: 'bg-pink-500' },
};

export default function ComingSoonPage({ preset = 'finance' }) {
  const cfg = PRESETS[preset] || PRESETS.finance;
  const Icon = cfg.icon;
  const c = COLORS[cfg.color];
  return (
    <div className="flex items-center justify-center min-h-[70vh] py-8" data-testid={`coming-soon-${preset}`}>
      <Card className={`border-2 ${c.border} rounded-2xl max-w-2xl w-full shadow-sm`}>
        <CardContent className="p-8 sm:p-12 text-center space-y-6">
          <div className={`w-20 h-20 mx-auto rounded-2xl ${c.bg} flex items-center justify-center`}>
            <Icon className={`w-10 h-10 ${c.text}`} />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl sm:text-4xl font-heading font-semibold text-zinc-900">{cfg.title}</h1>
            <p className="text-sm sm:text-base text-zinc-500 max-w-lg mx-auto">{cfg.subtitle}</p>
          </div>
          <div className={`text-left bg-zinc-50 border ${c.border} rounded-xl p-5 space-y-2.5 max-w-md mx-auto`}>
            <p className="text-xs font-semibold text-zinc-700 uppercase tracking-wide mb-2">Que vas a poder hacer</p>
            {cfg.bullets.map((b, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-zinc-700">
                <span className={`w-1.5 h-1.5 rounded-full ${c.dot} mt-1.5 shrink-0`} />
                <span>{b}</span>
              </div>
            ))}
          </div>
          <div className={`inline-flex items-center gap-2 ${c.bg} ${c.text} px-5 py-2.5 rounded-full text-sm font-medium`}>
            <Rocket className="w-4 h-4" /> Este modulo estara disponible proximamente
          </div>
          <p className="text-xs text-zinc-400">Tu administrador puede activarlo desde Configuracion {'>'} Modulos cuando este listo.</p>
        </CardContent>
      </Card>
    </div>
  );
}
