import { useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, X } from 'lucide-react';

export default function FlowBotButton({ section }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [context, setContext] = useState(null);

  const askFlowBot = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/flow-bot', { section });
      setResponse(data.response);
      setContext(data.context);
    } catch {
      setResponse('No pude analizar los datos en este momento. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={askFlowBot}
        variant="outline"
        size="sm"
        data-testid="flow-bot-button"
        className="border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 gap-1.5 font-medium"
      >
        <Sparkles className="w-4 h-4" />
        Preguntar a Flow Bot
      </Button>

      {open && (
        <Card className="absolute right-0 top-12 w-[400px] z-50 shadow-xl border-blue-200 animate-fade-in" data-testid="flow-bot-panel">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h4 className="font-heading font-medium text-zinc-900 text-sm">Flow Bot - Analisis</h4>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-zinc-400 py-4"><Loader2 className="w-4 h-4 animate-spin" /> Analizando tus datos...</div>
            ) : (
              <div className="space-y-3">
                <div className="text-sm text-zinc-700 whitespace-pre-wrap leading-relaxed bg-zinc-50 rounded-lg p-3 border border-zinc-100">
                  {response}
                </div>
                {context && (
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(context).map(([key, val]) => (
                      <span key={key} className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-1 rounded-full">
                        {key.replace(/_/g, ' ')}: {val}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
