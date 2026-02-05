
export enum Role {
  TECHNICIAN = 'TECHNICIAN',
  OWNER = 'OWNER',
  CONDO_ADMIN = 'CONDO_ADMIN'
}

export interface User {
  id: string;
  email?: string; 
  username?: string; 
  name: string;
  role: Role;
  assignedMachineId?: string; 
  phone?: string; 
}

export enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface ChecklistItemDefinition {
  id: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'photo' | 'textarea';
  required: boolean;
  section: 'weekly' | 'monthly' | 'special';
  reference?: string; 
  unit?: string; 
  min?: number; 
  max?: number; 
  private?: boolean; 
}

export interface ChecklistValue {
  itemId: string;
  value: string | number | boolean;
  photoUrl?: string; 
  comment?: string; 
}

export interface Report {
  id: string;
  machineId: string;
  technicianId: string; 
  technicianName: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  data: ChecklistValue[];
  adminComments?: string;
  type: 'weekly' | 'monthly' | 'special';
}

export interface Machine {
  id: string;
  location: string;
  lastMaintenance?: string;
  assignedToUserId?: string; 
  nextWeeklyVisit?: string; // Legacy: Mantener por compatibilidad
  nextMonthlyVisit?: string; // Legacy
}

export interface Visit {
  id: string;
  machineId: string;
  technicianId: string;
  technicianName: string;
  date: string; // YYYY-MM-DD
  type: 'weekly' | 'monthly';
  status: 'pending' | 'completed';
}

export interface ChartData {
  name: string;
  value: number;
}
