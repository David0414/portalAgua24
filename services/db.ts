import { Report, ReportStatus, Machine, User, Role } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase, USE_SUPABASE } from './supabaseClient';

const STORAGE_KEY = 'aquacheck_db_v3';

// ==========================================
// MOCK DATA IMPLEMENTATION (Local Storage)
// ==========================================
const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);

  // Seed Data if empty
  const initialData = {
    reports: [],
    machines: [
      { id: 'M-001', location: 'Plaza Central - Torre A', lastMaintenance: '2023-10-01', assignedToUserId: 'u-condo-1' },
      { id: 'M-002', location: 'Av. Reforma #123', lastMaintenance: '2023-10-05', assignedToUserId: null },
    ],
    users: [
      { id: 'u-owner', email: 'admin@agua24.com', password: '123', name: 'Propietario Principal', role: Role.OWNER, phone: '5215555555555' },
      { id: 'u-tech', email: 'tech@agua24.com', password: '123', name: 'Técnico Juan', role: Role.TECHNICIAN, phone: '5215555555556' },
      { id: 'u-condo-1', username: 'torre-a', password: '123', name: 'Admin Torre A', role: Role.CONDO_ADMIN, assignedMachineId: 'M-001', phone: '5215555555557' }
    ]
  };
  saveDb(initialData);
  return initialData;
};

const saveDb = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Initialize DB on load if mock
if (!USE_SUPABASE) getDb();

// ==========================================
// UNIFIED API SERVICE
// ==========================================

