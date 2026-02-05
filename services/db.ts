import { Report, ReportStatus, Machine, User, Role, Visit } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { supabase, USE_SUPABASE } from './supabaseClient';

const STORAGE_KEY = 'aquacheck_db_v3';

// ==========================================
// MOCK DATA IMPLEMENTATION (Local Storage)
// ==========================================
const getDb = () => {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  return { reports: [], machines: [], users: [], visits: [] };
};

const saveDb = (data: any) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

if (!USE_SUPABASE) {
    // Inicializar visits si no existe en mock antiguo
    const db = getDb();
    if (!db.visits) {
        db.visits = [];
        saveDb(db);
    }
}

// ==========================================
// UNIFIED API SERVICE
// ==========================================

export const api = {
  // --- Auth Methods ---
  login: async (identifier: string, password: string): Promise<User | null> => {
    if (USE_SUPABASE) {
        try {
            let email = identifier.trim();
            const { data, error } = await supabase
                .from('app_users')
                .select('*')
                .or(`email.eq.${email},email.eq.${email}@agua24.app`) 
                .eq('password', password.trim()) 
                .single();

            if (error) return null;
            if (data) {
                return {
                    id: data.id,
                    email: data.email,
                    name: data.name,
                    role: data.role as Role,
                    phone: data.phone,
                    assignedMachineId: data.assignedMachineId,
                    username: data.email.includes('@') ? undefined : data.email
                };
            }
            return null;
        } catch (err: any) {
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
        if (!data) return [];
        return data.map((u: any) => ({
            ...u,
            username: (u.role === 'CONDO_ADMIN' || !u.email.includes('@')) ? u.email : undefined
        })) as User[];
    } else {
        const db = getDb();
        return db.users.map(({ password, ...u }: any) => u);
    }
  },

  createUser: async (user: Omit<User, 'id'> & { password: string, assignedMachineId?: string }): Promise<User> => {
    if (USE_SUPABASE) {
        let finalEmail = user.email;
        if (!finalEmail && user.username) finalEmail = user.username;
        if (!finalEmail) throw new Error("Se requiere email o usuario");

        const newUserPayload = {
            email: finalEmail,
            password: user.password.trim(), 
            name: user.name,
            role: user.role,
            phone: user.phone || null,
            assignedMachineId: user.assignedMachineId || null
        };
        const { data, error } = await supabase.from('app_users').insert(newUserPayload).select().single();
        if (error) throw new Error(`No se pudo crear: ${error.message}`);
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
  
  createProfileOnly: async (user: any): Promise<User> => { throw new Error("Deprecated"); },

  updateUser: async (id: string, updates: Partial<User & { password?: string }>): Promise<User> => {
    if (USE_SUPABASE) {
        const fieldsToUpdate: any = { ...updates };
        if (fieldsToUpdate.username) fieldsToUpdate.email = fieldsToUpdate.username;
        delete fieldsToUpdate.username;
        if (fieldsToUpdate.email === undefined) delete fieldsToUpdate.email;

        const { data, error } = await supabase.from('app_users').update(fieldsToUpdate).eq('id', id).select().single();
        if(error) throw error;
        const updatedUser = data as any;
        return { ...updatedUser, username: updatedUser.role === 'CONDO_ADMIN' ? updatedUser.email : undefined } as User;
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
        await supabase.from('app_users').delete().eq('id', id);
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
        if (userId) await supabase.from('app_users').update({ assignedMachineId: machineId }).eq('id', userId);
        await supabase.from('machines').update({ assignedToUserId: userId }).eq('id', machineId);
    } else {
        const db = getDb();
        const mIndex = db.machines.findIndex((m: Machine) => m.id === machineId);
        if (mIndex >= 0) db.machines[mIndex].assignedToUserId = userId;
        saveDb(db);
    }
  },

  // --- Visits Methods (PROGRAMACIÓN) ---
  
  getVisits: async (): Promise<Visit[]> => {
      if (USE_SUPABASE) {
          const { data } = await supabase.from('visits').select('*').order('date', { ascending: true });
          return data as Visit[] || [];
      } else {
          return getDb().visits || [];
      }
  },

  getVisitsByMachine: async (machineId: string): Promise<Visit[]> => {
      if (USE_SUPABASE) {
          const { data } = await supabase.from('visits').select('*').eq('machineId', machineId).order('date', { ascending: true });
          return data as Visit[] || [];
      } else {
          const db = getDb();
          return (db.visits || []).filter((v: Visit) => v.machineId === machineId).sort((a:Visit, b:Visit) => a.date.localeCompare(b.date));
      }
  },

  getVisitsByTechnician: async (technicianId: string): Promise<Visit[]> => {
      // Nota: Aquí se asume technicianId como el ID interno (UUID), no el teléfono.
      // Si usas el teléfono, ajusta según tu lógica de usuarios.
      if (USE_SUPABASE) {
          const { data } = await supabase.from('visits').select('*').eq('technicianId', technicianId).order('date', { ascending: true });
          return data as Visit[] || [];
      } else {
          const db = getDb();
          return (db.visits || []).filter((v: Visit) => v.technicianId === technicianId).sort((a:Visit, b:Visit) => a.date.localeCompare(b.date));
      }
  },

  addVisit: async (visit: Omit<Visit, 'id'>): Promise<Visit> => {
      if (USE_SUPABASE) {
          const { data, error } = await supabase.from('visits').insert(visit).select().single();
          if (error) throw error;
          return data as Visit;
      } else {
          const db = getDb();
          const newVisit = { ...visit, id: uuidv4() };
          if (!db.visits) db.visits = [];
          db.visits.push(newVisit);
          saveDb(db);
          return newVisit;
      }
  },

  deleteVisit: async (id: string): Promise<void> => {
      if (USE_SUPABASE) {
          await supabase.from('visits').delete().eq('id', id);
      } else {
          const db = getDb();
          db.visits = db.visits.filter((v: Visit) => v.id !== id);
          saveDb(db);
      }
  },

  // --- Report Methods ---

  getAllReports: async (): Promise<Report[]> => {
    if (USE_SUPABASE) {
        const { data, error } = await supabase.from('reports').select('*').order('createdAt', { ascending: false });
        if (error) return [];
        return data as unknown as Report[] || [];
    } else {
        const reports = getDb().reports;
        return reports.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  },

  getReportsByMachine: async (machineId: string, limit: number = 100): Promise<Report[]> => {
     if (USE_SUPABASE) {
         const { data, error } = await supabase.from('reports').select('*').eq('machineId', machineId).order('createdAt', { ascending: false }).limit(limit);
         if (error) return [];
         return data as unknown as Report[] || [];
     } else {
         const reports = getDb().reports.filter((r: Report) => r.machineId === machineId);
         return reports.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, limit);
     }
  },
  
  getReportsByTechnician: async (technicianId: string): Promise<Report[]> => {
      // technicianId aquí suele ser el teléfono, según cómo se guarda en TechForm
      if (USE_SUPABASE) {
          const { data, error } = await supabase.from('reports').select('*').eq('technicianId', technicianId).order('createdAt', { ascending: false });
          if (error) return [];
          return data as unknown as Report[] || [];
      } else {
          const reports = getDb().reports.filter((r: Report) => r.technicianId === technicianId);
          return reports.sort((a: Report, b: Report) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
  },

  // NEW FAST METHOD: Solo trae los rechazados, mucho más rápido que traer todo el historial
  getRejectedReportsByTechnician: async (technicianId: string): Promise<Report[]> => {
      if (USE_SUPABASE) {
          const { data, error } = await supabase
            .from('reports')
            .select('*')
            .eq('technicianId', technicianId)
            .eq('status', ReportStatus.REJECTED)
            .order('createdAt', { ascending: false });
            
          if (error) return [];
          return data as unknown as Report[] || [];
      } else {
          const reports = getDb().reports.filter((r: Report) => r.technicianId === technicianId && r.status === ReportStatus.REJECTED);
          return reports;
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
        const newReport = { ...report, status: ReportStatus.PENDING };
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

  reviewReport: async (id: string, status: ReportStatus, comments?: string, showInCondo?: boolean): Promise<Report> => {
    if (USE_SUPABASE) {
        const updates: any = { status, updatedAt: new Date().toISOString() };
        if (comments) updates.adminComments = comments;
        if (showInCondo !== undefined) updates.showInCondo = showInCondo;

        const { data, error } = await supabase.from('reports').update(updates).eq('id', id).select().single();
        if (error) throw error;
        return data as unknown as Report;
    } else {
        const db = getDb();
        const index = db.reports.findIndex((r: Report) => r.id === id);
        const updatedReport = { 
            ...db.reports[index], 
            status, 
            adminComments: comments || db.reports[index].adminComments,
            updatedAt: new Date().toISOString()
        };
        if (showInCondo !== undefined) updatedReport.showInCondo = showInCondo;
        
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