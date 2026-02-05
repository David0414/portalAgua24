
import { ChecklistItemDefinition } from './types';

export const WEEKLY_CHECKLIST: ChecklistItemDefinition[] = [
  // --- Limpieza ---
  { id: 'w1', label: 'Limpieza exterior de gabinete', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Polvo/Manchas' },
  { id: 'w2', label: 'Sanitización interna de ventana', type: 'boolean', required: true, section: 'weekly', reference: 'Desinfectado' },
  { id: 'w3', label: 'Limpieza general interior (Filtros, tuberías)', type: 'boolean', required: true, section: 'weekly', reference: 'Sin Fugas/Suciedad' },
  
  // --- Calidad de Agua (Lecturas Únicas) ---
  { id: 'w_ph', label: 'pH (Potencial de Hidrógeno)', type: 'number', required: true, section: 'weekly', reference: '6.5 - 8.5', unit: 'pH', min: 6.5, max: 8.5 },
  { id: 'w_cl', label: 'Cloro (Cloro Libre)', type: 'number', required: true, section: 'weekly', reference: '0.2 - 1.5', unit: 'mg/L', min: 0.2, max: 1.5 },
  { id: 'w_tds', label: 'TDS (Sólidos Disueltos Totales)', type: 'number', required: true, section: 'weekly', reference: '50 - 300', unit: 'ppm', min: 50, max: 300 },
  { id: 'w_hardness', label: 'Dureza (Dureza Total)', type: 'number', required: true, section: 'weekly', reference: '< 200', unit: 'mg/L', max: 200 },

  // --- Sistema y Medidores ---
  { id: 'w_water_meter', label: 'Lectura Medidor de Agua (m³)', type: 'number', required: true, section: 'weekly', reference: 'Lectura', unit: 'm³' },
  { id: 'w_energy', label: 'Medidor de energía eléctrica', type: 'number', required: true, section: 'weekly', reference: 'Lectura', unit: 'kWh' },
  { id: 'w12', label: 'Revisión funcionamiento de bombas', type: 'boolean', required: true, section: 'weekly', reference: 'Operativo' },
  
  // --- Insumos ---
  { id: 'w_capping', label: 'Llenado de tapitas', type: 'boolean', required: true, section: 'weekly', reference: 'Lleno' },

  // --- PRIVADO (SOLO PROPIETARIO) ---
  { id: 'w14', label: 'Acomodo de monedas en Hopper', type: 'boolean', required: true, section: 'weekly', reference: 'Lleno', private: true },
  
  // --- Dinero y Ventas (PRIVADO) ---
  { id: 'w_exchange', label: 'Cambio ingresado (Monedas $1)', type: 'number', required: true, section: 'weekly', reference: 'Opcional', unit: 'MXN', private: true },
  
  // Ventas totales (Dinero)
  { id: 'w13', label: 'Ventas Totales ($)', type: 'number', required: true, section: 'weekly', reference: 'Foto Pantalla', unit: 'MXN', private: true },
  
  // Resetear Ventas (Nuevo Item Solicitado)
  { id: 'w_reset_sales', label: 'Resetear Ventas en Pantalla', type: 'boolean', required: true, section: 'weekly', reference: 'Realizado', private: true },
];

export const MONTHLY_CHECKLIST: ChecklistItemDefinition[] = [
  { id: 'm1', label: 'Revisión de sticker exterior', type: 'boolean', required: true, section: 'monthly', reference: 'Intacto' },
  { id: 'm2', label: 'Análisis Físico (Color)', type: 'text', required: true, section: 'monthly', reference: 'Incoloro' },
  { id: 'm3', label: 'Análisis Físico (Turbiedad)', type: 'text', required: true, section: 'monthly', reference: 'Cristalina' },
  { id: 'm4', label: 'Coliformes Totales', type: 'text', required: true, section: 'monthly', reference: 'Ausente / Negativo' },
  { id: 'm5', label: 'Revisión auditiva de bombas', type: 'boolean', required: true, section: 'monthly', reference: 'Sin ruidos extraños' },
  { id: 'm6', label: 'Revisión de fugas de agua', type: 'boolean', required: true, section: 'monthly', reference: 'Seco' },
];

export const SPECIAL_CHECKLIST: ChecklistItemDefinition[] = [
  { 
      id: 's_notes', 
      label: 'Descripción de Evento o Mantenimiento Especial', 
      type: 'textarea', 
      required: true, 
      section: 'special',
      reference: 'Detalles completos' 
  },
];