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
  return { reports: [], machines: [], users: [] };
};

const saveDb = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

if (!USE_SUPABASE) getDb();

// ==========================================
// UNIFIED API SERVICE
// ==========================================

export const api = {
  // --- Auth Methods (MODO "SOLO DB") ---
  
  login: async (identifier: string, password: string): Promise<User | null> => {
    if (USE_SUPABASE) {
        try {
            let email = identifier.trim();
            if (!email.includes('@')) {
                // Buscamos por el nombre de usuario
            }

            console.log("🔍 Buscando usuario en tabla app_users:", email);

            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .or(`email.eq.${email},email.eq.${email}@agua24.app`) 
                .eq('password', password.trim()) 
                .single();

            if (error) {
                console.error("Error DB Login:", error);
                if (error.code === 'PGRST116') { 
                     alert("Usuario o contraseña incorrectos.");
                } else {
                     alert(`Error de conexión: ${error.message}`);
                }
                return null;
            }

            if (data) {
                return {
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    role: data.role as Role,
                    phone: data.phone,
                    assignedMachineId: data.assignedMachineId,
                    username: data.email.includes('@agua24.app') ? data.email.split('@')[0] : undefined
                };
            }
            return null;

        } catch (err: any) {
            console.error("Excepción Login:", err);
            alert("Error desconocido intentando conectar.");
            return null;
        }

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
        const { data } = await supabase.from('app_users').select('*');
        return data as User[] || [];
    } else {
        const db = getDb();
        return db.users.map(({ password, ...u }: any) => u);
    }
  },

  createUser: async (user: Omit<User, 'id'> & { password: string, assignedMachineId?: string }): Promise<User> => {
    if (USE_SUPABASE) {
        let finalEmail = user.email;
        if (!finalEmail && user.username) {
            finalEmail = user.username; 
        }
        
        if (!finalEmail) throw new Error("Se requiere email o usuario");

        const newUserPayload = {
            email: finalEmail,
            password: user.password.trim(),
            name: user.name,
            role: user.role,
            phone: user.phone || null,
            assignedMachineId: user.assignedMachineId || null
        };

        const { data, error } = await supabase
            .from('app_users')
            .insert(newUserPayload)
            .select()
            .single();

        if (error) {
            console.error("Error insertando usuario:", error);
            throw new Error(`No se pudo crear: ${error.message}`);
        }

        return data as User;

    } else {
        const db = getDb();
        const newUser = { ...user, id: `u-${uuidv4()}` };
        db.users.push(newUser);
        saveDb(db);
        const { password, ...safeUser } = newUser;
        return safeUser;
    }
  },

  createProfileOnly: async (user: Omit<User, 'id'> & { uid: string, assignedMachineId?: string }): Promise<User> => {
      throw new Error("En modo Base de Datos Directa, usa 'Crear Usuario (Auto)'");
  },

  updateUser: async (id: string, updates: Partial<User & { password?: string }>): Promise<User> => {
    if (USE_SUPABASE) {
        const { ...fieldsToUpdate } = updates;
        const { data, error } = await supabase.from('app_users').update(fieldsToUpdate).eq('id', id).select().single();
        if(error) throw error;
        return data as User;
    } else {
        const db = getDb();
        const index = db.users.findIndex((u: User) => u.id === id);
        const updatedUser = { ...db.users[index], ...updates };
        db.users[index] = updatedUser;
        saveDb(db);
        const { password, ...safeUser } = updatedUser;
        return safeUser;
    }
  },

  deleteUser: async (id: string): Promise<void> => {
    if (USE_SUPABASE) {
        const { error } = await supabase.from('app_users').delete().eq('id', id);
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

  updateMachine: async (id: string, updates: Partial<Machine>): Promise<Machine> => {
    if (USE_SUPABASE) {
         const { data, error } = await supabase.from('machines').update(updates).eq('id', id).select().single();
         if(error) throw error;
         return data as Machine;
    } else {
        const db = getDb();
        const index = db.machines.findIndex((m: Machine) => m.id === id);
        if (index !== -1) {
            const updatedMachine = { ...db.machines[index], ...updates };
            db.machines[index] = updatedMachine;
            saveDb(db);
            return updatedMachine;
        }
        throw new Error("Machine not found");
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
        if (userId) {
            await supabase.from('app_users').update({ assignedMachineId: machineId }).eq('id', userId);
        }
        await supabase.from('machines').update({ assignedToUserId: userId }).eq('id', machineId);
    } else {
        const db = getDb();
        const mIndex = db.machines.findIndex((m: Machine) => m.id === machineId);
        if (mIndex >= 0) db.machines[mIndex].assignedToUserId = userId;
        saveDb(db);
    }
  },

  // --- Report Methods (CORREGIDO PARA TOTALES) ---

  // Se eliminó el límite por defecto para asegurar que los cálculos de totales (dinero) sean correctos.
  // La paginación visual se manejará en el frontend.
  getAllReports: async (): Promise<Report[]> => {
    if (USE_SUPABASE) {
        const { data, error } = await supabase
            .from('reports')
            .select('*')
            .order('createdAt', { ascending: false });
        
        if (error) {
            console.error("Error al obtener reportes:", error);
            return [];
        }
        return data as unknown as Report[] || [];
    } else {
        const reports = getDb().reports;
        return reports.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  // Método específico para el Dashboard de Condominio (Optimizado)
  getReportsByMachine: async (machineId: string, limit: number = 100): Promise<Report[]> => {
     if (USE_SUPABASE) {
         const { data, error } = await supabase
             .from('reports')
             .select('*')
             .eq('machineId', machineId)
             .order('createdAt', { ascending: false })
             .limit(limit);
         
         if (error) return [];
         return data as unknown as Report[] || [];
     } else {
         const reports = getDb().reports.filter((r: Report) => r.machineId === machineId);
         return reports.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
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
        
        const { data, error } = await supabase.from('reports').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as unknown as Report;
    } else {
        const db = getDb();
        const index = db.reports.findIndex((r: Report) => r.id === id);
        const updatedReport = { ...db.reports[index], status, adminComments: comments || db.reports[index].adminComments, updatedAt: new Date().toISOString() };
        db.reports[index] = updatedReport;
        saveDb(db);
        return updatedReport;
    }
  },

  deleteReport: async (id: string): Promise<void> => {
      if (USE_SUPABASE) {
          const { error } = await supabase.from('reports').delete().eq('id', id);
          if (error) throw error;
      } else {
          const db = getDb();
          db.reports = db.reports.filter((r: Report) => r.id !== id);
          saveDb(db);
      }
  }
};