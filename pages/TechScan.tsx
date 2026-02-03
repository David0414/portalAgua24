import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Loader2, Camera, X, AlertTriangle } from 'lucide-react';
import { api } from '../services/db';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';

export const TechScan: React.FC = () => {
  const navigate = useNavigate();
  const [machineId, setMachineId] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Referencia a la instancia del scanner para poder limpiarla correctamente
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Limpieza al desmontar el componente (navegar fuera)
    return () => {
      if (scannerInstanceRef.current) {
        scannerInstanceRef.current.stop().then(() => {
            scannerInstanceRef.current?.clear();
        }).catch(err => console.error("Error stopping scanner cleanup", err));
      }
    };
  }, []);

  const startScanning = async () => {
      setScanning(true);
      setError('');

      // Pequeño delay para asegurar que el div "reader" existe en el DOM
      setTimeout(async () => {
          try {
              const html5QrCode = new Html5Qrcode("reader");
              scannerInstanceRef.current = html5QrCode;

              const config = { 
                  fps: 10, 
                  qrbox: { width: 250, height: 250 },
                  aspectRatio: 1.0
              };

              await html5QrCode.start(
                  { facingMode: "environment" }, // Usa la cámara trasera
                  config,
                  (decodedText) => {
                      // Éxito al leer
                      console.log("QR Code detected:", decodedText);
                      stopScanning(); // Detener cámara
                      handleProcessId(decodedText);
                  },
                  (errorMessage) => {
                      // Error de lectura por frame (ignorar para no saturar consola)
                  }
              );
          } catch (err) {
              console.error("Error starting scanner", err);
              setError("No se pudo acceder a la cámara. Verifica los permisos en tu navegador.");
              setScanning(false);
          }
      }, 100);
  };

  const stopScanning = async () => {
      if (scannerInstanceRef.current) {
          try {
              await scannerInstanceRef.current.stop();
              await scannerInstanceRef.current.clear();
              scannerInstanceRef.current = null;
          } catch (err) {
              console.error("Failed to stop scanner", err);
          }
      }
      setScanning(false);
  };

  const handleProcessId = async (id: string) => {
      setLoading(true);
      setError('');
      
      const cleanId = id.trim();
      setMachineId(cleanId); 

      try {
          const machine = await api.getMachine(cleanId);
          if (machine) {
              navigate(`/tech/start/${cleanId}`);
          } else {
              setError(`La máquina con ID "${cleanId}" no existe en el sistema.`);
          }
      } catch (e) {
          setError("Error de conexión al verificar la máquina.");
      } finally {
          setLoading(false);
      }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) return;
    handleProcessId(machineId);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200 mt-6 md:mt-10">
      <div className="flex flex-col items-center mb-8">
        <div className={`p-4 rounded-full transition-all duration-300 ${scanning ? 'bg-indigo-100' : 'bg-slate-100'}`}>
          <QrCode className={`h-12 w-12 ${scanning ? 'text-indigo-600' : 'text-slate-600'}`} />
        </div>
        <h2 className="text-2xl font-bold mt-4">
          Escanear Máquina
        </h2>
        <p className="text-slate-500 text-center mt-2 text-sm">
          Apunta tu cámara al código QR de la unidad.
        </p>
      </div>

      <div className="space-y-6">
        {/* Lector de QR */}
        {scanning ? (
            <div className="relative">
                 <div id="reader" className="w-full rounded-lg overflow-hidden bg-black min-h-[300px]"></div>
                 <button 
                    onClick={stopScanning}
                    className="absolute top-2 right-2 z-20 bg-white/20 p-2 rounded-full text-white hover:bg-white/40 backdrop-blur-sm border border-white/30"
                 >
                    <X className="h-5 w-5" />
                 </button>
                 <div className="absolute bottom-4 left-0 right-0 text-center text-white text-xs bg-black/50 py-1">
                    Escaneando... Mantén el código centrado
                 </div>
            </div>
        ) : (
            <button
                type="button"
                onClick={startScanning}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md text-lg font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition transform hover:scale-[1.02]"
            >
                <Camera className="mr-2 h-6 w-6" />
                Activar Cámara
            </button>
        )}

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">O ingresar manualmente</span>
            <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
                <label htmlFor="machineId" className="block text-sm font-medium text-slate-700">
                ID de Máquina
                </label>
                <input
                type="text"
                id="machineId"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 uppercase font-mono tracking-wider"
                placeholder="Ej: M-001"
                disabled={loading}
                />
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 flex items-center animate-in fade-in slide-in-from-top-2">
                   <AlertTriangle className="h-4 w-4 mr-2 flex-shrink-0" />
                   {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!machineId || loading}
                className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50 transition"
            >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <>
                        Continuar
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
            </button>
        </form>
      </div>
    </div>
  );
};