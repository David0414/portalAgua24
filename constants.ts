import { ChecklistItemDefinition } from './types';

export const WEEKLY_CHECKLIST: ChecklistItemDefinition[] = [
  { id: 'w1', label: 'Limpieza exterior de gabinete', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Polvo/Manchas' },
  { id: 'w2', label: 'Sanitización interna de ventana', type: 'boolean', required: true, section: 'weekly', reference: 'Desinfectado' },
  { id: 'w3', label: 'Limpieza general interior', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Fugas/Suciedad' },
  { id: 'w4', label: 'Lectura de PH (Entrada)', type: 'number', required: true, section: 'weekly', reference: '6.5 - 8.5', unit: 'pH' },
  { id: 'w5', label: 'Lectura de PH (Salida)', type: 'number', required: true, section: 'weekly', reference: '6.5 - 8.5', unit: 'pH' },
  { id: 'w6', label: 'Lectura de CL (Entrada)', type: 'number', required: true, section: 'weekly', reference: '0.2 - 1.5', unit: 'ppm' },
  { id: 'w7', label: 'Lectura de CL (Salida)', type: 'number', required: true, section: 'weekly', reference: '0.2 - 1.5', unit: 'ppm' },
  { id: 'w8', label: 'Lectura de TDS (Entrada)', type: 'number', required: true, section: 'weekly', reference: '< 500', unit: 'ppm' },
  { id: 'w9', label: 'Lectura de TDS (Salida)', type: 'number', required: true, section: 'weekly', reference: '< 100', unit: 'ppm' },
  { id: 'w10', label: 'Lectura de Dureza (Entrada)', type: 'number', required: true, section: 'weekly', reference: '< 200', unit: 'ppm' },
  { id: 'w11', label: 'Lectura de Dureza (Salida)', type: 'number', required: true, section: 'weekly', reference: '< 50', unit: 'ppm' },
  { id: 'w12', label: 'Revisión funcionamiento de bombas', type: 'boolean', required: true, section: 'weekly', reference: 'Operativo' },
  { id: 'w13', label: 'Retiro de ganancias', type: 'number', required: true, section: 'weekly', reference: 'N/A', unit: 'MXN' },
  { id: 'w14', label: 'Acomodo de monedas en Hopper', type: 'boolean', required: true, section: 'weekly', reference: 'Lleno' },
];

export const MONTHLY_CHECKLIST: ChecklistItemDefinition[] = [
  { id: 'm1', label: 'Revisión de sticker exterior', type: 'boolean', required: true, section: 'monthly', reference: 'Intacto' },
  { id: 'm2', label: 'Análisis Físico (Color)', type: 'text', required: true, section: 'monthly', reference: 'Incoloro' },
  { id: 'm3', label: 'Análisis Físico (Turbiedad)', type: 'text', required: true, section: 'monthly', reference: 'Cristalina' },
  { id: 'm4', label: 'Coliformes Totales', type: 'text', required: true, section: 'monthly', reference: 'Ausente / Negativo' },
  { id: 'm5', label: 'Revisión auditiva de bombas', type: 'boolean', required: true, section: 'monthly', reference: 'Sin ruidos extraños' },
  { id: 'm6', label: 'Revisión de fugas de agua', type: 'boolean', required: true, section: 'monthly', reference: 'Seco' },
];

export const ADMIN_PHONE = "524426651403"; // Updated per request