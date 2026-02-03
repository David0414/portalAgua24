import { ChecklistItemDefinition } from './types';

export const WEEKLY_CHECKLIST: ChecklistItemDefinition[] = [
  // --- Limpieza ---
  { id: 'w1', label: 'Limpieza exterior de gabinete', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Polvo/Manchas' },
  { id: 'w2', label: 'Sanitización interna de ventana', type: 'boolean', required: true, section: 'weekly', reference: 'Desinfectado' },
  { id: 'w3', label: 'Limpieza general interior (Filtros, tuberías)', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Fugas/Suciedad' },
  
  // --- Calidad de Agua (Valores Exactos de Imagen) ---
  { id: 'w4', label: 'Lectura de PH (Entrada)', type: 'number', required: true, section: 'weekly', reference: '6.8 - 7.8', unit: 'pH', min: 6.8, max: 7.8 },
  { id: 'w5', label: 'Lectura de PH (Salida)', type: 'number', required: true, section: 'weekly', reference: '6.8 - 7.8', unit: 'pH', min: 6.8, max: 7.8 },
  
  { id: 'w6', label: 'Lectura de CL (Entrada)', type: 'number', required: true, section: 'weekly', reference: '0.2 - 1.5', unit: 'mg/L', min: 0.2, max: 1.5 },
  { id: 'w7', label: 'Lectura de CL (Salida)', type: 'number', required: true, section: 'weekly', reference: '0.2 - 1.5', unit: 'mg/L', min: 0.2, max: 1.5 },
  
  // Ajuste preciso texto TDS según imagen
  { id: 'w8', label: 'Lectura de TDS (Entrada)', type: 'number', required: true, section: 'weekly', reference: '50-300 (Excelente/Muy Buena)', unit: 'mg/L', min: 50, max: 300 },
  { id: 'w9', label: 'Lectura de TDS (Salida)', type: 'number', required: true, section: 'weekly', reference: '50-300 (Excelente/Muy Buena)', unit: 'mg/L', min: 50, max: 300 },
  
  { id: 'w10', label: 'Lectura de Dureza (Entrada)', type: 'number', required: true, section: 'weekly', reference: '< 180', unit: 'mg/L', max: 180 },
  { id: 'w11', label: 'Lectura de Dureza (Salida)', type: 'number', required: true, section: 'weekly', reference: '< 180', unit: 'mg/L', max: 180 },

  // --- Sistema ---
  { id: 'w12', label: 'Revisión funcionamiento de bombas', type: 'boolean', required: true, section: 'weekly', reference: 'Operativo' },
  { id: 'w14', label: 'Acomodo de monedas en Hopper', type: 'boolean', required: true, section: 'weekly', reference: 'Lleno' },

  // --- Dinero y Ventas ---
  { id: 'w_exchange', label: 'Cambio ingresado (Monedas $1)', type: 'number', required: true, section: 'weekly', reference: 'Foto Obligatoria', unit: 'MXN' },
  { id: 'w_sales_count', label: 'Ventas de la semana (Cantidad)', type: 'number', required: true, section: 'weekly', reference: 'Lectura Pantalla', unit: 'Ventas' },
  { id: 'w13', label: 'Ingreso Total Semanal ($)', type: 'number', required: true, section: 'weekly', reference: 'Foto Pantalla', unit: 'MXN' },

  // --- Tapado ---
  { id: 'w_capping', label: 'Proceso de Tapado', type: 'boolean', required: true, section: 'weekly', reference: 'Verificado' },
  
  { id: 'w_energy', label: 'Medidor de energía eléctrica', type: 'number', required: true, section: 'weekly', reference: 'Lectura', unit: 'kWh' },
];

export const MONTHLY_CHECKLIST: ChecklistItemDefinition[] = [
  { id: 'm1', label: 'Revisión de sticker exterior', type: 'boolean', required: true, section: 'monthly', reference: 'Intacto' },
  { id: 'm2', label: 'Análisis Físico (Color)', type: 'text', required: true, section: 'monthly', reference: 'Incoloro' },
  { id: 'm3', label: 'Análisis Físico (Turbiedad)', type: 'text', required: true, section: 'monthly', reference: 'Cristalina' },
  { id: 'm4', label: 'Coliformes Totales', type: 'text', required: true, section: 'monthly', reference: 'Ausente / Negativo' },
  { id: 'm5', label: 'Revisión auditiva de bombas', type: 'boolean', required: true, section: 'monthly', reference: 'Sin ruidos extraños' },
  { id: 'm6', label: 'Revisión de fugas de agua', type: 'boolean', required: true, section: 'monthly', reference: 'Seco' },
];