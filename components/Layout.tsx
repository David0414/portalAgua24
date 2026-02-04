import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Menu, QrCode, Shield } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // Logic to determine which "App" we are in
  const isTechApp = location.pathname.startsWith('/tech');
  const isOwnerApp = location.pathname.startsWith('/owner');
  const isCondoApp = location.pathname.startsWith('/condo');

  let appTitle = "Agua/24";
  let appSubtitle = "Portal General";
  let navColor = "bg-slate-900";
  
  if (isTechApp) {
    appTitle = "App Técnico";
    appSubtitle = "Zona Operativa";
    navColor = "bg-blue-600"; // Distinctive Blue for Tech
  } else if (isOwnerApp) {
    appTitle = "App Admin";
    appSubtitle = "Gestión & Finanzas";
    navColor = "bg-slate-900"; // Professional Dark for Admin
  } else if (isCondoApp) {
    appTitle = "Mi Condominio";
    appSubtitle = "Calidad del Agua";
    navColor = "bg-teal-600"; // Calm Teal for Residents
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Dynamic Navbar */}
      <nav className={`${navColor} text-white shadow-lg sticky top-0 z-50 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Branding with Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <div className="p-1 bg-white rounded-lg backdrop-blur-sm overflow-hidden">
                <img 
                  src="/logo.jpg" 
                  alt="Logo" 
                  className="h-8 w-auto object-contain"
                  onError={(e) => {
                    // Fallback if logo.jpg is missing
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerHTML = '<svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>';
                  }}
                />
              </div>
              <div className="flex flex-col leading-none">
                 <span className="font-bold text-lg tracking-tight">{appTitle}</span>
                 <span className="text-[10px] uppercase opacity-80 font-medium tracking-wider">{appSubtitle}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center text-sm font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                    <User className="h-4 w-4 mr-2" />
                    {user.name}
                  </div>
                  <button onClick={handleLogout} className="text-white/70 hover:text-white transition flex items-center text-sm font-medium bg-black/20 hover:bg-black/30 px-3 py-2 rounded-lg">
                    <LogOut className="h-5 w-5 mr-1" />
                    <span className="hidden sm:inline">Salir</span>
                  </button>
                </>
              ) : (
                <span className="text-xs text-white/50 bg-white/10 px-2 py-1 rounded">v2.4</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {children}
      </main>
      
      {/* Footer - Minimal on Tech App to reduce distraction */}
      {!isTechApp && (
        <footer className="bg-slate-100 border-t border-slate-200 mt-auto py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm flex flex-col items-center">
            <span>&copy; {new Date().getFullYear()} Agua/24. Plataforma de Gestión Inteligente.</span>
          </div>
        </footer>
      )}
    </div>
  );
};