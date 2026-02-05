import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { Machine, User, Role } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { sendWhatsAppNotification, generateStartVisitMessage } from '../services/whatsapp';
import { MapPin, MessageCircle, ArrowRight, UserCheck, ShieldCheck, Loader2, Lock } from 'lucide-react';

export const TechStartVisit: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const navigate = useNavigate();
  const { user: techUser } = useAuth();
  
  const [machine, setMachine] = useState<Machine | null>(null);
  const [contacts, setContacts] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // State to track if notification has been sent
  const [hasNotified, setHasNotified] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!machineId) return;
      const m = await api.getMachine(machineId);
      const allUsers = await api.getUsers();
      
      if (m) {
        setMachine(m);
        // Filter contacts: Owners (always) + Condo Admins assigned to this machine
        const relevantContacts = allUsers.filter(u => 
          u.role === Role.OWNER || 
          (u.role === Role.CONDO_ADMIN && u.assignedMachineId === machineId)
        );
        setContacts(relevantContacts);
      }
      setLoading(false);
    };
    fetchData();
  }, [machineId]);

  const handleNotify = (contact: User) => {
    if (!machine || !techUser || !contact.phone) {
        if(!contact.phone) alert("Este usuario no tiene teléfono registrado.");
        return;
    }
    const message = generateStartVisitMessage(machine.location, techUser.name);
    sendWhatsAppNotification(contact.phone, message);
    
    // Unlock the next step
    setHasNotified(true);
  };

  const handleContinue = () => {
    if (!hasNotified) return;
    navigate(`/tech/form/${machineId}`);
  };

  if (loading) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-brand-600" /></div>;
  if (!machine) return <div className="p-10 text-center">Máquina no encontrada.</div>;

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      <div className="bg-white rounded-xl shadow-lg border-t-4 border-brand-500 p-6 text-center">
        <div className="bg-brand-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
           <MapPin className="h-8 w-8 text-brand-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Check-in de Visita</h1>
        <p className="text-slate-500 mt-2">
           Estás en: <span className="font-bold text-slate-700">{machine.location}</span>
        </p>
        <p className="text-xs font-mono bg-slate-100 inline-block px-2 py-1 rounded mt-2 text-slate-400">
           ID: {machine.id}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200">
           <h3 className="font-bold text-slate-700 flex items-center">
             <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
             1. Notificar Llegada
           </h3>
           <p className="text-xs text-slate-500 mt-1">Debes avisar al menos a un contacto para continuar.</p>
        </div>
        
        <div className="divide-y divide-slate-100">
          {contacts.map(contact => (
            <div key={contact.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
               <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${contact.role === Role.OWNER ? 'bg-indigo-100 text-indigo-600' : 'bg-teal-100 text-teal-600'}`}>
                     {contact.role === Role.OWNER ? <ShieldCheck className="h-5 w-5" /> : <UserCheck className="h-5 w-5" />}
                  </div>
                  <div>
                     <p className="font-bold text-slate-800 text-sm">{contact.name}</p>
                     <p className="text-xs text-slate-400 font-medium">
                        {contact.role === Role.OWNER ? 'Propietario' : 'Admin Condominio'}
                     </p>
                  </div>
               </div>
               
               <button 
                  onClick={() => handleNotify(contact)}
                  className="bg-green-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center hover:bg-green-600 transition shadow-sm active:scale-95"
               >
                  <MessageCircle className="h-3 w-3 mr-1" />
                  Avisar
               </button>
            </div>
          ))}
          {contacts.length === 0 && (
             <div className="p-6 text-center text-slate-400 text-sm">
                No hay contactos asignados a esta máquina.
             </div>
          )}
        </div>
      </div>

      {/* Botón condicional */}
      <div className="pt-2">
        <button
            onClick={handleContinue}
            disabled={!hasNotified}
            className={`w-full flex items-center justify-center space-x-2 px-6 py-4 rounded-xl font-bold shadow-lg transition transform ${
                hasNotified 
                ? 'bg-brand-600 text-white hover:bg-brand-700 hover:scale-[1.02]' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
        >
            {hasNotified ? (
                <>
                    <span>2. Comenzar Checklist</span>
                    <ArrowRight className="h-5 w-5" />
                </>
            ) : (
                <>
                    <Lock className="h-5 w-5 mr-2" />
                    <span>Avisa para continuar</span>
                </>
            )}
        </button>
        {!hasNotified && (
            <p className="text-center text-xs text-slate-400 mt-3 animate-pulse">
                Debes enviar notificación de llegada primero.
            </p>
        )}
      </div>
    </div>
  );
};