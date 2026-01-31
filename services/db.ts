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
    ],
    users: [
      { id: 'u-owner', email: 'admin@agua24.com', password: '123', name: 'Propietario Principal', role: Role.OWNER, phone: '5215555555555' },
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
        
        let email = identifier.trim();
        // Lógica estricta: Si no tiene @, es usuario de condominio, agregar sufijo
        if (!email.includes('@')) {
            email = `${email}@agua24.app`;
        }

        console.log("Intentando login con:", email);

        const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
        });

        if (error) {
            console.error("Error de Supabase Auth:", error.message);
            return null;
        }

        if (!data.user) return null;

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

        if (profileError) return null; 
            
        return profile as User;

    } else {
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
        let finalEmail = user.email;
        // Logic de nombres: si es condominio y nos mandan un 'username' simple, construimos el email falso
        if (!finalEmail && user.username) {
            finalEmail = `${user.username}@agua24.app`;
        }
        
        if (!finalEmail) throw new Error("Se requiere email o usuario");

        console.log("Creando usuario:", finalEmail, "Tel:", user.phone);

        // Pasamos el teléfono al RPC
        const { data: newId, error } = await supabase.rpc('create_new_user', {
            email_input: finalEmail,
            password_input: user.password,
            name_input: user.name,
            role_input: user.role,
            username_input: user.username || null,
            phone_input: user.phone || null // Nuevo parámetro
        });

        if (error) {
            console.error("Error RPC:", error);
            throw new Error(error.message);
        }

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
        const { password, ...profileUpdates } = updates;
        const { data, error } = await supabase.from('profiles').update(profileUpdates).eq('id', id).select().single();
        if(error) throw error;
        return data as User;
    } else {
        await new Promise(r => setTimeout(r, 500));
        const db = getDb();
        const index = db.users.findIndex((u: User) => u.id === id);
        if (index === -1) throw new Error("Usuario no encontrado");
        
        const updatedUser = { ...db.users[index], ...updates };
        db.users[index] = updatedUser;
        saveDb(db);
        const { password, ...safeUser } = updatedUser;
        return safeUser;
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (USE_SUPABASE) {
        const { error } = await supabase.rpc('delete_user_completely', { target_user_id: id });
        if (error) throw error;
    } else {
        const db = getDb();
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
        return getDb().machines || [];
    }
  },

  getMachine: async (id: string): Promise<Machine | undefined> => {
    if (USE_SUPABASE) {
        const { data } = await supabase.from('machines').select('*').eq('id', id).single();
        return data as Machine;
    } else {
        return getDb().machines.find((m: Machine) => m.id === id);
    }
  },

  addMachine: async (machine: Machine): Promise<Machine> => {
    if (USE_SUPABASE) {
         const { data, error } = await supabase.from('machines').insert(machine).select().single();
         if(error) throw error;
         return data as Machine;
    } else {
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
        const db = getDb();
        db.machines = db.machines.filter((m: Machine) => m.id !== id);
        saveDb(db);
    }
  },

  assignMachineToUser: async (machineId: string, userId: string | null): Promise<void> => {
    if (USE_SUPABASE) {
        await supabase.from('machines').update({ assignedToUserId: userId }).eq('id', machineId);
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
        return getDb().reports;
    }
  },

  getReportById: async (id: string): Promise<Report | undefined> => {
    if (USE_SUPABASE) {
        const { data } = await supabase.from('reports').select('*').eq('id', id).single();
        return data as unknown as Report;
    } else {
        return getDb().reports.find((r: Report) => r.id === id);
    }
  },

  submitReport: async (report: Omit<Report, 'id' | 'createdAt' | 'updatedAt' | 'status'>): Promise<Report> => {
    if (USE_SUPABASE) {
        const newReport = {
            ...report,
            status: ReportStatus.PENDING,
        };
        const { data, error } = await supabase.from('reports').insert(newReport).select().single();
        if(error) throw error;
        return data as unknown as Report;
    } else {
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
        const db = getDb();
        const index = db.reports.findIndex((r: Report) => r.id === id);
        const updatedReport = { ...db.reports[index], ...data, status: ReportStatus.PENDING, updatedAt: new Date().toISOString() };
        db.reports[index] = updatedReport;
        saveDb(db);
        return updatedReport;
    }
  },

  reviewReport: async (id: string, status: ReportStatus, comments?: string): Promise<Report> => {
    if (USE_SUPABASE) {
        const updates: any = { status, updatedAt: new Date().toISOString() };
        if (comments) updates.adminComments = comments;
        
        // IMPORTANT: Ensure RLS allows update on public.reports for Owner
        const { data, error } = await supabase.from('reports').update(updates).eq('id', id).select().single();
        if (error) {
            console.error("Supabase Update Error:", error);
            throw error;
        }
        return data as unknown as Report;
    } else {
        const db = getDb();
        const index = db.reports.findIndex((r: Report) => r.id === id);
        const updatedReport = { ...db.reports[index], status, adminComments: comments || db.reports[index].adminComments, updatedAt: new Date().toISOString() };
        db.reports[index] = updatedReport;
        saveDb(db);
        return updatedReport;
    }
  }
};