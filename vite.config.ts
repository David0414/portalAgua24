import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/', 
  // Eliminamos optimizeDeps.exclude masivo porque causaba que React no cargara (pantalla blanca).
  // Vite manejará las dependencias automáticamente.
  build: {
    outDir: 'dist',
    sourcemap: false, // Desactiva sourcemaps en build para evitar advertencias
    chunkSizeWarningLimit: 1600,
  },
  server: {
    port: 3000,
    // Esto ayuda a evitar que Vite se queje de los sourcemaps faltantes de librerías externas en la consola
    sourcemapIgnoreList: (sourcePath) => sourcePath.includes('node_modules'),
  }
});