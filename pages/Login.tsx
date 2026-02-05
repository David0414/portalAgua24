import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, Lock, ArrowRight, User as UserIcon, Building, Wrench, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { roleType } = useParams<{ roleType: string }>();
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Redirección post-login
  useEffect(() => {
    if (user) {
       // Recuperar la ubicación original si el usuario fue redirigido
       const state = location.state as any;
       const fromLocation = state?.from;
       
       if (fromLocation) {
           // CORRECCIÓN: Reconstruir la ruta completa incluyendo 'search' (?id=...) y 'hash'.
           const target = `${fromLocation.pathname}${fromLocation.search || ''}${fromLocation.hash || ''}`;
           navigate(target, { replace: true });
       } else {
           // Si no hay historial, ir al dashboard según el rol
           switch (user.role) {
                case Role.OWNER: navigate('/owner/dashboard'); break;
                case Role.CONDO_ADMIN: navigate('/condo/dashboard'); break;
                case Role.TECHNICIAN: navigate('/tech/scan'); break;
                default: navigate('/');
           }
       }
    }
  }, [user, navigate, location]);

  // UI Configuration
  let title = "Ingreso";
  let colorClass = "bg-brand-600";
  let icon = <Droplets className="h-8 w-8 text-white" />;
  let labelIdentifier = "Correo Electrónico";
  let placeholderId = "usuario@ejemplo.com";
  let inputType = "email";
  let expectedRole = Role.TECHNICIAN; // Default

  if (roleType === 'tech') {
    title = "Portal Técnico";
    colorClass = "bg-brand-600";
    icon = <Wrench className="h-8 w-8 text-white" />;
    expectedRole = Role.TECHNICIAN;
  } else if (roleType === 'owner') {
    title = "Portal Propietario";
    colorClass = "bg-indigo-600";
    icon = <ShieldCheck className="h-8 w-8 text-white" />;
    expectedRole = Role.OWNER;
  } else if (roleType === 'condo') {
    title = "Portal Condominio";
    colorClass = "bg-teal-600";
    icon = <Building className="h-8 w-8 text-white" />;
    labelIdentifier = "Usuario de Torre/Edificio"; 
    placeholderId = "ej. torre-a";
    inputType = "text";
    expectedRole = Role.CONDO_ADMIN;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Pass the expectedRole to the login function to enforce strict portal access
    const success = await login(identifier, password, expectedRole);
    setLoading(false);

    if (!success) {
      setError('Credenciales inválidas o acceso no autorizado para este portal.');
    }
  };

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center p-4">
      <Link to="/" className="mb-8 text-slate-500 hover:text-slate-800 flex items-center font-medium">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Volver a Selección de Cuenta
      </Link>

      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">
        <div className={`${colorClass} p-8 text-center transition-colors duration-300`}>
          <div className="inline-flex p-3 bg-white/20 rounded-full mb-4 shadow-lg">
            {icon}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">{title}</h1>
          <p className="text-white/80 text-sm mt-2">Ingrese sus credenciales</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">{labelIdentifier}</label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type={inputType}
                  required
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className={`pl-10 block w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 outline-none focus:border-transparent ${roleType === 'condo' ? 'focus:ring-teal-500' : 'focus:ring-brand-500'}`}
                  placeholder={placeholderId}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                <input 
                  type="password" 
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`pl-10 block w-full rounded-lg border-slate-300 border p-2.5 focus:ring-2 outline-none focus:border-transparent ${roleType === 'condo' ? 'focus:ring-teal-500' : 'focus:ring-brand-500'}`}
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg text-center font-medium">{error}</div>}

            <div className="flex items-center justify-between text-sm">
                 <label className="flex items-center text-slate-500">
                    <input type="checkbox" checked readOnly className="mr-2 rounded border-slate-300 text-brand-600 focus:ring-brand-500" />
                    Mantener sesión iniciada
                 </label>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-bold text-white transition-all transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 ${
                  roleType === 'condo' ? 'bg-teal-600 hover:bg-teal-700 focus:ring-teal-500' : 
                  roleType === 'owner' ? 'bg-indigo-600 hover:bg-indigo-700 focus:ring-indigo-500' : 
                  'bg-brand-600 hover:bg-brand-700 focus:ring-brand-500'
              }`}
            >
              {loading ? 'Validando...' : 'Iniciar Sesión'} <ArrowRight className="ml-2 h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};