import { useState, useRef, useEffect } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Sparkles, X, Send } from 'lucide-react';

export default function FlowBotButton({ section }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [context, setContext] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  // Scroll only inside the messages container (no page scroll jump)
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  // Lock background scroll while modal is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const initialAnalysis = async () => {
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
    // Keep focus on input so keyboard stays open on mobile, no scroll jump
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  return (
    <>
      <Button
        onClick={initialAnalysis}
        variant="outline"
        size="sm"
        data-testid="flow-bot-button"
        className="gap-1.5 font-medium border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
      >
        <Sparkles className="w-4 h-4" />
        Flow IA
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-black/40 backdrop-blur-sm animate-fade-in"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
          data-testid="flow-bot-modal"
        >
          <div className="bg-white dark:bg-zinc-900 w-full max-w-[640px] h-[90dvh] sm:h-[min(85dvh,700px)] rounded-xl shadow-2xl border border-blue-200 dark:border-blue-900/40 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md shadow-blue-500/30">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="font-heading font-semibold text-zinc-900 dark:text-white text-sm">Flow IA</h4>
                  <p className="text-[10px] text-zinc-500">Análisis interactivo de tus datos</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-700 dark:hover:text-white p-1 rounded hover:bg-white/50 dark:hover:bg-zinc-800" data-testid="flow-bot-close">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain" style={{ WebkitOverflowScrolling: 'touch' }}>
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-100 rounded-bl-sm'
                  }`}>
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-100 dark:bg-zinc-800 px-4 py-2.5 rounded-2xl rounded-bl-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Context chips */}
            {context && (
              <div className="px-4 py-2 flex flex-wrap gap-1.5 border-t border-zinc-100 dark:border-zinc-800 shrink-0">
                {Object.entries(context).filter(([, v]) => typeof v === 'number' || typeof v === 'string').slice(0, 6).map(([key, val]) => (
                  <span key={key} className="text-[9px] bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-full">{key.replace(/_/g, ' ')}: {val}</span>
                ))}
              </div>
            )}

            {/* Input */}
            <form onSubmit={sendMessage} className="p-3 border-t border-zinc-200 dark:border-zinc-800 flex gap-2 shrink-0 bg-white dark:bg-zinc-900">
              <Input
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Pregunta algo sobre tus datos..."
                className="flex-1 text-sm h-10"
                data-testid="flow-bot-input"
              />
              <Button type="submit" size="sm" disabled={loading || !input.trim()} className="bg-blue-600 hover:bg-blue-700 text-white h-10 w-10 p-0 shrink-0" data-testid="flow-bot-send">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
