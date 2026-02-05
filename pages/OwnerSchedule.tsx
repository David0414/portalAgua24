import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Machine, User, Visit, Role } from '../types';
import { ArrowLeft, Calendar, Plus, Trash2, MapPin, User as UserIcon, AlertCircle, RefreshCw, CalendarDays, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { format, isPast, isToday, isTomorrow, addDays, endOfMonth, eachDayOfInterval, isSameDay, getDay } from 'date-fns';
import { es } from 'date-fns/locale';

export const OwnerSchedule: React.FC = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [allVisits, setAllVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection State
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  
  // Add Visit State
  const [newDate, setNewDate] = useState('');
  const [newType, setNewType] = useState<'weekly' | 'monthly'>('weekly');
  const [assignedTech, setAssignedTech] = useState<User | null>(null);

  // Bulk Generator State
  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkDayOfWeek, setBulkDayOfWeek] = useState<number>(1); // 1 = Lunes

  // Parse Date Helper
  const parseDate = (dateStr: string) => {
    if (dateStr.includes('T')) return new Date(dateStr);
    return new Date(`${dateStr}T00:00:00`);
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const m = await api.getMachines();
    const u = await api.getUsers();
    const v = await api.getVisits();
    
    setMachines(m);
    setUsers(u);
    setAllVisits(v);
    
    if (m.length > 0 && !selectedMachineId) {
        setSelectedMachineId(m[0].id);
        updateAssignedTech(m[0].id, u);
    } else if (selectedMachineId) {
        updateAssignedTech(selectedMachineId, u);
    }

    setLoading(false);
  };

  const updateAssignedTech = (machineId: string, userList: User[]) => {
      // Find condo admin assigned to this machine to check relations, 
      // BUT visits are usually assigned to a Technician.
      // In this system, we need to find who is the "Main Technician" for a machine.
      // Currently, the DB links Machine -> assignedToUserId (which is usually the CONDO ADMIN).
      // We need to SELECT a technician manually or default to a technician if only one exists.
      
      // Let's find any user with Role TECHNICIAN.
      const techs = userList.filter(user => user.role === Role.TECHNICIAN);
      if (techs.length > 0) {
          setAssignedTech(techs[0]); // Default to first tech for now
      } else {
          setAssignedTech(null);
      }
  };

  const handleMachineChange = (id: string) => {
      setSelectedMachineId(id);
      updateAssignedTech(id, users);
  };

  const handleAddVisit = async () => {
      if (!selectedMachineId || !newDate || !assignedTech) {
          alert("Faltan datos para programar.");
          return;
      }

      try {
          await api.addVisit({
              machineId: selectedMachineId,
              technicianId: assignedTech.id, // Use User ID
              technicianName: assignedTech.name,
              date: newDate,
              type: newType,
              status: 'pending'
          });
          setNewDate('');
          loadData(); // Refresh list
      } catch (e) {
          alert("Error al crear visita");
      }
  };

  const handleDeleteVisit = async (id: string) => {
      if(!confirm("¿Eliminar visita programada?")) return;
      await api.deleteVisit(id);
      loadData();
  };

  // --- LOGIC TO GENERATE MONTH ---
  const handleGenerateMonth = async () => {
      if (!selectedMachineId || !assignedTech) return;

      const now = new Date();
      // Native startOfMonth
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      // We can use endOfMonth from date-fns or native
      const end = endOfMonth(now);
      
      const days = eachDayOfInterval({ start, end });
      const targetDays = days.filter(d => getDay(d) === bulkDayOfWeek);

      let createdCount = 0;

      for (const d of targetDays) {
          const dateStr = format(d, 'yyyy-MM-dd');
          
          // Check if already exists
          const exists = allVisits.find(v => v.machineId === selectedMachineId && v.date === dateStr);
          
          if (!exists) {
              await api.addVisit({
                  machineId: selectedMachineId,
                  technicianId: assignedTech.id,
                  technicianName: assignedTech.name,
                  date: dateStr,
                  type: 'weekly', // Default to weekly for bulk
                  status: 'pending'
              });
              createdCount++;
          }
      }
      
      alert(`Se programaron ${createdCount} visitas para este mes.`);
      setIsBulkOpen(false);
      loadData();
  };

  const machineVisits = allVisits
    .filter(v => v.machineId === selectedMachineId)
    .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const upcomingVisits = machineVisits.filter(v => !isPast(parseDate(v.date)) || isToday(parseDate(v.date)));
  const pastVisits = machineVisits.filter(v => isPast(parseDate(v.date)) && !isToday(parseDate(v.date)));

  const techs = users.filter(u => u.role === Role.TECHNICIAN);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
            <button onClick={() => navigate('/owner/dashboard')} className="flex items-center text-slate-500 hover:text-indigo-600 mb-2 transition">
                <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
            </button>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center">
                <Calendar className="mr-3 h-8 w-8 text-indigo-600" />
                Programación Mensual
            </h1>
            <p className="text-slate-500 mt-1">Gestiona las visitas para cada técnico y máquina.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* LEFT COLUMN: Controls */}
          <div className="space-y-6">
              {/* Machine Selector */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <label className="block text-sm font-bold text-slate-700 uppercase mb-2">Seleccionar Máquina</label>
                  <select 
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      value={selectedMachineId}
                      onChange={(e) => handleMachineChange(e.target.value)}
                  >
                      {machines.map(m => (
                          <option key={m.id} value={m.id}>{m.location} ({m.id})</option>
                      ))}
                  </select>
                  
                  {selectedMachineId && (
                      <div className="mt-4 p-3 bg-indigo-50 rounded-lg flex items-center text-sm text-indigo-800">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="font-medium">
                              {machines.find(m => m.id === selectedMachineId)?.location}
                          </span>
                      </div>
                  )}
              </div>

              {/* Add Visit Form */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-indigo-100 relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                   <h3 className="font-bold text-lg text-indigo-900 mb-4 flex items-center">
                       <Plus className="h-5 w-5 mr-2" /> Agregar Visita
                   </h3>
                   
                   <div className="space-y-4">
                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Técnico Asignado</label>
                           {techs.length > 0 ? (
                               <select 
                                  className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                                  value={assignedTech?.id || ''}
                                  onChange={(e) => setAssignedTech(users.find(u => u.id === e.target.value) || null)}
                               >
                                   {techs.map(t => (
                                       <option key={t.id} value={t.id}>{t.name}</option>
                                   ))}
                               </select>
                           ) : (
                               <p className="text-red-500 text-xs">No hay técnicos registrados.</p>
                           )}
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Fecha</label>
                           <input 
                              type="date"
                              className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                              value={newDate}
                              onChange={(e) => setNewDate(e.target.value)}
                           />
                       </div>

                       <div>
                           <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Servicio</label>
                           <div className="flex space-x-2">
                               <button 
                                  onClick={() => setNewType('weekly')}
                                  className={`flex-1 py-2 text-xs font-bold rounded border ${newType === 'weekly' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-300'}`}
                               >
                                   Semanal
                               </button>
                               <button 
                                  onClick={() => setNewType('monthly')}
                                  className={`flex-1 py-2 text-xs font-bold rounded border ${newType === 'monthly' ? 'bg-purple-600 text-white border-purple-600' : 'bg-white text-slate-600 border-slate-300'}`}
                               >
                                   Mensual
                               </button>
                           </div>
                       </div>

                       <button 
                          onClick={handleAddVisit}
                          className="w-full py-3 bg-slate-900 text-white font-bold rounded-lg hover:bg-slate-800 transition shadow-lg mt-2"
                       >
                           Programar Visita
                       </button>
                   </div>
              </div>

              {/* Bulk Tool */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <h3 className="font-bold text-sm text-slate-700 mb-2 flex items-center">
                      <CalendarDays className="h-4 w-4 mr-2" /> Herramientas
                  </h3>
                  {!isBulkOpen ? (
                      <button 
                        onClick={() => setIsBulkOpen(true)}
                        className="w-full py-2 bg-white border border-slate-300 text-slate-600 font-bold rounded text-sm hover:bg-slate-100"
                      >
                          Generar Mes Completo...
                      </button>
                  ) : (
                      <div className="animate-in fade-in slide-in-from-top-2">
                          <p className="text-xs text-slate-500 mb-2">Crear visitas para todo el mes actual:</p>
                          <select 
                             className="w-full p-2 border border-slate-300 rounded mb-3 text-sm"
                             value={bulkDayOfWeek}
                             onChange={(e) => setBulkDayOfWeek(parseInt(e.target.value))}
                          >
                              <option value="1">Todos los Lunes</option>
                              <option value="2">Todos los Martes</option>
                              <option value="3">Todos los Miércoles</option>
                              <option value="4">Todos los Jueves</option>
                              <option value="5">Todos los Viernes</option>
                              <option value="6">Todos los Sábados</option>
                          </select>
                          <div className="flex space-x-2">
                              <button onClick={() => setIsBulkOpen(false)} className="flex-1 py-1 text-xs text-slate-500">Cancelar</button>
                              <button onClick={handleGenerateMonth} className="flex-1 py-1 bg-indigo-600 text-white text-xs font-bold rounded">Confirmar</button>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* RIGHT COLUMN: Calendar List */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[600px]">
               <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                   <h2 className="font-bold text-slate-700">Agenda de Visitas</h2>
                   <span className="text-xs font-bold bg-white border px-2 py-1 rounded text-slate-500">
                       {upcomingVisits.length} Pendientes
                   </span>
               </div>
               
               <div className="flex-1 overflow-y-auto p-4 space-y-3">
                   {machineVisits.length === 0 ? (
                       <div className="text-center py-20 text-slate-400">
                           <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                           <p>No hay visitas programadas para esta máquina.</p>
                       </div>
                   ) : (
                       <>
                         {/* UPCOMING */}
                         {upcomingVisits.map(v => (
                             <div key={v.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition group border-l-4 border-l-green-500">
                                 <div className="flex items-center space-x-4">
                                     <div className="text-center">
                                         <p className="text-xs font-bold text-slate-500 uppercase">{format(parseDate(v.date), 'MMM', {locale: es})}</p>
                                         <p className="text-xl font-bold text-slate-800">{format(parseDate(v.date), 'dd')}</p>
                                     </div>
                                     <div>
                                         <p className="font-bold text-slate-800 flex items-center">
                                             {format(parseDate(v.date), "EEEE", {locale: es})}
                                             {v.type === 'monthly' && <span className="ml-2 text-[10px] bg-purple-100 text-purple-700 px-2 rounded-full border border-purple-200">MENSUAL</span>}
                                         </p>
                                         <div className="flex items-center text-xs text-slate-500 mt-1">
                                             <UserIcon className="h-3 w-3 mr-1" />
                                             {v.technicianName}
                                         </div>
                                     </div>
                                 </div>
                                 <button 
                                    onClick={() => handleDeleteVisit(v.id)}
                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition"
                                 >
                                     <Trash2 className="h-4 w-4" />
                                 </button>
                             </div>
                         ))}

                         {/* PAST HEADER */}
                         {pastVisits.length > 0 && (
                             <div className="pt-4 pb-2">
                                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Historial Pasado</p>
                             </div>
                         )}

                         {/* PAST */}
                         {pastVisits.map(v => (
                             <div key={v.id} className="flex items-center justify-between p-3 bg-slate-50 border border-slate-100 rounded-lg opacity-60">
                                 <div className="flex items-center space-x-4">
                                     <div className="text-center min-w-[30px]">
                                         <p className="text-sm font-bold text-slate-500">{format(parseDate(v.date), 'dd/MM')}</p>
                                     </div>
                                     <div>
                                         <p className="text-sm font-medium text-slate-700">
                                             {v.type === 'monthly' ? 'Visita Mensual' : 'Visita Semanal'}
                                         </p>
                                         <p className="text-xs text-slate-500">{v.technicianName}</p>
                                     </div>
                                 </div>
                                 <span className="text-xs bg-slate-200 text-slate-500 px-2 py-1 rounded">Pasado</span>
                             </div>
                         ))}
                       </>
                   )}
               </div>
          </div>

      </div>
    </div>
  );
};