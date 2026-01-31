import React from 'react';
import { HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { TechScan } from './pages/TechScan';
import { TechStartVisit } from './pages/TechStartVisit';
import { TechForm } from './pages/TechForm';
import { OwnerDashboard } from './pages/OwnerDashboard';
import { OwnerMachines } from './pages/OwnerMachines';
import { OwnerUsers } from './pages/OwnerUsers';
import { AdminReview } from './pages/AdminReview';
import { CondoDashboard } from './pages/CondoDashboard';
import { Role } from './types';

// Protected Route: Captures current location to redirect after login
const ProtectedRoute: React.FC<{ children: React.ReactElement, roles: Role[] }> = ({ children, roles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();
  
  if (isLoading) return <div className="p-10 text-center">Cargando acceso...</div>;
  
  if (!user) {
    // Determine the likely role needed based on the path to suggest the right login screen
    let loginPath = '/login/tech';
    if (location.pathname.includes('owner')) loginPath = '/login/owner';
    if (location.pathname.includes('condo')) loginPath = '/login/condo';
    
    // Redirect to login, passing the current location in state
    return <Navigate to={loginPath} state={{ from: location }} replace />;
  }

  if (!roles.includes(user.role)) return <div className="p-10 text-center text-red-500">Acceso no autorizado</div>;
  
  return children;
};

const AppRoutes: React.FC = () => {
  const { user } = useAuth();

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        
        {/* Dynamic Login */}
        <Route path="/login/:roleType" element={<Login />} />

        {/* APP 1: Technician */}
        <Route path="/tech/scan" element={<ProtectedRoute roles={[Role.TECHNICIAN]}><TechScan /></ProtectedRoute>} />
        <Route path="/tech/start/:machineId" element={<ProtectedRoute roles={[Role.TECHNICIAN]}><TechStartVisit /></ProtectedRoute>} />
        <Route path="/tech/form/:machineId" element={<ProtectedRoute roles={[Role.TECHNICIAN]}><TechForm /></ProtectedRoute>} />
        
        {/* APP 2: Owner */}
        <Route path="/owner/dashboard" element={<ProtectedRoute roles={[Role.OWNER]}><OwnerDashboard /></ProtectedRoute>} />
        <Route path="/owner/machines" element={<ProtectedRoute roles={[Role.OWNER]}><OwnerMachines /></ProtectedRoute>} />
        <Route path="/owner/users" element={<ProtectedRoute roles={[Role.OWNER]}><OwnerUsers /></ProtectedRoute>} />
        <Route path="/owner/review/:reportId" element={<ProtectedRoute roles={[Role.OWNER]}><AdminReview /></ProtectedRoute>} />

        {/* APP 3: Condo Admin */}
        <Route path="/condo/dashboard" element={<ProtectedRoute roles={[Role.CONDO_ADMIN]}><CondoDashboard /></ProtectedRoute>} />
      </Routes>
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppRoutes />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;