import { ChecklistItemDefinition } from './types';

export const WEEKLY_CHECKLIST: ChecklistItemDefinition[] = [
  // --- Limpieza ---
  { id: 'w1', label: 'Limpieza exterior de gabinete', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Polvo/Manchas' },
  { id: 'w2', label: 'Sanitización interna de ventana', type: 'boolean', required: true, section: 'weekly', reference: 'Desinfectado' },
  { id: 'w3', label: 'Limpieza general interior (Filtros, tuberías)', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Fugas/Suciedad' },
  
  // --- Calidad de Agua (Lecturas Únicas) ---
  // ACTUALIZADO: pH 6.5 a 8.5
  { id: 'w_ph', label: 'Lectura de pH', type: 'number', required: true, section: 'weekly', reference: '6.5 - 8.5', unit: 'pH', min: 6.5, max: 8.5 },
  { id: 'w_cl', label: 'Lectura de Cloro (Cl)', type: 'number', required: true, section: 'weekly', reference: '0.2 - 1.5', unit: 'mg/L', min: 0.2, max: 1.5 },
  { id: 'w_tds', label: 'Lectura de TDS (Sólidos Disueltos)', type: 'number', required: true, section: 'weekly', reference: '50 - 300', unit: 'ppm', min: 50, max: 300 },
  { id: 'w_hardness', label: 'Lectura de Dureza', type: 'number', required: true, section: 'weekly', reference: '< 200', unit: 'mg/L', max: 200 },

  // --- Sistema ---
  { id: 'w12', label: 'Revisión funcionamiento de bombas', type: 'boolean', required: true, section: 'weekly', reference: 'Operativo' },
  { id: 'w14', label: 'Acomodo de monedas en Hopper', type: 'boolean', required: true, section: 'weekly', reference: 'Lleno' },

  // --- Dinero y Ventas ---
  { id: 'w_exchange', label: 'Cambio ingresado (Monedas $1)', type: 'number', required: true, section: 'weekly', reference: 'Opcional', unit: 'MXN' },
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