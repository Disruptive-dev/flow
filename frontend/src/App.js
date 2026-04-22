import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { DemoProvider } from '@/contexts/DemoContext';
import { Toaster } from '@/components/ui/sonner';
import AppLayout from '@/components/layout/AppLayout';
import HelpBot from '@/components/HelpBot';
import LoginPage from '@/pages/LoginPage';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import DashboardPage from '@/pages/DashboardPage';
import ProspectFinderPage from '@/pages/ProspectFinderPage';
import JobsPage from '@/pages/JobsPage';
import LeadsPage from '@/pages/LeadsPage';
import CampaignsPage from '@/pages/CampaignsPage';
import TemplatesPage from '@/pages/TemplatesPage';
import DomainsPage from '@/pages/DomainsPage';
import CrmPage from '@/pages/CrmSyncPage';
import AnalyticsPage from '@/pages/AnalyticsPage';
import SettingsPage from '@/pages/SettingsPage';
import EmailMarketingPage from '@/pages/EmailMarketingPage';
import TenantAdminPage from '@/pages/TenantAdminPage';
import LandingPagesPage from '@/pages/LandingPagesPage';
import FormsPage from '@/pages/FormsPage';
import PerformancePage from '@/pages/PerformancePage';
import { Loader2 } from 'lucide-react';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50">
      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
    </div>
  );

  return (
    <>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/prospect-finder" element={<ProspectFinderPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/leads" element={<LeadsPage />} />
          <Route path="/campaigns" element={<CampaignsPage />} />
          <Route path="/templates" element={<TemplatesPage />} />
          <Route path="/domains" element={<DomainsPage />} />
          <Route path="/crm-sync" element={<CrmPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/email-marketing" element={<EmailMarketingPage />} />
          <Route path="/admin/tenants" element={<TenantAdminPage />} />
          <Route path="/landing-pages" element={<LandingPagesPage />} />
          <Route path="/forms" element={<FormsPage />} />
          <Route path="/performance" element={<PerformancePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {user && <HelpBot />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <LanguageProvider>
        <AuthProvider>
          <DemoProvider>
            <AppRoutes />
            <Toaster position="top-right" richColors />
          </DemoProvider>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}
