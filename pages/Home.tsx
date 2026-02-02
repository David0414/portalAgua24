import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, ShieldCheck, Building, ArrowRight, UserCog } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Redirección inteligente si ya hay sesión iniciada
  useEffect(() => {
    if (user) {
      if (user.role === Role.OWNER) navigate('/owner/dashboard');
      else if (user.role === Role.CONDO_ADMIN) navigate('/condo/dashboard');
      else if (user.role === Role.TECHNICIAN) navigate('/tech/scan');
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[85vh] space-y-12 relative px-4">
      
      {/* Header Branding */}
      <div className="text-center space-y-4 flex flex-col items-center animate-in fade-in slide-in-from-top-10 duration-700">
        <div className="bg-brand-50 p-6 rounded-full shadow-lg mb-2">
           <h1 className="text-4xl md:text-5xl font-black text-brand-600 tracking-tight">
             Agua<span className="text-slate-900">/24</span>
           </h1>
        </div>
        <p className="text-slate-500 text-lg mt-2 font-medium">Seleccione su portal de acceso</p>
      </div>

      {/* "2 Apps" Layout - Split Screen Effect */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl">
        
        {/* APP 1: ZONA TÉCNICA (Operaciones) */}
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-8 duration-700 delay-100">
            <div className="flex items-center space-x-2 mb-4 px-2">
                <Wrench className="h-5 w-5 text-brand-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">App Operativa</span>
            </div>
            
            <Link 
              to="/login/tech" 
              className="group flex-1 bg-white overflow-hidden rounded-3xl shadow-xl hover:shadow-2xl transition-all border border-slate-100 hover:border-brand-300 relative"
            >
              <div className="absolute top-0 left-0 w-2 h-full bg-brand-500"></div>
              <div className="p-8 md:p-10 flex flex-col h-full justify-between">
                <div>
                   <div className="w-16 h-16 bg-brand-50 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-100 transition-colors">
                      <Wrench className="h-8 w-8 text-brand-600" />
                   </div>
                   <h2 className="text-3xl font-bold text-slate-800 mb-2 group-hover:text-brand-700 transition-colors">Técnicos</h2>
                   <p className="text-slate-500 leading-relaxed">
                     Acceso exclusivo para personal de mantenimiento. Escaneo de equipos, checklist de servicio y reporte de incidencias.
                   </p>
                </div>
                <div className="mt-8 flex items-center text-brand-600 font-bold">
                   Ingresar ahora <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
        </div>

        {/* APP 2: ZONA ADMINISTRATIVA (Gestión) */}
        <div className="flex flex-col h-full animate-in fade-in slide-in-from-right-8 duration-700 delay-100">
            <div className="flex items-center space-x-2 mb-4 px-2">
                <ShieldCheck className="h-5 w-5 text-indigo-600" />
                <span className="text-xs font-bold uppercase tracking-widest text-slate-400">App Administrativa</span>
            </div>
            
            <div className="flex-1 bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col relative">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-900"></div>
                
                <div className="p-8 md:p-10 pb-4">
                    <h2 className="text-2xl font-bold text-slate-800 mb-2">Gestión y Control</h2>
                    <p className="text-slate-500 text-sm mb-6">
                        Portal para propietarios y administradores de edificio.
                    </p>
                </div>

                <div className="flex-1 flex flex-col px-8 pb-8 space-y-4">
                    {/* Botón Propietario */}
                    <Link to="/login/owner" className="flex items-center p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group">
                        <div className="bg-indigo-100 p-3 rounded-lg mr-4 group-hover:bg-white transition-colors">
                            <UserCog className="h-6 w-6 text-indigo-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-indigo-800">Soy Propietario</h3>
                            <p className="text-xs text-slate-500">Gestión total del sistema</p>
                        </div>
                        <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-indigo-500" />
                    </Link>

                    {/* Botón Condominio */}
                    <Link to="/login/condo" className="flex items-center p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:bg-teal-50 transition-all group">
                        <div className="bg-teal-100 p-3 rounded-lg mr-4 group-hover:bg-white transition-colors">
                            <Building className="h-6 w-6 text-teal-700" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 group-hover:text-teal-800">Soy Condominio</h3>
                            <p className="text-xs text-slate-500">Consulta de calidad</p>
                        </div>
                        <ArrowRight className="ml-auto h-5 w-5 text-slate-300 group-hover:text-teal-500" />
                    </Link>
                </div>
            </div>
        </div>

      </div>
      
      <div className="text-center text-xs text-slate-400 font-medium pt-8">
         Versión 2.1 Producción &bull; Sistema Seguro
      </div>
    </div>
  );
};