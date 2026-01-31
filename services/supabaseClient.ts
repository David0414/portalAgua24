import { createClient } from '@supabase/supabase-js';

// ==========================================
// PASO 2: CONEXIÓN A BASE DE DATOS
// ==========================================
// Instrucciones:
// 1. Ve a Supabase -> Project Settings -> API.
// 2. Copia la "Project URL" y pégala abajo en la variable MANUAL_URL (dentro de las comillas).
// 3. Copia la "anon / public Key" y pégala abajo en la variable MANUAL_KEY.
// 4. ¡Listo! La app detectará automáticamente el cambio y dejará de usar datos falsos.

const MANUAL_URL = 'https://yhroajynuhrokzsegqup.supabase.co'; 
const MANUAL_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlocm9hanludWhyb2t6c2VncXVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk4NzIwNTIsImV4cCI6MjA4NTQ0ODA1Mn0.AW7dbmgowOVkjjXFrp6acPHBJvAv60dLGhsXGdVVFgo';

// ------------------------------------------------------------------
// Lógica de Autoconfiguración (No hace falta tocar esto)
// ------------------------------------------------------------------

// 1. Intentamos leer de variables de entorno (Vercel), si no, usamos las manuales.
const envUrl = (import.meta as any).env.VITE_SUPABASE_URL;
const envKey = (import.meta as any).env.VITE_SUPABASE_KEY;

const targetUrl = envUrl || MANUAL_URL;
const targetKey = envKey || MANUAL_KEY;

// 2. Detectamos si es una URL real de Supabase
const isValidUrl = targetUrl.includes('supabase.co') && !targetUrl.includes('TU_URL');

// 3. Exportamos la bandera para que el resto de la app sepa si usar DB real o Mock
export const USE_SUPABASE = isValidUrl;

// 4. Inicializamos el cliente
// Si estamos en modo Demo, usamos una URL ficticia pero válida sintácticamente para que no explote el inicio.
const finalUrl = isValidUrl ? targetUrl : 'https://demo.supabase.co';
const finalKey = isValidUrl ? targetKey : 'demo-key';

export const supabase = createClient(finalUrl, finalKey);