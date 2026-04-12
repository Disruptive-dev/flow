import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { HelpCircle, ArrowRight } from 'lucide-react';

const statusFlow = [
  { key: 'raw', label: 'Sin procesar', color: 'bg-slate-100 text-slate-700', desc: 'Lead recien encontrado por el scraper, sin limpiar.' },
  { key: 'cleaned', label: 'Limpiado', color: 'bg-blue-50 text-blue-700', desc: 'Datos del lead verificados y normalizados.' },
  { key: 'scored', label: 'Calificado', color: 'bg-indigo-50 text-indigo-700', desc: 'La IA asigno un puntaje de calidad (0-100).' },
  { key: 'approved', label: 'Aprobado', color: 'bg-emerald-50 text-emerald-700', desc: 'Revisado y aprobado para contactar. Listo para secuencia de email.' },
  { key: 'rejected', label: 'Rechazado', color: 'bg-red-50 text-red-700', desc: 'No cumple criterios. Se puede reactivar mas adelante.' },
  { key: 'queued_for_sequence', label: 'En secuencia', color: 'bg-purple-50 text-purple-700', desc: 'Agregado a una secuencia automatica de emails.' },
  { key: 'contacted', label: 'Contactado', color: 'bg-amber-50 text-amber-700', desc: 'Se envio el primer email de contacto.' },
  { key: 'opened', label: 'Email abierto', color: 'bg-teal-50 text-teal-700', desc: 'El prospecto abrio el email.' },
  { key: 'replied', label: 'Respondio', color: 'bg-green-50 text-green-700', desc: 'El prospecto respondio al email.' },
  { key: 'interested', label: 'Interesado', color: 'bg-orange-50 text-orange-700', desc: 'Mostro interes concreto en el servicio/producto.' },
  { key: 'sent_to_crm', label: 'Enviado al CRM', color: 'bg-blue-100 text-blue-800', desc: 'Lead transferido al CRM como contacto para seguimiento comercial.' },
  { key: 'opportunity', label: 'Oportunidad', color: 'bg-fuchsia-50 text-fuchsia-700', desc: 'Se creo una oportunidad de venta en el CRM.' },
  { key: 'closed_won', label: 'Cerrado ganado', color: 'bg-emerald-100 text-emerald-800', desc: 'Se cerro la venta exitosamente.' },
  { key: 'closed_lost', label: 'Cerrado perdido', color: 'bg-slate-200 text-slate-800', desc: 'La oportunidad no se concreto.' },
];

export default function LeadStatusGuide() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-600" data-testid="lead-status-guide-btn">
          <HelpCircle className="w-4 h-4 mr-1" /> Estados
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Ciclo de Vida del Lead</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-zinc-500 mb-4">Cada lead pasa por estas etapas desde que se encuentra hasta que se cierra la venta.</p>
        <div className="space-y-2">
          {statusFlow.map((s, i) => (
            <div key={s.key}>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-zinc-50">
                <Badge className={`${s.color} text-[10px] flex-shrink-0 mt-0.5`}>{s.label}</Badge>
                <p className="text-xs text-zinc-600 leading-relaxed">{s.desc}</p>
              </div>
              {i < statusFlow.length - 1 && (
                <div className="flex justify-center py-0.5">
                  <ArrowRight className="w-3 h-3 text-zinc-300 rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-100">
          <p className="text-xs text-blue-700"><strong>Aprobado vs Enviado al CRM:</strong> Un lead "Aprobado" fue revisado y esta listo para contactar via email. "Enviado al CRM" significa que ya se creo como contacto en Spectra CRM para seguimiento comercial directo.</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
