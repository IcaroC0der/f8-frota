import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';

import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Analises from './pages/Analises';
import Parametrizacoes from './pages/Parametrizacoes';
import EstruturaModulos from './pages/EstruturaModulos';
import VeiculosConfig from './pages/config/VeiculosConfig';
import AbastecimentosConfig from './pages/config/AbastecimentosConfig';
import ManutencaoConfig from './pages/config/ManutencaoConfig';
import CustosOperacionaisConfig from './pages/config/CustosOperacionaisConfig';
import Veiculos from './pages/Veiculos';
import Abastecimentos from './pages/Abastecimentos';
import Manutencao from './pages/Manutencao';
import CustosOperacionais from './pages/CustosOperacionais';
import Relatorio from './pages/Relatorio';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/analises" element={<Analises />} />
        <Route path="/parametrizacoes" element={<Parametrizacoes />} />
        <Route path="/parametrizacoes/estrutura-modulos" element={<EstruturaModulos />} />
        <Route path="/parametrizacoes/estrutura-modulos/veiculos" element={<VeiculosConfig />} />
        <Route path="/parametrizacoes/estrutura-modulos/abastecimentos" element={<AbastecimentosConfig />} />
        <Route path="/parametrizacoes/estrutura-modulos/manutencao" element={<ManutencaoConfig />} />
        <Route path="/parametrizacoes/estrutura-modulos/custos-operacionais" element={<CustosOperacionaisConfig />} />
        <Route path="/veiculos" element={<Veiculos />} />
        <Route path="/abastecimentos" element={<Abastecimentos />} />
        <Route path="/manutencao" element={<Manutencao />} />
        <Route path="/custos-operacionais" element={<CustosOperacionais />} />
        <Route path="/relatorio" element={<Relatorio />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App