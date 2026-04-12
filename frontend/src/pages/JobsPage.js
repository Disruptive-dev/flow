import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSearchParams } from 'react-router-dom';
import api from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, Circle, Clock, Play, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

const statusColors = { pending: "bg-slate-100 text-slate-700", processing: "bg-amber-50 text-amber-700", completed: "bg-emerald-50 text-emerald-700", failed: "bg-red-50 text-red-700", in_progress: "bg-amber-50 text-amber-700" };
const stageLabels = { job_created: "Job Created", scraping: "Searching prospects...", prospects_found: "Prospects Found", ai_cleaning: "Cleaning & scoring with AI...", scoring_completed: "Scoring Completed", ready_for_review: "Leads Ready for Review" };
const stageLabelsEs = { job_created: "Trabajo Creado", scraping: "Buscando prospectos...", prospects_found: "Prospectos Encontrados", ai_cleaning: "Limpiando y calificando con IA...", scoring_completed: "Calificacion Completada", ready_for_review: "Leads Listos para Revision" };

export default function JobsPage() {
  const { t, lang } = useLanguage();
  const [searchParams] = useSearchParams();
  const selectedId = searchParams.get('id');
  const [jobs, setJobs] = useState([]);
  const [selectedJob, setSelectedJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get('/prospect-jobs').then(r => {
      setJobs(r.data);
      if (selectedId) {
        const found = r.data.find(j => j.id === selectedId);
        if (found) setSelectedJob(found);
      }
    }).catch(console.error).finally(() => setLoading(false));
  }, [selectedId]);

  const handleStart = async (jobId) => {
    setStarting(true);
    try {
      const { data } = await api.post(`/prospect-jobs/${jobId}/start`);
      // Animate stages one by one
      const stagesData = data.stages || [];
      const animatedJob = { ...data, stages: stagesData.map(s => ({ ...s, status: 'pending' })), status: 'processing', raw_count: 0, cleaned_count: 0, qualified_count: 0 };
      animatedJob.stages[0].status = 'completed';
      setSelectedJob({ ...animatedJob });

      for (let i = 1; i < stagesData.length; i++) {
        await new Promise(r => setTimeout(r, 1200));
        animatedJob.stages[i].status = 'completed';
        animatedJob.stages[i].timestamp = new Date().toISOString();
        if (i === 2) { animatedJob.raw_count = data.raw_count; animatedJob.status = 'processing'; }
        if (i === 3) { animatedJob.cleaned_count = data.cleaned_count; }
        if (i === 4) { animatedJob.qualified_count = data.qualified_count; animatedJob.rejected_count = data.rejected_count; }
        if (i === 5) { animatedJob.status = 'completed'; }
        setSelectedJob({ ...animatedJob });
      }

      setJobs(prev => prev.map(j => j.id === jobId ? data : j));
      toast.success(`${data.qualified_count} leads calificados listos para revision!`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start job');
    } finally {
      setStarting(false);
    }
  };

  const labels = lang === 'es' ? stageLabelsEs : stageLabels;

  if (selectedJob) {
    const completedStages = selectedJob.stages?.filter(s => s.status === 'completed').length || 0;
    const totalStages = selectedJob.stages?.length || 6;
    const progress = (completedStages / totalStages) * 100;

    return (
      <div className="space-y-6 animate-fade-in max-w-3xl" data-testid="job-detail-page">
        <button onClick={() => setSelectedJob(null)} className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors" data-testid="job-back-button">
          <ArrowLeft className="w-4 h-4" /> Back to {t('jobs')}
        </button>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-heading font-semibold text-zinc-900 tracking-tight">{selectedJob.category} - {selectedJob.city}</h1>
            <p className="text-sm text-zinc-500 mt-1">{selectedJob.province} &middot; {selectedJob.quantity} requested</p>
          </div>
          <Badge className={statusColors[selectedJob.status] || statusColors.pending}>{selectedJob.status}</Badge>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { label: 'Raw Found', value: selectedJob.raw_count },
            { label: 'Cleaned', value: selectedJob.cleaned_count },
            { label: 'Qualified', value: selectedJob.qualified_count },
            { label: 'Rejected', value: selectedJob.rejected_count },
            { label: 'Approved', value: selectedJob.approved_count },
          ].map(({ label, value }) => (
            <Card key={label} className="border-zinc-200 rounded-xl">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-heading font-semibold text-zinc-900">{value}</p>
                <p className="text-xs text-zinc-500 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Progress Bar */}
        <Card className="border-zinc-200 rounded-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-heading font-medium text-zinc-900">{t('job_progress')}</h3>
              <span className="text-sm text-zinc-500">{completedStages}/{totalStages}</span>
            </div>
            <Progress value={progress} className="h-2 mb-6" />

            {/* Timeline */}
            <div className="space-y-4">
              {(selectedJob.stages || []).map((stage, i) => (
                <div key={i} className="flex items-start gap-4" data-testid={`job-stage-${i}`}>
                  <div className="flex flex-col items-center">
                    {stage.status === 'completed' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    ) : stage.status === 'in_progress' ? (
                      <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                    ) : (
                      <Circle className="w-5 h-5 text-zinc-300" />
                    )}
                    {i < (selectedJob.stages?.length || 0) - 1 && (
                      <div className={`w-px h-6 mt-1 ${stage.status === 'completed' ? 'bg-emerald-300' : 'bg-zinc-200'}`} />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${stage.status === 'completed' ? 'text-zinc-900' : 'text-zinc-400'}`}>
                      {labels[stage.name] || stage.name}
                    </p>
                    {stage.timestamp && <p className="text-xs text-zinc-400 mt-0.5">{new Date(stage.timestamp).toLocaleString()}</p>}
                  </div>
                </div>
              ))}
            </div>

            {selectedJob.status === 'pending' && (
              <Button onClick={() => handleStart(selectedJob.id)} disabled={starting} className="mt-6 bg-blue-600 hover:bg-blue-700 text-white" data-testid="start-job-button">
                {starting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {t('start_job')}
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in" data-testid="jobs-list-page">
      <h1 className="text-3xl font-heading font-semibold text-zinc-900 tracking-tight">{t('jobs')}</h1>
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job, i) => (
            <Card key={job.id} className="border-zinc-200 rounded-xl hover:border-zinc-300 transition-all cursor-pointer" onClick={() => setSelectedJob(job)} data-testid={`job-item-${i}`}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col items-center justify-center w-10 h-10 rounded-lg bg-zinc-100">
                    <Clock className="w-4 h-4 text-zinc-500" />
                  </div>
                  <div>
                    <p className="font-medium text-zinc-900 text-sm">{job.category} - {job.city}, {job.province}</p>
                    <p className="text-xs text-zinc-500 mt-0.5">{job.quantity} requested &middot; {job.qualified_count} qualified &middot; {job.approved_count} approved</p>
                  </div>
                </div>
                <Badge className={statusColors[job.status] || statusColors.pending}>{job.status}</Badge>
              </CardContent>
            </Card>
          ))}
          {!jobs.length && <p className="text-sm text-zinc-400">No prospecting jobs yet.</p>}
        </div>
      )}
    </div>
  );
}
