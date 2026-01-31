import { ChecklistItemDefinition } from './types';

export const WEEKLY_CHECKLIST: ChecklistItemDefinition[] = [
  { id: 'w1', label: 'Limpieza exterior de gabinete', type: 'boolean', required: true, section: 'weekly' },
  { id: 'w2', label: 'Sanitización interna de ventana y cubículo', type: 'boolean', required: true, section: 'weekly' },
  { id: 'w3', label: 'Limpieza general interior (filtros, tuberías)', type: 'boolean', required: true, section: 'weekly' },
  { id: 'w4', label: 'Lectura de PH (Antes)', type: 'number', required: true, section: 'weekly' },
  { id: 'w5', label: 'Lectura de PH (Después)', type: 'number', required: true, section: 'weekly' },
  { id: 'w6', label: 'Lectura de CL (Antes)', type: 'number', required: true, section: 'weekly' },
  { id: 'w7', label: 'Lectura de CL (Después)', type: 'number', required: true, section: 'weekly' },
  { id: 'w8', label: 'Lectura de TDS (Antes)', type: 'number', required: true, section: 'weekly' },
  { id: 'w9', label: 'Lectura de TDS (Después)', type: 'number', required: true, section: 'weekly' },
  { id: 'w10', label: 'Lectura de Dureza (Antes)', type: 'number', required: true, section: 'weekly' },
  { id: 'w11', label: 'Lectura de Dureza (Después)', type: 'number', required: true, section: 'weekly' },
  { id: 'w12', label: 'Revisión funcionamiento superficial (Bombeo, etc.)', type: 'boolean', required: true, section: 'weekly' },
  { id: 'w13', label: 'Retiro de ganancias', type: 'number', required: true, section: 'weekly' },
  { id: 'w14', label: 'Acomodo de monedas en Hopper', type: 'boolean', required: true, section: 'weekly' },
];

export const MONTHLY_CHECKLIST: ChecklistItemDefinition[] = [
  { id: 'm1', label: 'Revisión de sticker exterior', type: 'boolean', required: true, section: 'monthly' },
  { id: 'm2', label: 'Lectura Organolépticas y físicas (Color)', type: 'text', required: true, section: 'monthly' },
  { id: 'm3', label: 'Lectura Organolépticas y físicas (Turbiedad)', type: 'text', required: true, section: 'monthly' },
  { id: 'm4', label: 'Lectura de Coliformes Totales', type: 'text', required: true, section: 'monthly' },
  { id: 'm5', label: 'Revisión auditiva de bombas', type: 'boolean', required: true, section: 'monthly' },
  { id: 'm6', label: 'Revisión de fugas de agua', type: 'boolean', required: true, section: 'monthly' },
];

export const ADMIN_PHONE = "524426651403"; // Updated per request
