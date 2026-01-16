import { BrowserRouter, Routes, Route, Outlet } from 'react-router-dom';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { VehicleList } from './pages/VehicleList';
import { VehicleNew } from './pages/VehicleNew';
import { VehicleDetails } from './pages/VehicleDetails';
import { Integrations } from './pages/Integrations';
import { Leads } from './pages/Leads';
import { Settings } from './pages/Settings';
import { Proposals } from './pages/Proposals';
import { ProposalNew } from './pages/ProposalNew';
import { ProposalDetails } from './pages/ProposalDetails';
import { Reports } from './pages/Reports';
import { Finance } from './pages/Finance'; // Importado
import { SaasDashboard } from './pages/saas/SaasDashboard';
import { Login } from './pages/Login';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { NotFound } from './pages/NotFound';

// Public Pages
import { PublicLayout } from './layouts/PublicLayout';
import { PublicHome } from './pages/public/PublicHome';
import { PublicVehicle } from './pages/public/PublicVehicle';

function Layout() {
  return (
    <div className="flex min-h-screen bg-slate-50 font-sans">
      <Sidebar />
      <main className="flex-1 ml-64 p-8 h-screen overflow-hidden flex flex-col">
        <div className="max-w-7xl mx-auto w-full h-full flex flex-col overflow-y-auto pr-2">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Auth Routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Admin Routes (Protected) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="vehicles" element={<VehicleList />} />
              <Route path="vehicles/new" element={<VehicleNew />} />
              <Route path="vehicles/:id" element={<VehicleDetails />} />
              <Route path="integrations" element={<Integrations />} />
              <Route path="leads" element={<Leads />} />
              <Route path="proposals" element={<Proposals />} />
              <Route path="proposals/new" element={<ProposalNew />} />
              <Route path="proposals/:id" element={<ProposalDetails />} />
              <Route path="finance" element={<Finance />} /> {/* Atualizado */}
              <Route path="reports" element={<Reports />} />
              <Route path="settings" element={<Settings />} />
              
              {/* SaaS Super Admin */}
              <Route path="saas" element={<SaasDashboard />} />
            </Route>
          </Route>

          {/* Public Website Routes */}
          <Route path="/site/:tenantId" element={<PublicLayout />}>
             <Route index element={<PublicHome />} />
             <Route path=":vehicleId" element={<PublicVehicle />} />
          </Route>

          {/* 404 Catch All */}
          <Route path="*" element={<NotFound />} />

        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
