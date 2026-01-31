import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, ShieldCheck, Building, ArrowRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';

export const Home: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect to correct dashboard
  useEffect(() => {
    if (user) {
      if (user.role === Role.OWNER) navigate('/owner/dashboard');
      else if (user.role === Role.CONDO_ADMIN) navigate('/condo/dashboard');
      else if (user.role === Role.TECHNICIAN) navigate('/tech/scan');
    }
  }, [user, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-10 relative">
      <div className="text-center space-y-4 flex flex-col items-center">
        <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-brand-600 to-teal-400 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <img 
                src="https://i.ibb.co/6yv7v0S/logo-agua-24.jpg" 
                className="relative h-32 w-32 rounded-full mb-6 shadow-2xl border-4 border-white object-cover" 
                alt="Agua/24 Logo"
            />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 tracking-tight">
          Portal <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-600 to-teal-500">Agua/24</span>
        </h1>
        <p className="text-lg text-slate-600 max-w-2xl mx-auto">
          Sistema integral de gestión, mantenimiento y monitoreo de calidad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-6xl px-4">
        {/* App 1: Tecnico */}
        <Link 
          to="/login/tech" 
          className="group relative bg-white overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all border-t-4 border-brand-500 flex flex-col"
        >
          <div className="p-8 flex-1 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-brand-50 rounded-full group-hover:bg-brand-100 transition-colors">
              <Wrench className="h-10 w-10 text-brand-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Técnico</h2>
            <p className="text-slate-500 text-sm">
              Acceso para personal de mantenimiento. Escaneo QR y captura de evidencia.
            </p>
          </div>
          <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
            <span className="text-brand-600 font-bold text-sm flex items-center group-hover:underline">
              Ingresar <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          </div>
        </Link>

        {/* App 2: Propietario */}
        <Link 
          to="/login/owner" 
          className="group relative bg-white overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all border-t-4 border-indigo-500 flex flex-col"
        >
          <div className="p-8 flex-1 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-indigo-50 rounded-full group-hover:bg-indigo-100 transition-colors">
              <ShieldCheck className="h-10 w-10 text-indigo-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Propietario</h2>
            <p className="text-slate-500 text-sm">
              Gestión total. Finanzas, inventario de máquinas y validación de reportes.
            </p>
          </div>
          <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
            <span className="text-indigo-600 font-bold text-sm flex items-center group-hover:underline">
              Ingresar <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          </div>
        </Link>

        {/* App 3: Admin Condominio */}
        <Link 
          to="/login/condo" 
          className="group relative bg-white overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all border-t-4 border-teal-500 flex flex-col"
        >
          <div className="p-8 flex-1 flex flex-col items-center text-center space-y-4">
            <div className="p-4 bg-teal-50 rounded-full group-hover:bg-teal-100 transition-colors">
              <Building className="h-10 w-10 text-teal-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Condominio</h2>
            <p className="text-slate-500 text-sm">
              Acceso para administración del edificio. Monitoreo de calidad y visitas.
            </p>
          </div>
          <div className="bg-slate-50 p-4 flex justify-center border-t border-slate-100">
            <span className="text-teal-600 font-bold text-sm flex items-center group-hover:underline">
              Ingresar <ArrowRight className="ml-1 h-4 w-4" />
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
};