import { Card, CardContent } from '@/components/ui/card';
import { Globe, Rocket } from 'lucide-react';

export default function LandingPagesPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]" data-testid="landing-pages-page">
      <Card className="border-zinc-200 rounded-xl max-w-md">
        <CardContent className="p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-blue-50 flex items-center justify-center">
            <Globe className="w-8 h-8 text-blue-600" />
          </div>
          <h2 className="text-2xl font-heading font-semibold text-zinc-900">Landing Pages</h2>
          <p className="text-sm text-zinc-500">Crea paginas de aterrizaje optimizadas para capturar leads directamente desde tus campanas.</p>
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
            <Rocket className="w-4 h-4" /> Muy Pronto
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
