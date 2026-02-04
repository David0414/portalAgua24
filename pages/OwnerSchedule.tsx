import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Machine } from '../types';
import { ArrowLeft, Calendar, Save, Clock, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, parseISO, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const OwnerSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  // Local state for edits before saving
  const [edits, setEdits] = useState<Record<string, { weekly: string, monthly: string }>>({});

  useEffect(() => {
    fetchMachines();
  }, []);

  const fetchMachines = async () => {
    setLoading(true);
    const data = await api.getMachines();
    setMachines(data);
    
    // Initialize edits state with current DB values, ensuring defaults
    const initialEdits: Record<string, any> = {};
    data.forEach(m => {
        initialEdits[m.id] = {
            weekly: m.nextWeeklyVisit || '',
            monthly: m.nextMonthlyVisit || ''
        };
    });
    setEdits(initialEdits);
    setLoading(false);
  };

  const handleDateChange = (id: string, field: 'weekly' | 'monthly', value: string) => {
      // Force update state immediately to allow typing/selecting
      setEdits(prev => ({
          ...prev,
          [id]: {
              ...prev[id],
              [field]: value
          }
      }));
  };

  const saveSchedule = async (machine: Machine) => {
      setSavingId(machine.id);
      const schedule = edits[machine.id];
      try {
          await api.updateMachine(machine.id, {
              nextWeeklyVisit: schedule.weekly || null, // ensure empty string becomes null
              nextMonthlyVisit: schedule.monthly || null
          });
          // Visual feedback simulated delay
          await new Promise(r => setTimeout(r, 500));
      } catch (error) {
          alert("Error al guardar programación");
      } finally {
          setSavingId(null);
      }
  };

  const formatDateFriendly = (dateStr: string) => {
      if (!dateStr) return '';
      try {
        const date = parseISO(dateStr);
        if (isNaN(date.getTime())) return ''; // Invalid date check
        
        if (isToday(date)) return 'Hoy';
        if (isTomorrow(date)) return 'Mañana';
        return format(date, 'EEEE d MMM', { locale: es });
      } catch (e) {
        return '';
      }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <button onClick={() => navigate('/owner/dashboard')} className="flex items-center text-slate-500 hover:text-indigo-600 mb-2 transition">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                <Calendar className="mr-3 h-8 w-8 text-indigo-600" />
                Programación de Visitas
            </h1>
            <p className="text-slate-500 mt-1">Define las fechas de mantenimiento para cada equipo.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         {loading ? (
             <div className="p-10 text-center text-slate-400">Cargando inventario...</div>
         ) : machines.length === 0 ? (
             <div className="p-10 text-center text-slate-400">No hay máquinas registradas.</div>
         ) : (
             <div className="divide-y divide-slate-100">
                 {machines.map(m => {
                     // Ensure we have a default object even if state lagged (prevents crash)
                     const currentEdit = edits[m.id] || { weekly: '', monthly: '' };
                     
                     const isWeeklyPast = currentEdit.weekly && isPast(parseISO(currentEdit.weekly)) && !isToday(parseISO(currentEdit.weekly));
                     const isMonthlyPast = currentEdit.monthly && isPast(parseISO(currentEdit.monthly)) && !isToday(parseISO(currentEdit.monthly));

                     return (
                         <div key={m.id} className="p-6 flex flex-col md:flex-row gap-6 hover:bg-slate-50 transition">
                             {/* Info Machine */}
                             <div className="md:w-1/3">
                                 <div className="flex items-center space-x-2 mb-1">
                                     <MapPin className="h-4 w-4 text-slate-400" />
                                     <span className="font-bold text-slate-800">{m.location}</span>
                                 </div>
                                 <div className="text-xs font-mono text-slate-400 bg-slate-100 inline-block px-2 py-1 rounded">
                                     {m.id}
                                 </div>
                             </div>

                             {/* Inputs */}
                             <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                 {/* Weekly */}
                                 <div className="bg-white border border-slate-200 p-3 rounded-lg relative focus-within:ring-2 ring-indigo-100">
                                     <label className="block text-xs font-bold text-indigo-600 uppercase mb-1 flex justify-between">
                                         Visita Semanal
                                         <span className="text-slate-400 font-normal normal-case">
                                             {formatDateFriendly(currentEdit.weekly)}
                                         </span>
                                     </label>
                                     <input 
                                         type="date" 
                                         className={`w-full outline-none text-sm font-medium bg-transparent ${isWeeklyPast ? 'text-red-500' : 'text-slate-700'}`}
                                         value={currentEdit.weekly}
                                         onChange={(e) => handleDateChange(m.id, 'weekly', e.target.value)}
                                     />
                                     {isWeeklyPast && <AlertCircle className="absolute right-3 top-8 h-4 w-4 text-red-400" />}
                                 </div>

                                 {/* Monthly */}
                                 <div className="bg-white border border-slate-200 p-3 rounded-lg relative focus-within:ring-2 ring-teal-100">
                                     <label className="block text-xs font-bold text-teal-600 uppercase mb-1 flex justify-between">
                                         Visita Mensual
                                         <span className="text-slate-400 font-normal normal-case">
                                             {formatDateFriendly(currentEdit.monthly)}
                                         </span>
                                     </label>
                                     <input 
                                         type="date" 
                                         className={`w-full outline-none text-sm font-medium bg-transparent ${isMonthlyPast ? 'text-red-500' : 'text-slate-700'}`}
                                         value={currentEdit.monthly}
                                         onChange={(e) => handleDateChange(m.id, 'monthly', e.target.value)}
                                     />
                                     {isMonthlyPast && <AlertCircle className="absolute right-3 top-8 h-4 w-4 text-red-400" />}
                                 </div>
                             </div>

                             {/* Action */}
                             <div className="flex items-center">
                                 <button
                                     onClick={() => saveSchedule(m)}
                                     disabled={savingId === m.id}
                                     className={`p-3 rounded-full transition shadow-sm ${
                                         savingId === m.id 
                                         ? 'bg-green-100 text-green-600' 
                                         : 'bg-indigo-600 text-white hover:bg-indigo-700'
                                     }`}
                                 >
                                     {savingId === m.id ? <CheckCircle className="h-5 w-5 animate-pulse" /> : <Save className="h-5 w-5" />}
                                 </button>
                             </div>
                         </div>
                     );
                 })}
             </div>
         )}
      </div>
    </div>
  );
};
