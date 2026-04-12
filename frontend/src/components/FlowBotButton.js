import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, X, Send, ChevronDown, ChevronUp } from 'lucide-react';

export default function FlowBotButton({ section }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const initialAnalysis = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    if (messages.length > 0) return;
    setLoading(true);
    try {
      const { data } = await api.post('/ai/flow-bot', { section });
      setMessages([{ role: 'bot', text: data.response }]);
      setContext(data.context);
    } catch {
      setMessages([{ role: 'bot', text: 'No pude analizar los datos en este momento.' }]);
    }
    setLoading(false);
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);
    try {
      const { data } = await api.post('/ai/flow-bot', { section, question: userMsg });
      setMessages(prev => [...prev, { role: 'bot', text: data.response }]);
      if (data.context) setContext(data.context);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Error al procesar tu pregunta.' }]);
    }
    setLoading(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={initialAnalysis}
        variant="outline"
        size="sm"
        data-testid="flow-bot-button"
        className={`gap-1.5 font-medium transition-all ${open ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
      >
        <Sparkles className="w-4 h-4" />
        Flow IA
        {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </Button>

      {open && (
        <Card className="absolute right-0 top-12 w-[420px] z-50 shadow-2xl border-blue-200 animate-fade-in" data-testid="flow-bot-panel">
          <CardContent className="p-0">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50 rounded-t-xl">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <h4 className="font-heading font-medium text-zinc-900 text-sm">Flow IA - Analisis Interactivo</h4>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-4 h-4" /></button>
            </div>

            <div className="max-h-[320px] overflow-y-auto p-4 space-y-3">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[90%] px-3 py-2 rounded-xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-zinc-100 text-zinc-800 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 px-4 py-2.5 rounded-xl rounded-bl-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {context && (
              <div className="px-4 pb-2 flex flex-wrap gap-1.5">
                {Object.entries(context).map(([key, val]) => (
                  <span key={key} className="text-[9px] bg-zinc-100 text-zinc-500 px-1.5 py-0.5 rounded-full">{key.replace(/_/g, ' ')}: {val}</span>
                ))}
              </div>
            )}

            <form onSubmit={sendMessage} className="p-3 border-t border-zinc-200 flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pregunta algo sobre tus datos..."
                className="flex-1 text-sm h-9"
                data-testid="flow-bot-input"
              />
              <Button type="submit" size="sm" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white h-9 w-9 p-0">
                <Send className="w-3.5 h-3.5" />
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
