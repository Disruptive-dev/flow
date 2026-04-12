import { ArrowRight, Lightbulb, X } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const guides = {
  prospect_finder: {
    text: "Una vez que termines la busqueda, ve a Flow IA para ver el progreso y clasificar los leads con IA.",
    action: "/jobs",
    actionLabel: "Ir a Flow IA",
    color: "bg-blue-50 border-blue-200 text-blue-800",
  },
  flow_ia: {
    text: "Cuando los leads esten procesados y calificados, revisalos en Leads y luego crea campanas de Email Marketing.",
    action: "/leads",
    actionLabel: "Ir a Leads",
    color: "bg-indigo-50 border-indigo-200 text-indigo-800",
  },
  leads: {
    text: "Aprueba los mejores leads y envialos al CRM para gestionar oportunidades. Los rechazados no se pierden.",
    action: "/crm",
    actionLabel: "Ir al CRM",
    color: "bg-emerald-50 border-emerald-200 text-emerald-800",
  },
  email_marketing: {
    text: "Crea campanas y automatizaciones para contactar leads aprobados. Usa plantillas con Flow IA Neuro.",
    action: "/templates",
    actionLabel: "Ir a Plantillas",
    color: "bg-purple-50 border-purple-200 text-purple-800",
  },
  crm: {
    text: "Gestiona oportunidades arrastrando cards entre etapas. Cada contacto viene de leads aprobados o importados.",
    action: null,
    actionLabel: null,
    color: "bg-amber-50 border-amber-200 text-amber-800",
  },
};

export default function GuideBanner({ section }) {
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('spectra_dismissed_guides') || '{}'); } catch { return {}; }
  });
  const navigate = useNavigate();
  const guide = guides[section];
  if (!guide || dismissed[section]) return null;

  const dismiss = () => {
    const updated = { ...dismissed, [section]: true };
    setDismissed(updated);
    localStorage.setItem('spectra_dismissed_guides', JSON.stringify(updated));
  };

  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${guide.color} animate-fade-in`} data-testid={`guide-banner-${section}`}>
      <Lightbulb className="w-4 h-4 flex-shrink-0 opacity-70" />
      <p className="text-sm flex-1">{guide.text}</p>
      {guide.action && (
        <button onClick={() => navigate(guide.action)} className="text-xs font-medium flex items-center gap-1 hover:underline flex-shrink-0">
          {guide.actionLabel} <ArrowRight className="w-3 h-3" />
        </button>
      )}
      <button onClick={dismiss} className="opacity-50 hover:opacity-100 flex-shrink-0"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}
