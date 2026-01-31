import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { User, Role, Machine } from '../types';
import { ArrowLeft, Plus, UserPlus, Link as LinkIcon, Trash2, Mail, User as UserIcon, Edit2 } from 'lucide-react';

export const OwnerUsers: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName] = useState('');
  const [newIdentifier, setNewIdentifier] = useState(''); // Email or Username
  const [newPass, setNewPass] = useState('');
  const [newRole, setNewRole] = useState<Role>(Role.CONDO_ADMIN);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await api.getUsers();
    const m = await api.getMachines();
    // FILTRO: Excluir a los Propietarios de la lista de gestión.
    // Solo mostramos Técnicos y Administradores de Condominio.
    setUsers(u.filter(user => user.role !== Role.OWNER));
    setMachines(m);
  };

  const openCreateForm = () => {
    setEditingId(null);
    setNewName('');
    setNewIdentifier('');
    setNewPass('');
    setNewRole(Role.CONDO_ADMIN);
    setIsFormOpen(true);
  };

  const openEditForm = (u: User) => {
    setEditingId(u.id);
    setNewName(u.name);
    setNewIdentifier(u.role === Role.CONDO_ADMIN ? (u.username || '') : (u.email || ''));
    setNewPass(''); // Don't show old password, only allow reset
    setNewRole(u.role);
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: any = {
        name: newName,
        role: newRole
      };

      if (newPass) {
        payload.password = newPass;
      }

      if (newRole === Role.CONDO_ADMIN) {
        payload.username = newIdentifier;
        payload.email = undefined; // Clear email if switching types
      } else {
        payload.email = newIdentifier;
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
    // Doble seguridad, aunque no deberían aparecer en la lista
    if (u.role === Role.OWNER) {
      alert("No se puede eliminar al propietario.");
      return;
    }
    if (confirm(`¿Estás seguro de eliminar a ${u.name}?`)) {
      await api.deleteUser(u.id);
      loadData();
    }
  };

  const handleAssignMachine = async (userId: string, machineId: string) => {
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
                      <span className="text-sm font-bold text-slate-700">Técnico (Requiere Email)</span>
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
                  {newRole === Role.CONDO_ADMIN ? 'Usuario de Acceso' : 'Correo Electrónico'}
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
            
            <div className="md:col-span-2 flex justify-end space-x-2 mt-4 pt-4 border-t border-slate-100">
              <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-slate-600 border rounded hover:bg-slate-50">Cancelar</button>
              <button type="submit" className="px-6 py-2 bg-indigo-600 text-white rounded font-bold hover:bg-indigo-700">
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
              <th className="p-4">Credencial</th>
              <th className="p-4">Rol</th>
              <th className="p-4">Máquina Asignada</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => {
              const assignedMachine = machines.find(m => m.assignedToUserId === u.id);
              return (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="p-4">
                    <p className="font-bold text-slate-800 flex items-center">
                      {u.name}
                    </p>
                  </td>
                  <td className="p-4 text-sm text-slate-600 font-mono">
                     {u.role === Role.CONDO_ADMIN ? (
                        <span className="bg-slate-100 px-2 py-1 rounded border border-slate-200">{u.username}</span>
                     ) : (
                        u.email
                     )}
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
                    {u.role === Role.CONDO_ADMIN ? (
                      <div className="flex items-center space-x-2">
                        <LinkIcon className="h-4 w-4 text-slate-400" />
                        <select 
                          className="text-sm border-slate-200 rounded p-1 focus:ring-2 focus:ring-indigo-500 max-w-[150px]"
                          value={assignedMachine?.id || ""}
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
                      <span className="text-slate-400 text-sm">-</span>
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
            {users.length === 0 && (
                <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400">
                        No hay usuarios registrados aparte del propietario.
                    </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};