export enum Role {
  TECHNICIAN = 'TECHNICIAN',
  OWNER = 'OWNER',
  CONDO_ADMIN = 'CONDO_ADMIN'
}

export interface User {
  id: string;
  email?: string; // Optional now
  username?: string; // New field for Condo Login
  name: string;
  role: Role;
  assignedMachineId?: string; // For Condo Admins
  phone?: string; // Added for WhatsApp notifications
}

export enum ReportStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export interface ChecklistItemDefinition {
  id: string;
  label: string;
  type: 'boolean' | 'number' | 'text' | 'photo';
  required: boolean;
  section: 'weekly' | 'monthly';
}

export interface ChecklistValue {
  itemId: string;
  value: string | number | boolean;
  photoUrl?: string; // URL or Base64 for preview
}

export interface Report {
  id: string;
  machineId: string;
  technicianId: string; // Phone number or ID
  technicianName: string;
  status: ReportStatus;
  createdAt: string;
  updatedAt: string;
  data: ChecklistValue[];
  adminComments?: string;
  type: 'weekly' | 'monthly';
}

export interface Machine {
  id: string;
  location: string;
  lastMaintenance?: string;
  assignedToUserId?: string; // Link machine to a specific condo user
}

// Mock Data for Charting
export interface ChartData {
  name: string;
  value: number;
}