import React, { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, Lock, ArrowRight, User as UserIcon, Building, Wrench, ShieldCheck, ArrowLeft } from 'lucide-react';
import { Role } from '../types';

export const Login: React.FC = () => {
  const { roleType } = useParams<{ roleType: string }>();
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const [identifier, setIdentifier] = useState(''); // Can be email or username
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Configuration based on Role
  let title = "Ingreso";
  let colorClass = "bg-brand-600";
  let icon = <Droplets className="h-8 w-8 text-white" />;
  let labelIdentifier = "Correo Electrónico";
  let placeholderId = "usuario@ejemplo.com";
  let inputType = "email";

  if (roleType === 'tech') {
    title = "Portal Técnico";
    colorClass = "bg-brand-600";
    icon = <Wrench className="h-8 w-8 text-white" />;
  } else if (roleType === 'owner') {
    title = "Portal Propietario";
    colorClass = "bg-indigo-600";
    icon = <ShieldCheck className="h-8 w-8 text-white" />;
  } else if (roleType === 'condo') {
    title = "Portal Condominio";
    colorClass = "bg-teal-600";
    icon = <Building className="h-8 w-8 text-white" />;
    labelIdentifier = "Usuario de Torre/Edificio"; // Username label
    placeholderId = "ej. torre-a";
    inputType = "text";
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(identifier, password);
    setLoading(false);

    if (success) {
      // Logic handled in AuthContext/Home redirect or force here
      const u = JSON.parse(localStorage.getItem('aquacheck_user') || '{}');
      if (u.role === Role.OWNER) navigate('/owner/dashboard');
      else if (u.role === Role.CONDO_ADMIN) navigate('/condo/dashboard');
      else if (u.role === Role.TECHNICIAN) navigate('/tech/scan');
    } else {
      setError('Credenciales incorrectas. Verifique sus datos.');
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