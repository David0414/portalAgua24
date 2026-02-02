import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { QrCode, ShieldCheck, ArrowRight, UserCog, Building } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const Home: React.FC = () => {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  // Redirección inteligente si ya hay sesión
  useEffect(() => {
    if (!isLoading && user) {
      if (user.role === Role.OWNER) navigate('/owner/dashboard', { replace: true });
      else if (user.role === Role.CONDO_ADMIN) navigate('/condo/dashboard', { replace: true });
      else if (user.role === Role.TECHNICIAN) navigate('/tech/scan', { replace: true });
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
      return <div className="min-h-screen flex items-center justify-center bg-white text-slate-400">Cargando...</div>;
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      
      {/* --- ZONA TÉCNICO (IZQUIERDA / ARRIBA) --- */}
      <div className="flex-1 bg-brand-600 text-white flex flex-col justify-center items-center p-8 md:p-16 relative overflow-hidden group">
         {/* Fondo decorativo */}
         <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-brand-500 to-brand-700 z-0"></div>
         <div className="absolute -bottom-10 -left-10 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl group-hover:opacity-20 transition duration-700"></div>

         <div className="relative z-10 max-w-md text-center md:text-left w-full">
            <div className="flex items-center justify-center md:justify-start space-x-2 mb-6 opacity-80">
                <QrCode className="h-5 w-5" />
                <span className="text-xs font-bold uppercase tracking-widest">Modo Técnico</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              ¿Vas a realizar<br/>Mantenimiento?
            </h1>
            <p className="text-brand-100 text-lg mb-8 leading-relaxed">
               Acceso directo para personal de campo. Escanea el código QR de la máquina para registrar tu visita.
            </p>

            <Link 
              to="/login/tech" 
              className="inline-flex items-center justify-center w-full md:w-auto bg-white text-brand-700 px-8 py-4 rounded-2xl font-bold text-lg shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
            >
               <QrCode className="mr-3 h-6 w-6" />
               Escanear Máquina
            </Link>
         </div>
      </div>

      {/* --- ZONA ADMINISTRATIVA (DERECHA / ABAJO) --- */}
      <div className="flex-1 bg-slate-50 flex flex-col justify-center items-center p-8 md:p-16 relative">
         <div className="max-w-md w-full">
            <div className="text-center md:text-left mb-10">
                <div className="flex items-center justify-center md:justify-start space-x-2 mb-4 text-slate-400">
                    <ShieldCheck className="h-5 w-5" />
                    <span className="text-xs font-bold uppercase tracking-widest">Portal Administrativo</span>
                </div>
                <h2 className="text-3xl font-bold text-slate-800 mb-2">Agua/24 Gestión</h2>
                <p className="text-slate-500">Acceso para propietarios y clientes.</p>
            </div>

            <div className="space-y-4">
                {/* Botón Propietario */}
                <Link to="/login/owner" className="flex items-center p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-indigo-500 hover:shadow-md transition-all group">
                    <div className="bg-indigo-50 p-4 rounded-xl mr-5 group-hover:bg-indigo-600 transition-colors duration-300">
                        <UserCog className="h-6 w-6 text-indigo-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg">Propietario / Admin</h3>
                        <p className="text-xs text-slate-500 mt-1">Gestión de máquinas y reportes</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-indigo-600 transform group-hover:translate-x-1 transition-all" />
                </Link>

                {/* Botón Condominio */}
                <Link to="/login/condo" className="flex items-center p-5 bg-white rounded-2xl shadow-sm border border-slate-200 hover:border-teal-500 hover:shadow-md transition-all group">
                    <div className="bg-teal-50 p-4 rounded-xl mr-5 group-hover:bg-teal-600 transition-colors duration-300">
                        <Building className="h-6 w-6 text-teal-600 group-hover:text-white transition-colors" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-slate-800 text-lg">Condominio / Cliente</h3>
                        <p className="text-xs text-slate-500 mt-1">Consultar calidad del agua</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-slate-300 group-hover:text-teal-600 transform group-hover:translate-x-1 transition-all" />
                </Link>
            </div>

            <div className="mt-12 text-center md:text-left">
               <p className="text-xs text-slate-400 font-medium">
                  v2.2 Producción &bull; &copy; {new Date().getFullYear()} Agua/24
               </p>
            </div>
         </div>
      </div>

    </div>
  );
};