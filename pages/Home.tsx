import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, ShieldCheck, UserCog, Building, ArrowRight, Wrench } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const Home: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Smart Redirection if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === Role.OWNER) navigate('/owner/dashboard', { replace: true });
      else if (user.role === Role.CONDO_ADMIN) navigate('/condo/dashboard', { replace: true });
      else if (user.role === Role.TECHNICIAN) navigate('/tech/scan', { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-400 font-medium">Cargando aplicación...</div>;
  }

  return (
    <div className="min-h-[85vh] flex flex-col items-center justify-center px-4 py-8">
      
      <div className="text-center mb-10">
          <img 
            src="/logo.jpg" 
            alt="Agua 24 Logo" 
            className="h-24 w-auto mx-auto mb-4 object-contain"
            onError={(e) => {
               // Fallback if image fails
               e.currentTarget.src = "https://ui-avatars.com/api/?name=Agua+24&background=0ea5e9&color=fff&size=128&bold=true&length=3";
            }}
          />
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Agua/24</h1>
          <p className="text-slate-500 font-medium">Selecciona tu perfil para ingresar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-4xl">
          
          {/* APP TÉCNICO */}
          <Link to="/login/tech" className="group relative overflow-hidden rounded-3xl bg-blue-600 p-8 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 h-32 w-32 rounded-full bg-white/10 blur-2xl transition-all group-hover:bg-white/20"></div>
              
              <div className="relative z-10 flex flex-col h-full justify-between min-h-[200px]">
                  <div className="bg-white/20 w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md mb-4">
                      <QrCode className="h-7 w-7 text-white" />
                  </div>
                  
                  <div>
                      <h2 className="text-2xl font-bold text-white mb-2">Soy Técnico</h2>
                      <p className="text-blue-100 text-sm leading-relaxed">
                          Llegas, escaneas el código QR de la máquina y registras el mantenimiento.
                      </p>
                  </div>

                  <div className="mt-6 flex items-center text-white font-bold text-sm bg-black/20 w-fit px-4 py-2 rounded-lg group-hover:bg-black/30 transition">
                      Ingresar a App Técnico <ArrowRight className="ml-2 h-4 w-4" />
                  </div>
              </div>
          </Link>

          {/* APP ADMIN */}
          <div className="flex flex-col gap-4">
              <Link to="/login/owner" className="flex-1 group bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-indigo-500 hover:shadow-md transition-all flex items-center">
                  <div className="bg-indigo-50 p-4 rounded-2xl mr-5 group-hover:bg-indigo-600 transition-colors">
                      <ShieldCheck className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800">Soy Administrador</h2>
                      <p className="text-slate-500 text-xs">Gestión, usuarios y finanzas</p>
                  </div>
              </Link>

              <Link to="/login/condo" className="flex-1 group bg-white border border-slate-200 p-6 rounded-3xl shadow-sm hover:border-teal-500 hover:shadow-md transition-all flex items-center">
                  <div className="bg-teal-50 p-4 rounded-2xl mr-5 group-hover:bg-teal-600 transition-colors">
                      <Building className="h-6 w-6 text-teal-600 group-hover:text-white transition-colors" />
                  </div>
                  <div>
                      <h2 className="text-lg font-bold text-slate-800">Soy Condominio</h2>
                      <p className="text-slate-500 text-xs">Consultar calidad del agua</p>
                  </div>
              </Link>
          </div>

      </div>

      <div className="mt-12 text-slate-400 text-xs font-medium">
          v2.4 Producción &bull; Sistema Unificado
      </div>
    </div>
  );
};