import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CommercialProvider } from "@/contexts/CommercialContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import ComercialDashboards from "./pages/comercial/Dashboards";
import ComercialPipeline from "./pages/comercial/Pipeline";
import ComercialPipelinePlanilha from "./pages/comercial/PipelinePlanilha";
import ComercialMetas from "./pages/comercial/Metas";
import ComercialRelatorios from "./pages/comercial/Relatorios";
import ComercialAgendaGreat from "./pages/comercial/AgendaGreat";
import ComercialMetaAgendamentos from "./pages/comercial/MetaAgendamentos";
import ComercialRaioXSDR from "./pages/comercial/RaioXSDR";
import ComercialRaioXCloser from "./pages/comercial/RaioXCloser";
import ComercialProjecao from "./pages/comercial/Projecao";
import ComercialInteligenciaOperacional from "./pages/comercial/InteligenciaOperacional";
import { AppLayout } from "./components/layout/AppLayout";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/integrations/supabase/client";
import { importMayBackupCsvIfNeeded } from "@/lib/pipelineCsvImport";
import { resetCommercialCloudDataIfNeeded } from "@/lib/commercialCloudStore";
import { resetGreatPlatformStorageIfNeeded } from "@/lib/safeStorage";
import { AlertTriangle } from "lucide-react";
import { AppErrorBoundary } from "@/components/app/AppErrorBoundary";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      gcTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />

      <Route
        path="/comercial"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="dashboards" element={<ComercialDashboards />} />
        <Route path="dashboard" element={<Navigate to="/comercial/dashboards" replace />} />
        <Route path="pipeline" element={<ComercialPipeline />} />
        <Route path="pipeline-planilha" element={<ComercialPipelinePlanilha />} />
        <Route path="metas" element={<ComercialMetas />} />
        <Route path="meta-agendamentos" element={<ComercialMetaAgendamentos />} />
        <Route path="relatorios" element={<ComercialRelatorios />} />
        <Route path="agenda-great" element={<ComercialAgendaGreat />} />
        <Route path="pre-venda" element={<ComercialRaioXSDR />} />
        <Route path="inteligencia-operacional" element={<ComercialInteligenciaOperacional />} />
        <Route path="raio-x-sdr" element={<Navigate to="pre-venda" replace />} />
        <Route path="raio-x-closer" element={<ComercialRaioXCloser />} />
        <Route path="projecao" element={<ComercialProjecao />} />
        <Route index element={<Navigate to="dashboards" replace />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function PlatformBootstrap() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith('/comercial')) {
      return;
    }

    let isMounted = true;

    async function bootstrapLocalData() {
      const resetApplied = resetGreatPlatformStorageIfNeeded();

      if (resetApplied) {
        queryClient.clear();
      }

      try {
        await resetCommercialCloudDataIfNeeded();
        const backupResult = await importMayBackupCsvIfNeeded();

        if (isMounted && backupResult.imported) {
          queryClient.clear();
          window.dispatchEvent(new Event('great-commercial-local-data-updated'));
        }
      } catch (error) {
        console.error('Erro ao importar clientes do pipeline:', error);
      }
    }

    bootstrapLocalData();

    return () => {
      isMounted = false;
    };
  }, [location.pathname]);

  return null;
}

const App = () => (
  <ThemeProvider
    attribute="class"
    defaultTheme="light"
    enableSystem
    storageKey="theme"
    disableTransitionOnChange
  >
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CommercialProvider>
          <BrowserRouter>
            <TooltipProvider>
              <PlatformBootstrap />
              {!isSupabaseConfigured && (
                <div className="fixed top-4 left-1/2 z-[100] w-[min(92vw,720px)] -translate-x-1/2">
                  <Alert className="border-warning/40 bg-warning/10">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Supabase não configurado</AlertTitle>
                    <AlertDescription>
                      Adicione `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` em um arquivo `.env` para habilitar login, agenda e métricas em tempo real.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
              <Toaster />
              <Sonner />
              <AppErrorBoundary>
                <AppRoutes />
              </AppErrorBoundary>
            </TooltipProvider>
          </BrowserRouter>
        </CommercialProvider>
      </AuthProvider>
    </QueryClientProvider>
  </ThemeProvider>
);

export default App;
