import { Card, CardContent } from '@/components/ui/card';
import { FileText, Rocket } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function FormsPage() {
  const { t } = useLanguage();
  return (
    <div className="flex items-center justify-center min-h-[60vh]" data-testid="forms-page">
      <Card className="border-zinc-200 rounded-xl max-w-md">
        <CardContent className="p-12 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-purple-50 flex items-center justify-center">
            <FileText className="w-8 h-8 text-purple-600" />
          </div>
          <h2 className="text-2xl font-heading font-semibold text-zinc-900">Formularios</h2>
          <p className="text-sm text-zinc-500">Crea formularios de captura embebibles en tu sitio web para generar leads automaticamente.</p>
          <div className="inline-flex items-center gap-2 bg-amber-50 text-amber-700 px-4 py-2 rounded-full text-sm font-medium">
            <Rocket className="w-4 h-4" /> {t('coming_soon')}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
