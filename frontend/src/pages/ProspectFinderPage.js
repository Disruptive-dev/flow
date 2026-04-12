import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, MapPin, Building2, Hash, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

const provinces = ["Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Cordoba", "Corrientes", "Entre Rios", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquen", "Rio Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucuman"];
const categories = ["Real Estate", "Technology", "Gastronomia", "Legal", "Health", "Education", "Insurance", "Consulting", "Construction", "Logistics", "Finance", "Tourism", "Agriculture", "Retail", "Manufacturing"];

const statusColors = {
  pending: "bg-slate-100 text-slate-700",
  processing: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700",
  failed: "bg-red-50 text-red-700",
};

export default function ProspectFinderPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [form, setForm] = useState({ province: '', city: '', category: '', quantity: 100 });
  const [creating, setCreating] = useState(false);
  const [jobs, setJobs] = useState([]);

  useEffect(() => {
    api.get('/prospect-jobs').then(r => setJobs(r.data)).catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.province || !form.city || !form.category) {
      toast.error('Please fill all required fields');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/prospect-jobs', form);
      toast.success(`Job created! Searching in ${form.city}, ${form.province}...`);
      navigate(`/jobs?id=${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="prospect-finder-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('prospect_finder')}</h1>

      <Card className="border-zinc-200 rounded-xl">
        <CardContent className="p-8">
          <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('province')}</Label>
              <Select value={form.province} onValueChange={v => setForm(f => ({ ...f, province: v }))}>
                <SelectTrigger data-testid="province-select" className="h-11"><SelectValue placeholder="Select province" /></SelectTrigger>
                <SelectContent>
                  {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('city')}</Label>
              <Input data-testid="city-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="San Miguel de Tucuman" className="h-11" />
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('category')}</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger data-testid="category-select" className="h-11"><SelectValue placeholder="Select industry" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('quantity')}</Label>
              <Input data-testid="quantity-input" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 100 }))} className="h-11" />
            </div>

            <div className="md:col-span-2 lg:col-span-4 flex justify-end">
              <Button type="submit" data-testid="search-prospects-button" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8">
                {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                {t('search_prospects')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Recent Jobs */}
      <div>
        <h2 className="text-lg font-heading font-medium text-zinc-900 mb-4">{t('recent_jobs')}</h2>
        <div className="space-y-3">
          {jobs.slice(0, 5).map((job, i) => (
            <Card
              key={job.id}
              className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-all cursor-pointer"
              onClick={() => navigate(`/jobs?id=${job.id}`)}
              data-testid={`recent-job-${i}`}
            >
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-zinc-100 flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 text-sm">{job.category} - {job.city}, {job.province}</p>
                    <p className="text-xs text-zinc-500">{job.quantity} solicitados &middot; {job.raw_count} encontrados &middot; <span className="text-emerald-600 font-medium">{job.qualified_count} calificados</span></p>
                  </div>
                </div>
                <Badge className={statusColors[job.status] || statusColors.pending}>{job.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!jobs.length && <p className="text-sm text-zinc-400">No hay trabajos todavia. Inicia tu primera busqueda arriba.</p>}
        </div>
      </div>
    </div>
  );
}