export const api = {
  // --- Auth Methods ---
  login: async (identifier: string, password: string): Promise<User | null> => {
    if (USE_SUPABASE) {
        // Real Supabase Login
        
        // 1. Normalizar el email/usuario
        let email = identifier.trim();
        // Si no tiene arroba, asumimos que es un usuario de condominio y le agregamos el dominio falso
        if (!email.includes('@')) {
            email = `${email}@agua24.app`;
        }

        console.log("Intentando login con:", email);

        // 2. Intentar autenticación
        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("Error de Supabase Auth:", error.message);
            return null;
        }

        if (!data.user) {
            console.error("No se devolvió usuario");
            return null;
        }

        // 3. Obtener el perfil completo desde la tabla pública
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) {
            console.error("El usuario existe en Auth pero NO en la tabla profiles:", profileError.message);
            // Esto pasa si creas el usuario en Auth manualmente pero olvidas la fila en profiles
            return null; 
        }
            
        return profile as User;

    } else {
        // Mock Login
        await new Promise(r => setTimeout(r, 600)); 
        const db = getDb();
        const user = db.users.find((u: any) => 
          (u.email === identifier || u.username === identifier) && 
          u.password === password
        );
        if (!user) return null;
        const { password: _, ...safeUser } = user;
        return safeUser as User;
    }
  },

  getUsers: async (): Promise<User[]> => {
    if (USE_SUPABASE) {
        const { data } = await supabase.from('profiles').select('*');
        return data as User[] || [];
    } else {
        await new Promise(r => setTimeout(r, 400));
        const db = getDb();
        return db.users.map(({ password, ...u }: any) => u);
    }
  },

  createUser: async (user: Omit<User, 'id'> & { password: string }): Promise<User> => {
    if (USE_SUPABASE) {
        // USAMOS LA FUNCION SQL 'create_new_user' (RPC)
        // Esto permite crear usuarios sin cerrar la sesión del admin
        
        // 1. Preparar Email
        let finalEmail = user.email;
        if (!finalEmail && user.username) {
            // Si es condominio y no tiene email, generamos uno falso interno
            finalEmail = `${user.username}@agua24.app`;
        }
        
        if (!finalEmail) throw new Error("Se requiere email o usuario");

        console.log("Creando usuario vía RPC:", finalEmail);

        // 2. Llamar a la función SQL
        const { data: newId, error } = await supabase.rpc('create_new_user', {
            email_input: finalEmail,
            password_input: user.password,
            name_input: user.name,
            role_input: user.role,
            username_input: user.username || null
        });

        if (error) {
            console.error("Error RPC create_new_user:", error);
            throw new Error(error.message || "Error al crear usuario. Verifica que el SQL 'create_new_user' esté instalado en Supabase.");
        }

        // 3. Devolver el objeto usuario creado
        return {
            id: newId,
            email: finalEmail,
            username: user.username,
            name: user.name,
            role: user.role,
            phone: user.phone
        };

    } else {
        await new Promise(r => setTimeout(r, 500));
        const db = getDb();
        if (db.users.find((u: any) => (u.email && u.email === user.email) || (u.username && u.username === user.username))) {
          throw new Error("El usuario o correo ya existe");
        }
        const newUser = { ...user, id: `u-${uuidv4()}` };
        db.users.push(newUser);
        saveDb(db);
        const { password, ...safeUser } = newUser;
        return safeUser;
    }
  },

  updateUser: async (id: string, updates: Partial<User & { password?: string }>): Promise<User> => {
    if (USE_SUPABASE) {
        // Separamos password de los datos del perfil
        const { password, ...profileUpdates } = updates;
        
        // 1. Actualizar perfil público
        const { data, error } = await supabase.from('profiles').update(profileUpdates).eq('id', id).select().single();
        if(error) throw error;

        // 2. Si hay cambio de contraseña, actualizar en Auth (Requiere permiso de admin, API especial)
        // Nota: En esta versión simple frontend-only, cambiar el password de OTRO usuario es restringido.
        if (password) {
             console.warn("Cambio de contraseña directo no soportado en frontend-only para otros usuarios.");
             // Si el usuario se estuviera editando a sí mismo:
             // await supabase.auth.updateUser({ password: password });
        }

        return data as User;
    } else {
        await new Promise(r => setTimeout(r, 500));
        const db = getDb();
        const index = db.users.findIndex((u: User) => u.id === id);
        if (index === -1) throw new Error("Usuario no encontrado");
        
        const currentUser = db.users[index];
        if (currentUser.role === Role.OWNER && updates.role && updates.role !== Role.OWNER) {
             throw new Error("No se puede cambiar el rol del propietario principal");
        }
        const updatedUser = { ...currentUser, ...updates };
        db.users[index] = updatedUser;
        saveDb(db);
        const { password, ...safeUser } = updatedUser;
        return safeUser;
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (USE_SUPABASE) {
        // Usamos la función RPC 'delete_user_completely' para borrar de Auth y Profiles al mismo tiempo
        const { error } = await supabase.rpc('delete_user_completely', { target_user_id: id });
        
        if (error) {
            console.error("Error eliminando usuario:", error);
            throw new Error("No se pudo eliminar el usuario. Verifica que la función SQL 'delete_user_completely' exista.");
        }
    } else {
        await new Promise(r => setTimeout(r, 500));
        const db = getDb();
        const user = db.users.find((u: User) => u.id === id);
        if (user && user.role === Role.OWNER) {
          throw new Error("No se puede eliminar una cuenta de Propietario.");
        }
        db.users = db.users.filter((u: User) => u.id !== id);
        saveDb(db);
    }
  },

  // --- Machine Methods ---

  getMachines: async (): Promise<Machine[]> => {
    if (USE_SUPABASE) {
        const { data } = await supabase.from('machines').select('*');
        return data as Machine[] || [];
    } else {
        await new Promise(r => setTimeout(r, 300));
        const db = getDb();
        return db.machines || [];
    }
  },

  getMachine: async (id: string): Promise<Machine | undefined> => {
    if (USE_SUPABASE) {
        const { data } = await supabase.from('machines').select('*').eq('id', id).single();
        return data as Machine;
    } else {
        await new Promise(r => setTimeout(r, 500));
        const db = getDb();
        return db.machines.find((m: Machine) => m.id === id);
    }
  },

  addMachine: async (machine: Machine): Promise<Machine> => {
    if (USE_SUPABASE) {
         const { data, error } = await supabase.from('machines').insert(machine).select().single();
         if(error) throw error;
         return data as Machine;
    } else {
        await new Promise(r => setTimeout(r, 500));
        const db = getDb();
        if (db.machines.find((m: Machine) => m.id === machine.id)) throw new Error("ID existe");
        db.machines.push(machine);
        saveDb(db);
        return machine;
    }
  },

  deleteMachine: async (id: string): Promise<void> => {
    if (USE_SUPABASE) {
        await supabase.from('machines').delete().eq('id', id);
    } else {
        await new Promise(r => setTimeout(r, 500));
        const db = getDb();
        db.machines = db.machines.filter((m: Machine) => m.id !== id);
        saveDb(db);
    }
  },

  assignMachineToUser: async (machineId: string, userId: string | null): Promise<void> => {
    if (USE_SUPABASE) {
        // Update Machine
        await supabase.from('machines').update({ assignedToUserId: userId }).eq('id', machineId);
        // Update User (Profile)
        if (userId) {
            await supabase.from('profiles').update({ assignedMachineId: machineId }).eq('id', userId);
        }
    } else {
        const db = getDb();
        const mIndex = db.machines.findIndex((m: Machine) => m.id === machineId);
        if (mIndex >= 0) db.machines[mIndex].assignedToUserId = userId;
        
        const uIndex = db.users.findIndex((u: User) => u.id === userId);
        if (uIndex >= 0) db.users[uIndex].assignedMachineId = machineId;
        saveDb(db);
    }
  },

  // --- Report Methods ---

  getAllReports: async (): Promise<Report[]> => {
    if (USE_SUPABASE) {
        const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false });
        return data as unknown as Report[] || [];
    } else {
        await new Promise(r => setTimeout(r, 600));
        const db = getDb();
        return db.reports.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  getReportById: async (id: string): Promise<Report | undefined> => {
    if (USE_SUPABASE) {
        const { data } = await supabase.from('reports').select('*').eq('id', id).single();
        return data as unknown as Report;
    } else {
        await new Promise(r => setTimeout(r, 400));
        const db = getDb();
        return db.reports.find((r: Report) => r.id === id);
    }
  },

  submitReport: async (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Report> => {
    if (USE_SUPABASE) {
        const newReport = {
            ...report,
            status: ReportStatus.PENDING,
            // Supabase handles created_at/updated_at defaults, but we send them for TS compat if needed
        };
        const { data, error } = await supabase.from('reports').insert(newReport).select().single();
        if(error) throw error;
        return data as unknown as Report;
    } else {
        await new Promise(r => setTimeout(r, 1000));
        const db = getDb();
        const newReport: Report = {
          ...report,
          id: uuidv4(),
          status: ReportStatus.PENDING,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.reports.push(newReport);
        saveDb(db);
        return newReport;
    }
  },

  updateReport: async (id: string, data: any): Promise<Report> => {
    if (USE_SUPABASE) {
         const { data: res, error } = await supabase.from('reports').update({
             ...data,
             status: ReportStatus.PENDING,
             updatedAt: new Date().toISOString()
         }).eq('id', id).select().single();
         if(error) throw error;
         return res as unknown as Report;
    } else {
        await new Promise(r => setTimeout(r, 800));
        const db = getDb();
        const index = db.reports.findIndex((r: Report) => r.id === id);
        if (index === -1) throw new Error("Report not found");
        
        const updatedReport = {
          ...db.reports[index],
          ...data,
          status: ReportStatus.PENDING, 
          updatedAt: new Date().toISOString()
        };
        db.reports[index] = updatedReport;
        saveDb(db);
        return updatedReport;
    }
  },

  reviewReport: async (id: string, status: ReportStatus, comments?: string): Promise<Report> => {
    if (USE_SUPABASE) {
        const updates: any = { status, updatedAt: new Date().toISOString() };
        if (comments) updates.adminComments = comments;
        
        const { data, error } = await supabase.from('reports').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as unknown as Report;
    } else {
        await new Promise(r => setTimeout(r, 800));
        const db = getDb();
        const index = db.reports.findIndex((r: Report) => r.id === id);
        if (index === -1) throw new Error("Report not found");

        const updatedReport = {
          ...db.reports[index],
          status,
          adminComments: comments || db.reports[index].adminComments,
          updatedAt: new Date().toISOString()
        };
        db.reports[index] = updatedReport;
        saveDb(db);
        return updatedReport;
    }
  }
};