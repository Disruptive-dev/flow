import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Search, MapPin, Loader2, Globe, Building2, Linkedin, Users, Briefcase } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import FlowBotButton from '@/components/FlowBotButton';
import GuideBanner from '@/components/GuideBanner';

import { useAuth } from '@/contexts/AuthContext';

const defaultCountries = [
  { code: "AR", name: "Argentina" }, { code: "CL", name: "Chile" }, { code: "UY", name: "Uruguay" },
  { code: "PY", name: "Paraguay" }, { code: "BR", name: "Brasil" }, { code: "CO", name: "Colombia" },
  { code: "MX", name: "Mexico" }, { code: "PE", name: "Peru" }, { code: "EC", name: "Ecuador" },
  { code: "US", name: "Estados Unidos" }, { code: "ES", name: "Espana" },
];

const provincesByCountry = {
  "Argentina": ["Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Cordoba", "Corrientes", "Entre Rios", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza", "Misiones", "Neuquen", "Rio Negro", "Salta", "San Juan", "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucuman"],
};

const defaultCategories = [
  "Inmobiliarias", "Tecnologia", "Gastronomia", "Legal / Abogados", "Salud / Medicina",
  "Educacion", "Seguros", "Consultoria", "Construccion", "Logistica / Transporte",
  "Finanzas", "Turismo", "Agricultura / Campo", "Retail / Comercio", "Manufactura / Industria",
  "Marketing / Publicidad", "Automotriz", "Energia", "Telecomunicaciones", "Arte / Diseno"
];

const linkedinIndustries = [
  "Tecnologia", "Marketing / Publicidad", "Finanzas / Banca", "Consultoria", "Legal",
  "Salud / Farmaceutica", "Educacion", "Inmobiliaria", "Energia", "Telecomunicaciones",
  "Manufactura", "Retail / E-commerce", "Logistica / Transporte", "Seguros",
  "Construccion / Ingenieria", "Turismo / Hospitalidad", "Agricultura",
  "Medios / Entretenimiento", "ONG / Social", "SaaS / Software"
];

const statusColors = {
  pending: "bg-slate-100 text-slate-700", processing: "bg-amber-50 text-amber-700",
  completed: "bg-emerald-50 text-emerald-700", failed: "bg-red-50 text-red-700",
};

export default function ProspectFinderPage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState('b2b');

  // B2B form
  const [form, setForm] = useState({ country: 'Argentina', province: '', city: '', category: '', quantity: 100, postal_code: '' });
  const [creating, setCreating] = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [showCustomCategory, setShowCustomCategory] = useState(false);

  // LinkedIn form
  const [liForm, setLiForm] = useState({ keyword: '', job_title: '', industry: '', location: '', company_size: '', quantity: 50 });
  const [liCreating, setLiCreating] = useState(false);

  const [jobs, setJobs] = useState([]);

  const provinces = provincesByCountry[form.country] || [];

  useEffect(() => {
    api.get('/prospect-jobs').then(r => setJobs(r.data)).catch(console.error);
  }, []);

  const handleCreateB2B = async (e) => {
    e.preventDefault();
    const cat = showCustomCategory ? customCategory : form.category;
    if (!form.province || !form.city || !cat) {
      toast.error('Completa todos los campos obligatorios');
      return;
    }
    setCreating(true);
    try {
      const { data } = await api.post('/prospect-jobs', { ...form, category: cat, source: 'google_maps' });
      toast.success(`Flow IA iniciado: ${cat} en ${form.city}, ${form.province}`);
      navigate(`/jobs?id=${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear');
    } finally {
      setCreating(false);
    }
  };

  const handleCreateLinkedIn = async (e) => {
    e.preventDefault();
    if (!liForm.keyword && !liForm.job_title) {
      toast.error('Ingresa al menos un keyword o cargo');
      return;
    }
    setLiCreating(true);
    try {
      const { data } = await api.post('/prospect-jobs', {
        category: liForm.industry || liForm.keyword || liForm.job_title,
        city: liForm.location,
        province: liForm.location,
        country: '',
        quantity: liForm.quantity,
        source: 'linkedin',
        linkedin_params: {
          keyword: liForm.keyword,
          job_title: liForm.job_title,
          industry: liForm.industry,
          location: liForm.location,
          company_size: liForm.company_size,
        }
      });
      toast.success(`Busqueda LinkedIn iniciada: ${liForm.keyword || liForm.job_title}`);
      navigate(`/jobs?id=${data.id}`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error al crear');
    } finally {
      setLiCreating(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="prospect-finder-page">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('prospect_finder')}</h1>
        <FlowBotButton section="prospeccion" />
      </div>

      <GuideBanner section="prospect_finder" />

      {/* Two Source Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-100 p-1 h-auto">
          <TabsTrigger value="b2b" className="gap-2 py-2.5 px-5 data-[state=active]:bg-white" data-testid="tab-b2b">
            <Building2 className="w-4 h-4" />
            <div className="text-left">
              <p className="text-sm font-medium">B2B - Google Maps</p>
              <p className="text-[10px] text-zinc-400 font-normal">Negocios locales por ubicacion</p>
            </div>
          </TabsTrigger>
          <TabsTrigger value="linkedin" className="gap-2 py-2.5 px-5 data-[state=active]:bg-white" data-testid="tab-linkedin">
            <Linkedin className="w-4 h-4" />
            <div className="text-left">
              <p className="text-sm font-medium">LinkedIn</p>
              <p className="text-[10px] text-zinc-400 font-normal">Empresas y profesionales</p>
            </div>
          </TabsTrigger>
        </TabsList>

        {/* B2B TAB */}
        <TabsContent value="b2b">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-heading font-medium text-zinc-900">Prospeccion B2B - Google Maps</h3>
                  <p className="text-xs text-zinc-500">{isSuperAdmin ? 'Busca negocios reales por ubicacion, categoria e industria via Outscraper' : 'Busca negocios reales por ubicacion, categoria e industria'}</p>
                </div>
              </div>
              <form onSubmit={handleCreateB2B}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-1.5"><Globe className="w-3.5 h-3.5" /> Pais</Label>
                    <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v, province: '' }))}>
                      <SelectTrigger data-testid="country-select" className="h-11"><SelectValue placeholder="Seleccionar pais" /></SelectTrigger>
                      <SelectContent>{defaultCountries.map(c => <SelectItem key={c.code} value={c.name}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('province')}</Label>
                    {provinces.length > 0 ? (
                      <Select value={form.province} onValueChange={v => setForm(f => ({ ...f, province: v }))}>
                        <SelectTrigger data-testid="province-select" className="h-11"><SelectValue placeholder="Seleccionar provincia" /></SelectTrigger>
                        <SelectContent>{provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                      </Select>
                    ) : (
                      <Input data-testid="province-input" value={form.province} onChange={e => setForm(f => ({ ...f, province: e.target.value }))} placeholder="Ingrese provincia/estado" className="h-11" />
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('city')}</Label>
                    <Input data-testid="city-input" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="San Miguel de Tucuman" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 flex items-center justify-between">
                      <span>{t('category')}</span>
                      <button type="button" onClick={() => setShowCustomCategory(!showCustomCategory)} className="text-xs text-blue-600 hover:text-blue-700">
                        {showCustomCategory ? 'Elegir de lista' : '+ Personalizada'}
                      </button>
                    </Label>
                    {showCustomCategory ? (
                      <Input data-testid="custom-category-input" value={customCategory} onChange={e => setCustomCategory(e.target.value)} placeholder="Escribi la industria..." className="h-11" />
                    ) : (
                      <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                        <SelectTrigger data-testid="category-select" className="h-11"><SelectValue placeholder="Seleccionar industria" /></SelectTrigger>
                        <SelectContent>{defaultCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                      </Select>
                    )}
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 block">{t('quantity')}</Label>
                    <Input data-testid="quantity-input" type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 100 }))} className="h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 block">Codigo Postal (opcional)</Label>
                    <Input data-testid="postal-code-input" value={form.postal_code} onChange={e => setForm(f => ({ ...f, postal_code: e.target.value }))} placeholder="4000" className="h-11" />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button type="submit" data-testid="search-prospects-button" disabled={creating} className="bg-blue-600 hover:bg-blue-700 text-white h-11 px-8">
                    {creating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    {t('search_prospects')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LINKEDIN TAB */}
        <TabsContent value="linkedin">
          <Card className="border-zinc-200 rounded-xl">
            <CardContent className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-sky-50 flex items-center justify-center">
                  <Linkedin className="w-5 h-5 text-sky-600" />
                </div>
                <div>
                  <h3 className="font-heading font-medium text-zinc-900">Prospeccion LinkedIn</h3>
                  <p className="text-xs text-zinc-500">Busca empresas y profesionales en LinkedIn</p>
                </div>
              </div>
              <form onSubmit={handleCreateLinkedIn}>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5" /> Keyword de busqueda
                    </Label>
                    <Input data-testid="li-keyword" value={liForm.keyword} onChange={e => setLiForm(f => ({ ...f, keyword: e.target.value }))} placeholder="ej: agencia marketing, software factory" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-1.5">
                      <Briefcase className="w-3.5 h-3.5" /> Cargo / Titulo
                    </Label>
                    <Input data-testid="li-job-title" value={liForm.job_title} onChange={e => setLiForm(f => ({ ...f, job_title: e.target.value }))} placeholder="ej: Director Comercial, CEO, CTO" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 block">Industria</Label>
                    <Select value={liForm.industry} onValueChange={v => setLiForm(f => ({ ...f, industry: v }))}>
                      <SelectTrigger data-testid="li-industry" className="h-11"><SelectValue placeholder="Seleccionar industria" /></SelectTrigger>
                      <SelectContent>{linkedinIndustries.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Ubicacion
                    </Label>
                    <Input data-testid="li-location" value={liForm.location} onChange={e => setLiForm(f => ({ ...f, location: e.target.value }))} placeholder="ej: Argentina, Buenos Aires, LATAM" className="h-11" />
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" /> Tamano empresa
                    </Label>
                    <Select value={liForm.company_size || 'any'} onValueChange={v => setLiForm(f => ({ ...f, company_size: v === 'any' ? '' : v }))}>
                      <SelectTrigger data-testid="li-company-size" className="h-11"><SelectValue placeholder="Cualquier tamano" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Cualquier tamano</SelectItem>
                        <SelectItem value="1-10">1-10 empleados</SelectItem>
                        <SelectItem value="11-50">11-50 empleados</SelectItem>
                        <SelectItem value="51-200">51-200 empleados</SelectItem>
                        <SelectItem value="201-500">201-500 empleados</SelectItem>
                        <SelectItem value="501+">501+ empleados</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-zinc-700 mb-2 block">Cantidad</Label>
                    <Input data-testid="li-quantity" type="number" value={liForm.quantity} onChange={e => setLiForm(f => ({ ...f, quantity: parseInt(e.target.value) || 50 }))} className="h-11" />
                  </div>
                </div>
                <div className="flex justify-end mt-6">
                  <Button type="submit" data-testid="search-linkedin-button" disabled={liCreating} className="bg-sky-600 hover:bg-sky-700 text-white h-11 px-8">
                    {liCreating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Linkedin className="w-4 h-4 mr-2" />}
                    Buscar en LinkedIn
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recent Jobs */}
      <div>
        <h2 className="text-lg font-heading font-medium text-zinc-900 mb-4">{t('recent_jobs')}</h2>
        <div className="space-y-3">
          {jobs.slice(0, 5).map((job, i) => (
            <Card key={job.id} className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-all cursor-pointer" onClick={() => navigate(`/jobs?id=${job.id}`)} data-testid={`recent-job-${i}`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${job.source === 'linkedin' ? 'bg-sky-50' : 'bg-zinc-100'}`}>
                    {job.source === 'linkedin' ? <Linkedin className="w-4 h-4 text-sky-600" /> : <MapPin className="w-4 h-4 text-zinc-500" />}
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 text-sm">
                      {job.category} {job.city ? `- ${job.city}` : ''}{job.province ? `, ${job.province}` : ''}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {job.source === 'linkedin' ? 'LinkedIn' : 'Google Maps'} &middot; {job.quantity} solicitados &middot; {job.raw_count} encontrados &middot; <span className="text-emerald-600 font-medium">{job.qualified_count} calificados</span>
                    </p>
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
