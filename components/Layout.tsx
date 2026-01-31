import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, User, Menu } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  let sectionTitle = "Portal General";
  let navColor = "bg-slate-900";

  if (location.pathname.startsWith('/tech')) {
    sectionTitle = "Zona Técnica";
    navColor = "bg-brand-700";
  } else if (location.pathname.startsWith('/owner')) {
    sectionTitle = "Administración";
    navColor = "bg-indigo-800";
  } else if (location.pathname.startsWith('/condo')) {
    sectionTitle = "Portal Condominio";
    navColor = "bg-teal-700";
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className={`${navColor} text-white shadow-lg sticky top-0 z-50 transition-colors duration-500`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Branding with Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => navigate('/')}>
              <img 
                src="https://i.ibb.co/6yv7v0S/logo-agua-24.jpg" 
                alt="Agua/24" 
                className="h-10 w-10 rounded-full border-2 border-white/20 shadow-sm" 
              />
              <div className="flex flex-col leading-tight">
                 <span className="font-bold text-lg tracking-tight">Agua/24</span>
                 <span className="text-[10px] uppercase opacity-80 font-medium tracking-wider">{sectionTitle}</span>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <>
                  <div className="hidden sm:flex items-center text-sm font-medium text-white/90 bg-white/10 px-3 py-1.5 rounded-full border border-white/10">
                    <User className="h-4 w-4 mr-2" />
                    {user.name}
                  </div>
                  <button onClick={handleLogout} className="text-white/70 hover:text-white transition flex items-center text-sm font-medium">
                    <LogOut className="h-5 w-5 mr-1" />
                    <span className="hidden sm:inline">Salir</span>
                  </button>
                </>
              ) : (
                <span className="text-xs text-white/50">v2.0 Producción</span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      
      <footer className="bg-slate-100 border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm flex flex-col items-center">
          <img src="https://i.ibb.co/jv0TTKgr/logo.jpg" className="h-8 w-8 rounded-full mb-2 opacity-50 grayscale hover:grayscale-0 transition" />
          <span>&copy; {new Date().getFullYear()} Agua/24. Siempre cerca, siempre pura.</span>
        </div>
      </footer>
    </div>
  );
};