import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { User, Role, Machine } from '../types';
import { ArrowLeft, Plus, UserPlus, Link as LinkIcon, Trash2, Mail, User as UserIcon, Edit2, Phone, AlertCircle, Server, ShieldCheck, Wrench, Building, MoreHorizontal } from 'lucide-react';

// --- SUB-COMPONENT: USER CARD ---
interface UserCardProps {
  user: User;
  colorClass: string;
  icon: React.ReactNode;
  machines: Machine[];
  onAssignMachine: (userId: string, machineId: string) => void;
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
}

const UserCard: React.FC<UserCardProps> = ({ user, colorClass, icon, machines, onAssignMachine, onEdit, onDelete }) => {
  // Mapeo de colores específicos para bordes y fondos
  const theme = {
      indigo: { border: 'border-indigo-200', bg: 'bg-indigo-50', text: 'text-indigo-800', iconBg: 'bg-indigo-100', iconText: 'text-indigo-600' },
      blue: { border: 'border-blue-200', bg: 'bg-blue-50', text: 'text-blue-800', iconBg: 'bg-blue-100', iconText: 'text-blue-600' },
      teal: { border: 'border-teal-200', bg: 'bg-teal-50', text: 'text-teal-800', iconBg: 'bg-teal-100', iconText: 'text-teal-600' }
  }[colorClass] || { border: 'border-slate-200', bg: 'bg-slate-50', text: 'text-slate-800', iconBg: 'bg-slate-100', iconText: 'text-slate-600' };

  return (
      <div className={`bg-white rounded-lg shadow-sm border ${theme.border} p-4 hover:shadow-md transition relative group`}>
          <div className="flex justify-between items-start mb-2">
              <div className={`p-2 rounded-lg ${theme.iconBg} ${theme.iconText}`}>
                  {icon}
              </div>
              <div className="flex space-x-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition">
                  <button 
                      onClick={() => onEdit(user)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded"
                      title="Editar"
                  >
                      <Edit2 className="h-4 w-4" />
                  </button>
                  <button 
                      onClick={() => onDelete(user)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                      title="Eliminar"
                  >
                      <Trash2 className="h-4 w-4" />
                  </button>
              </div>
          </div>
          
          <h4 className="font-bold text-slate-800 truncate" title={user.name}>{user.name}</h4>
          
          <div className="flex items-center text-xs text-slate-500 mt-1 mb-3 font-mono truncate" title={user.role === Role.CONDO_ADMIN ? user.username : user.email}>
              {user.role === Role.CONDO_ADMIN ? <UserIcon className="h-3 w-3 mr-1" /> : <Mail className="h-3 w-3 mr-1" />}
              {user.role === Role.CONDO_ADMIN ? user.username : user.email}
          </div>

          {user.phone && (
              <div className="flex items-center text-xs text-slate-400 mb-3">
                  <Phone className="h-3 w-3 mr-1" />
                  {user.phone}
              </div>
          )}

          {/* Selector de máquina exclusivo para condominios */}
          {user.role === Role.CONDO_ADMIN && (
              <div className="pt-3 border-t border-slate-100 mt-2">
                  <div className="flex items-center space-x-2 w-full">
                    <LinkIcon className="h-3 w-3 text-slate-400 flex-shrink-0" />
                    {machines.length > 0 ? (
                        <select 
                            className="flex-1 text-xs border border-slate-200 rounded p-1.5 focus:ring-1 focus:ring-teal-500 bg-slate-50 text-slate-600 font-medium outline-none"
                            value={user.assignedMachineId || ""}
                            onChange={(e) => onAssignMachine(user.id, e.target.value)}
                        >
                            <option value="">- Sin Asignar -</option>
                            {machines.map(m => (
                            <option key={m.id} value={m.id}>
                                {m.location} ({m.id})
                            </option>
                            ))}
                        </select>
                    ) : (
                        <span className="text-red-400 text-xs font-bold">Sin máquinas</span>
                    )}
                  </div>
              </div>
          )}
      </div>
  );
};

// --- MAIN COMPONENT ---
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
  const [newMachineId, setNewMachineId] = useState(''); 
  
  // MANUAL MODE STATE
  const [manualMode, setManualMode] = useState(false);
  const [manualUid, setManualUid] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const u = await api.getUsers();
    const m = await api.getMachines();
    // Ordenar alfabéticamente por nombre
    const sortedUsers = [...u].sort((a, b) => a.name.localeCompare(b.name));
    setUsers(sortedUsers);
    setMachines(m);
  };

  // Filtrar por roles
  const owners = users.filter(u => u.role === Role.OWNER);
  const technicians = users.filter(u => u.role === Role.TECHNICIAN);
  const condos = users.filter(u => u.role === Role.CONDO_ADMIN);

  const openCreateForm = () => {
    setEditingId(null);
    setNewName('');
    setNewIdentifier('');
    setNewPhone('');
    setNewPass('');
    setNewRole(Role.CONDO_ADMIN);
    // Si hay máquinas, preseleccionar la primera, si no, vacío
    setNewMachineId(machines.length > 0 ? machines[0].id : ''); 
    setManualMode(false);
    setManualUid('');
    setIsFormOpen(true);
  };

  const openEditForm = (u: User) => {
    setEditingId(u.id);
    setNewName(u.name);
    // CORRECCIÓN: Si es CONDO_ADMIN, preferir username, si no existe, usar email
    setNewIdentifier(u.role === Role.CONDO_ADMIN ? (u.username || u.email || '') : (u.email || ''));
    setNewPhone(u.phone || '');
    setNewPass(''); 
    setNewRole(u.role);
    setNewMachineId(u.assignedMachineId || '');
    setManualMode(false);
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newPhone || newPhone.length < 10) throw new Error("El número de WhatsApp es obligatorio (mínimo 10 dígitos).");
      
      if (newRole === Role.CONDO_ADMIN && newIdentifier.includes('@')) {
         throw new Error("El usuario de condominio debe ser un nombre simple (Ej: 'torre-a'), NO un correo electrónico.");
      }

      // VALIDACIÓN DE MÁQUINA:
      if (newRole === Role.CONDO_ADMIN && !newMachineId) {
          throw new Error("⚠️ ERROR: Debes asignar una MÁQUINA a un usuario de Condominio.");
      }

      const payload: any = {
        name: newName,
        role: newRole,
        phone: newPhone,
        // Solo Condo Admins tienen máquina asignada
        assignedMachineId: (newRole === Role.CONDO_ADMIN) ? newMachineId : null 
      };

      if (newRole === Role.CONDO_ADMIN) {
        payload.username = newIdentifier.trim();
        payload.email = undefined; 
      } else {
        // Owner y Técnico usan Email
        payload.email = newIdentifier.trim();
        payload.username = undefined;
      }

      if (editingId) {
        if (newPass) payload.password = newPass;
        await api.updateUser(editingId, payload);
      } else {
        // CREACIÓN
        if (manualMode) {
             if (!manualUid) throw new Error("Debes pegar el User UID.");
             await api.createProfileOnly({
                 ...payload,
                 uid: manualUid.trim()
             });
        } else {
            if (!newPass) throw new Error("La contraseña es requerida.");
            payload.password = newPass;
            await api.createUser(payload);
        }
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
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate('/owner/dashboard')} className="flex items-center text-slate-500 hover:text-indigo-600 mb-4 transition">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Usuarios</h1>
          <p className="text-slate-500 mt-1">Organización por roles y perfiles.</p>
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
                  <p className="text-sm text-amber-700">Para crear usuarios de condominio, primero debes <span className="underline cursor-pointer font-bold" onClick={() => navigate('/owner/machines')}>registrar una máquina</span>.</p>
              </div>
          </div>
      )}

      {/* --- KANBAN STYLE COLUMNS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* COLUMN 1: ADMINS */}
          <div className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200/60 p-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-indigo-100">
                  <h3 className="font-bold text-slate-700 flex items-center">
                      <ShieldCheck className="h-5 w-5 mr-2 text-indigo-600" />
                      Administradores
                  </h3>
                  <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-full">{owners.length}</span>
              </div>
              <div className="space-y-3">
                  {owners.map(u => (
                      <UserCard 
                        key={u.id} 
                        user={u} 
                        colorClass="indigo" 
                        icon={<ShieldCheck className="h-5 w-5"/>} 
                        machines={machines}
                        onAssignMachine={handleAssignMachine}
                        onEdit={openEditForm}
                        onDelete={handleDelete}
                      />
                  ))}
                  {owners.length === 0 && <p className="text-xs text-slate-400 text-center italic py-4">Sin administradores adicionales</p>}
              </div>
          </div>

          {/* COLUMN 2: TECHS */}
          <div className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200/60 p-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-blue-100">
                  <h3 className="font-bold text-slate-700 flex items-center">
                      <Wrench className="h-5 w-5 mr-2 text-blue-600" />
                      Técnicos
                  </h3>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full">{technicians.length}</span>
              </div>
              <div className="space-y-3">
                  {technicians.map(u => (
                      <UserCard 
                        key={u.id} 
                        user={u} 
                        colorClass="blue" 
                        icon={<Wrench className="h-5 w-5"/>} 
                        machines={machines}
                        onAssignMachine={handleAssignMachine}
                        onEdit={openEditForm}
                        onDelete={handleDelete}
                      />
                  ))}
                   {technicians.length === 0 && <p className="text-xs text-slate-400 text-center italic py-4">Sin técnicos registrados</p>}
              </div>
          </div>

          {/* COLUMN 3: CONDOS */}
          <div className="flex flex-col h-full bg-slate-50/50 rounded-xl border border-slate-200/60 p-4">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-teal-100">
                  <h3 className="font-bold text-slate-700 flex items-center">
                      <Building className="h-5 w-5 mr-2 text-teal-600" />
                      Condominios
                  </h3>
                  <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded-full">{condos.length}</span>
              </div>
              <div className="space-y-3">
                  {condos.map(u => (
                      <UserCard 
                        key={u.id} 
                        user={u} 
                        colorClass="teal" 
                        icon={<Building className="h-5 w-5"/>} 
                        machines={machines}
                        onAssignMachine={handleAssignMachine}
                        onEdit={openEditForm}
                        onDelete={handleDelete}
                      />
                  ))}
                   {condos.length === 0 && <p className="text-xs text-slate-400 text-center italic py-4">Sin condominios registrados</p>}
              </div>
          </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white p-6 rounded-xl shadow-2xl border border-indigo-100 w-full max-w-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl text-indigo-900 flex items-center">
                    <UserPlus className="mr-2 h-6 w-6" /> {editingId ? 'Editar Usuario' : 'Crear Cuenta'}
                    </h3>
                    <button 
                        type="button"
                        onClick={() => setIsFormOpen(false)}
                        className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition"
                    >
                        <MoreHorizontal className="h-5 w-5 text-slate-500" />
                    </button>
                </div>

                <form onSubmit={handleSaveUser} className="grid grid-cols-1 gap-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Selecciona el Rol</label>
                        <div className="grid grid-cols-3 gap-2">
                            <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition text-center ${newRole === Role.OWNER ? 'bg-indigo-50 border-indigo-200 ring-2 ring-indigo-500' : 'bg-white hover:bg-slate-50'}`}>
                                <input type="radio" name="role" checked={newRole === Role.OWNER} onChange={() => setNewRole(Role.OWNER)} className="hidden"/>
                                <ShieldCheck className={`h-6 w-6 mb-1 ${newRole === Role.OWNER ? 'text-indigo-600' : 'text-slate-400'}`} />
                                <span className={`text-xs font-bold ${newRole === Role.OWNER ? 'text-indigo-800' : 'text-slate-600'}`}>Admin</span>
                            </label>

                            <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition text-center ${newRole === Role.TECHNICIAN ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-500' : 'bg-white hover:bg-slate-50'}`}>
                                <input type="radio" name="role" checked={newRole === Role.TECHNICIAN} onChange={() => setNewRole(Role.TECHNICIAN)} className="hidden"/>
                                <Wrench className={`h-6 w-6 mb-1 ${newRole === Role.TECHNICIAN ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span className={`text-xs font-bold ${newRole === Role.TECHNICIAN ? 'text-blue-800' : 'text-slate-600'}`}>Técnico</span>
                            </label>

                            <label className={`flex flex-col items-center justify-center p-3 border rounded-lg cursor-pointer transition text-center ${newRole === Role.CONDO_ADMIN ? 'bg-teal-50 border-teal-200 ring-2 ring-teal-500' : 'bg-white hover:bg-slate-50'}`}>
                                <input type="radio" name="role" checked={newRole === Role.CONDO_ADMIN} onChange={() => setNewRole(Role.CONDO_ADMIN)} className="hidden"/>
                                <Building className={`h-6 w-6 mb-1 ${newRole === Role.CONDO_ADMIN ? 'text-teal-600' : 'text-slate-400'}`} />
                                <span className={`text-xs font-bold ${newRole === Role.CONDO_ADMIN ? 'text-teal-800' : 'text-slate-600'}`}>Condominio</span>
                            </label>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nombre Completo</label>
                        <input 
                            required placeholder="Ej: Juan Pérez" 
                            value={newName} onChange={e => setNewName(e.target.value)}
                            className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            Teléfono WhatsApp
                        </label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input 
                                required type="tel"
                                placeholder="Ej: 5215555555555"
                                value={newPhone} onChange={e => setNewPhone(e.target.value)}
                                className="w-full border border-slate-300 p-2.5 pl-9 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            {newRole === Role.CONDO_ADMIN ? 'Usuario de Acceso' : 'Correo Electrónico'}
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <input 
                                required type={newRole === Role.CONDO_ADMIN ? 'text' : 'email'} 
                                placeholder={newRole === Role.CONDO_ADMIN ? 'Ej: torre-a' : 'Ej: usuario@empresa.com'}
                                value={newIdentifier} onChange={e => setNewIdentifier(e.target.value)}
                                className="w-full border border-slate-300 p-2.5 pl-9 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
                            {editingId ? 'Nueva Contraseña (Opcional)' : 'Contraseña'}
                        </label>
                        <input 
                            type="password" placeholder={editingId ? "Sin cambios" : "••••••••"}
                            value={newPass} onChange={e => setNewPass(e.target.value)}
                            className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            required={!editingId}
                        />
                    </div>

                    {newRole === Role.CONDO_ADMIN && (
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                            <label className="block text-xs font-bold text-slate-700 uppercase mb-2 flex items-center">
                                <Server className="h-4 w-4 mr-1 text-teal-600" />
                                Asignar Máquina
                            </label>
                            {machines.length > 0 ? (
                                <select
                                    required
                                    value={newMachineId}
                                    onChange={(e) => setNewMachineId(e.target.value)}
                                    className="w-full border border-slate-300 p-2 rounded-lg outline-none focus:border-teal-500 text-sm"
                                >
                                    <option value="">-- Seleccionar --</option>
                                    {machines.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.location} ({m.id})
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <p className="text-red-500 text-xs font-bold">⚠️ Registra máquinas primero.</p>
                            )}
                        </div>
                    )}
                    
                    <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium">Cancelar</button>
                        <button 
                            type="submit" 
                            className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold transition shadow-md disabled:opacity-50"
                            disabled={newRole === Role.CONDO_ADMIN && machines.length === 0}
                        >
                            {editingId ? 'Guardar Cambios' : 'Crear Usuario'}
                        </button>
                    </div>
                </form>
             </div>
        </div>
      )}
    </div>
  );
};