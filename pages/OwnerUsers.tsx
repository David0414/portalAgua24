import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { User, Role, Machine } from '../types';
import { ArrowLeft, Plus, UserPlus, Link as LinkIcon, Trash2, Mail, User as UserIcon, Edit2, Phone, AlertCircle, Server } from 'lucide-react';

export const OwnerUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newIdentifier, setNewIdentifier] = useState(''); // Email or Username
  const [newPhone, setNewPhone] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.CONDO_ADMIN);
  // ESTADO PARA LA MÁQUINA
  const [newMachineId, setNewMachineId] = useState(''); 

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await api.getUsers();
    const m = await api.getMachines();
    setUsers(u.filter(user => user.role !== Role.OWNER));
    setMachines(m);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setNewName('');
    setNewIdentifier('');
    setNewPhone('');
    setNewPass('');
    setNewRole(Role.CONDO_ADMIN);
    // Pre-seleccionar la primera máquina disponible para evitar errores
    setNewMachineId(machines.length > 0 ? machines[0].id : ''); 
    setIsFormOpen(true);
  };

  const openEditForm = (u: User) => {
    setEditingId(u.id);
    setNewName(u.name);
    setNewIdentifier(u.role === Role.CONDO_ADMIN ? (u.username || '') : (u.email || ''));
    setNewPhone(u.phone || '');
    setNewPass(''); 
    setNewRole(u.role);
    setNewMachineId(u.assignedMachineId || '');
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Validaciones
      if (!newPhone || newPhone.length < 10) throw new Error("El número de WhatsApp es obligatorio (mínimo 10 dígitos).");
      
      // Validación estricta para usuario de condominio
      if (newRole === Role.CONDO_ADMIN && newIdentifier.includes('@')) {
         throw new Error("El usuario de condominio debe ser un nombre simple (Ej: 'torre-a'), NO un correo electrónico.");
      }

      // === VALIDACIÓN CRÍTICA DE MÁQUINA ===
      // Si no es dueño, DEBE tener máquina asignada
      if (newRole !== Role.OWNER && !newMachineId) {
          throw new Error("⚠️ ERROR: Debes asignar una MÁQUINA a este usuario (Técnico o Condominio).");
      }

      const payload: any = {
        name: newName,
        role: newRole,
        phone: newPhone,
        assignedMachineId: newMachineId // <--- AQUÍ SE ENVÍA LA MÁQUINA
      };

      if (newPass) {
        payload.password = newPass;
      }

      if (newRole === Role.CONDO_ADMIN) {
        payload.username = newIdentifier.trim();
        payload.email = undefined; 
      } else {
        payload.email = newIdentifier.trim();
        payload.username = undefined;
      }

      if (editingId) {
        await api.updateUser(editingId, payload);
      } else {
        if (!newPass) throw new Error("La contraseña es requerida para nuevos usuarios.");
        payload.password = newPass;
        await api.createUser(payload);
      }

      setIsFormOpen(false);
      loadData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleDelete = async (u: User) => {
    if (confirm(`¿Estás seguro de eliminar a ${u.name}?`)) {
      await api.deleteUser(u.id);
      loadData();
    }
  };

  const handleAssignMachine = async (userId: string, machineId: string) => {
    if (machines.length === 0) {
        if(confirm("No existen máquinas registradas. ¿Deseas crear una ahora?")) {
            navigate('/owner/machines');
        }
        return;
    }
    await api.assignMachineToUser(machineId, machineId === "" ? null : userId);
    loadData();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate('/owner/dashboard')} className="flex items-center text-slate-500 hover:text-indigo-600 mb-4 transition">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
      </button>

      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-slate-500 mt-1">Administra accesos para condominios y técnicos.</p>
        </div>
        <button 
          onClick={openCreateForm}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center font-bold shadow hover:bg-indigo-700 transition"
        >
          <Plus className="h-5 w-5 mr-1" /> Nuevo Usuario
        </button>
      </div>

      {machines.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex items-start space-x-3">
              <AlertCircle className="text-amber-600 h-5 w-5 mt-0.5" />
              <div>
                  <h4 className="font-bold text-amber-800">No hay máquinas registradas</h4>
                  <p className="text-sm text-amber-700">Para crear usuarios operativos, primero debes <span className="underline cursor-pointer font-bold" onClick={() => navigate('/owner/machines')}>registrar una máquina</span>.</p>
              </div>
          </div>
      )}

      {isFormOpen && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-indigo-900 flex items-center">
            <UserPlus className="mr-2 h-5 w-5" /> {editingId ? 'Editar Usuario' : 'Crear Cuenta'}
          </h3>
          <form onSubmit={handleSaveUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Tipo de Usuario</label>
                <div className="flex space-x-4">
                   <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${newRole === Role.CONDO_ADMIN ? 'bg-teal-50 border-teal-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <input type="radio" name="role" checked={newRole === Role.CONDO_ADMIN} onChange={() => setNewRole(Role.CONDO_ADMIN)} className="mr-2"/>
                      <span className="text-sm font-bold text-slate-700">Condominio (Usuario Simple)</span>
                   </label>
                   <label className={`flex items-center p-3 border rounded-lg cursor-pointer transition ${newRole === Role.TECHNICIAN ? 'bg-brand-50 border-brand-200' : 'bg-slate-50 hover:bg-slate-100'}`}>
                      <input type="radio" name="role" checked={newRole === Role.TECHNICIAN} onChange={() => setNewRole(Role.TECHNICIAN)} className="mr-2"/>
                      <span className="text-sm font-bold text-slate-700">Técnico (Email)</span>
                   </label>
                </div>
             </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo / Torre</label>
               <input 
                  required placeholder="Ej: Torre B" 
                  value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
               />
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                 Teléfono WhatsApp (Obligatorio)
               </label>
               <div className="relative">
                  <Phone className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />
                  <input 
                     required type="tel"
                     placeholder="Ej: 5215555555555"
                     value={newPhone} onChange={e => setNewPhone(e.target.value)}
                     className="w-full border p-2 pl-8 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                  {newRole === Role.CONDO_ADMIN ? 'Usuario de Acceso (SIN @)' : 'Correo Electrónico'}
               </label>
               <div className="relative">
                  {newRole === Role.CONDO_ADMIN ? <UserIcon className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" /> : <Mail className="absolute left-2 top-2.5 h-4 w-4 text-slate-400" />}
                  <input 
                     required type={newRole === Role.CONDO_ADMIN ? 'text' : 'email'} 
                     placeholder={newRole === Role.CONDO_ADMIN ? 'Ej: torre-b' : 'Ej: juan@tech.com'}
                     value={newIdentifier} onChange={e => setNewIdentifier(e.target.value)}
                     className="w-full border p-2 pl-8 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
               </div>
            </div>

            <div>
               <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                 {editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
               </label>
               <input 
                  type="password" placeholder={editingId ? "Dejar en blanco para no cambiar" : "Asignar Contraseña"}
                  value={newPass} onChange={e => setNewPass(e.target.value)}
                  className="w-full border p-2 rounded focus:ring-2 focus:ring-indigo-500 outline-none"
                  required={!editingId}
               />
            </div>

            {/* === SELECTOR DE MÁQUINA OBLIGATORIO === */}
            <div className="md:col-span-2 bg-slate-50 p-4 rounded-lg border border-slate-200 mt-2">
                <label className="block text-sm font-bold text-slate-700 uppercase mb-2 flex items-center">
                    <Server className="h-4 w-4 mr-2 text-indigo-600" />
                    Máquina Asignada (Requerido)
                </label>
                
                {machines.length > 0 ? (
                    <select
                        required
                        value={newMachineId}
                        onChange={(e) => setNewMachineId(e.target.value)}
                        className="w-full border border-slate-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white font-medium text-slate-700"
                    >
                        <option value="">-- Seleccionar Máquina --</option>
                        {machines.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.id} - {m.location}
                            </option>
                        ))}
                    </select>
                ) : (
                    <p className="text-red-500 text-sm font-bold">
                       ⚠️ No hay máquinas disponibles. Debes crear una en la sección "Máquinas" antes de crear usuarios.
                    </p>
                )}
                
                <p className="text-xs text-slate-500 mt-2">
                    {newRole === Role.CONDO_ADMIN 
                        ? "Esta será la máquina que verá el condominio." 
                        : "Esta será la máquina predeterminada para el técnico."}
                </p>
            </div>
            
            <div className="md:col-span-2 flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 border rounded hover:bg-slate-50">Cancelar</button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700 disabled:opacity-50"
                disabled={machines.length === 0}
              >
                {editingId ? 'Actualizar Usuario' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="p-4">Usuario</th>
              <th className="p-4">Contacto</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Máquina Asignada</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => {
              // Buscar máquina asignada
              const userAssignedMachineId = u.assignedMachineId;
              const machine = machines.find(m => m.id === userAssignedMachineId);

              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{u.name}</p>
                    <p className="text-xs text-slate-500 font-mono">
                         {u.role === Role.CONDO_ADMIN ? u.username : u.email}
                    </p>
                  </td>
                  <td className="p-4 text-sm text-slate-600">
                     <div className="flex items-center text-xs bg-slate-100 px-2 py-1 rounded w-fit">
                        <Phone className="h-3 w-3 mr-1 text-slate-400" />
                        {u.phone || 'Sin tel'}
                     </div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      u.role === Role.TECHNICIAN ? 'bg-blue-100 text-blue-700' :
                      'bg-teal-100 text-teal-700'
                    }`}>
                      {u.role === Role.TECHNICIAN ? 'TÉCNICO' : 'CONDOMINIO'}
                    </span>
                  </td>
                  <td className="p-4">
                     {/* Selector en línea para cambiar máquina rápidamente */}
                     {machines.length > 0 ? (
                          <div className="flex items-center space-x-2">
                            <LinkIcon className="h-4 w-4 text-slate-400" />
                            <select 
                              className="text-sm border-slate-200 rounded p-1 focus:ring-2 focus:ring-indigo-500 max-w-[150px] bg-white"
                              value={u.assignedMachineId || ""}
                              onChange={(e) => handleAssignMachine(u.id, e.target.value)}
                            >
                              <option value="">-- Sin Asignar --</option>
                              {machines.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.id} - {m.location}
                                </option>
                              ))}
                            </select>
                          </div>
                      ) : (
                          <span className="text-red-400 text-xs font-bold cursor-pointer" onClick={() => navigate('/owner/machines')}>Crear Máquina +</span>
                      )}
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end space-x-2">
                        <button 
                          onClick={() => openEditForm(u)}
                          className="text-slate-400 hover:text-indigo-600 p-1" 
                          title="Editar Usuario"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDelete(u)}
                          className="text-red-400 hover:text-red-600 p-1" 
                          title="Eliminar Usuario"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};