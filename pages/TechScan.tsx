import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Loader2, Camera, X, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/db';
import { Html5Qrcode } from 'html5-qrcode';

export const TechScan: React.FC = () => {
  const navigate = useNavigate();
  const [machineId, setMachineId] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Input para subir archivo (fallback)
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    // Limpieza agresiva al salir
    return () => {
      if (scannerRef.current) {
        try {
            if (scannerRef.current.isScanning) {
                scannerRef.current.stop().then(() => {
                    scannerRef.current?.clear();
                }).catch(console.warn);
            } else {
                scannerRef.current.clear().catch(console.warn);
            }
        } catch (e) { console.warn(e); }
      }
    };
  }, []);

  const startScanning = async () => {
      setError('');
      setScanning(true);

      // Verificación de HTTPS (Crucial para móviles)
      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
      if (!isSecure) {
          setError("Tu navegador bloquea la cámara porque la conexión no es segura (HTTPS). Usa la opción 'Subir Foto'.");
          setScanning(false);
          return;
      }

      // Pequeño delay para renderizar el div
      setTimeout(async () => {
          try {
              // 1. Solicitar permiso explícito primero (Fix para iOS/Android)
              // Esto despierta al navegador antes de que la librería intente cargar
              const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
              // Soltamos el stream inmediatamente, solo queríamos el permiso
              stream.getTracks().forEach(track => track.stop());

              // 2. Iniciar librería
              if (!scannerRef.current) {
                  scannerRef.current = new Html5Qrcode("reader");
              }

              const config = { 
                  fps: 10, 
                  qrbox: { width: 250, height: 250 },
                  aspectRatio: 1.0
              };

              await scannerRef.current.start(
                  { facingMode: "environment" }, 
                  config,
                  (decodedText) => {
                      handleProcessId(decodedText);
                      stopScanning();
                  },
                  (errorMessage) => {
                      // Ignorar errores por frame
                  }
              );
          } catch (err: any) {
              console.error("Error cámara:", err);
              let msg = "No se pudo iniciar la cámara.";
              if (err.name === 'NotAllowedError') msg = "Permiso de cámara denegado. Habilítalo en la configuración del navegador.";
              if (err.name === 'NotFoundError') msg = "No se encontró cámara trasera.";
              setError(msg);
              setScanning(false);
          }
      }, 200);
  };

  const stopScanning = async () => {
      if (scannerRef.current) {
          try {
              if (scannerRef.current.isScanning) {
                  await scannerRef.current.stop();
              }
              await scannerRef.current.clear();
          } catch (err) {
              console.warn("Stop error", err);
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
              setError(`ID "${cleanId}" no encontrado.`);
          }
      } catch (e) {
          setError("Error verificando máquina.");
      } finally {
          setLoading(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode("reader");
      }

      setLoading(true);
      scannerRef.current.scanFile(file, true)
        .then(decodedText => {
            handleProcessId(decodedText);
        })
        .catch(err => {
            console.error(err);
            setError("No se detectó ningún código QR válido en la imagen.");
            setLoading(false);
        });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) return;
    handleProcessId(machineId);
  };

  return (
    <div className="max-w-md mx-auto bg-white p-6 md:p-8 rounded-xl shadow-lg border border-slate-200 mt-6 md:mt-10">
      <div className="flex flex-col items-center mb-6">
        <div className={`p-4 rounded-full transition-all duration-300 ${scanning ? 'bg-indigo-100' : 'bg-slate-100'}`}>
          <QrCode className={`h-12 w-12 ${scanning ? 'text-indigo-600' : 'text-slate-600'}`} />
        </div>
        <h2 className="text-2xl font-bold mt-4">
          Escanear Máquina
        </h2>
        <p className="text-slate-500 text-center mt-2 text-sm">
          Apunta al código QR para registrar servicio.
        </p>
      </div>

      <div className="space-y-6">
        {/* Lector de QR */}
        {scanning ? (
            <div className="relative bg-black rounded-xl overflow-hidden shadow-inner">
                 <div id="reader" className="w-full min-h-[300px]"></div>
                 
                 <button 
                    onClick={stopScanning}
                    className="absolute top-3 right-3 z-20 bg-black/50 text-white p-2 rounded-full hover:bg-black/70 backdrop-blur-md"
                 >
                    <X className="h-5 w-5" />
                 </button>
                 
                 <div className="absolute bottom-4 left-0 right-0 text-center text-white/90 text-xs bg-black/40 py-1 backdrop-blur-sm mx-4 rounded-full">
                    Mantén el código centrado
                 </div>
            </div>
        ) : (
            <div className="space-y-3">
                <button
                    type="button"
                    onClick={startScanning}
                    className="w-full flex justify-center items-center py-4 px-4 rounded-xl shadow-md text-lg font-bold text-white bg-brand-600 hover:bg-brand-700 transition transform hover:scale-[1.02]"
                >
                    <Camera className="mr-2 h-6 w-6" />
                    Abrir Cámara
                </button>
                
                <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                />
                
                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex justify-center items-center py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold bg-white hover:bg-slate-50 transition"
                >
                    <ImageIcon className="mr-2 h-5 w-5 text-slate-500" />
                    Subir Foto de QR
                </button>
            </div>
        )}

        {error && (
            <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 flex items-start animate-in fade-in">
               <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
               <span>{error}</span>
            </div>
        )}

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">O manual</span>
            <div className="flex-grow border-t border-slate-200"></div>
        </div>

        <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
                <label htmlFor="machineId" className="sr-only">ID de Máquina</label>
                <input
                type="text"
                id="machineId"
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="block w-full px-4 py-3 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 font-mono tracking-wider text-center uppercase"
                placeholder="ID MANUAL (Ej: M-001)"
                disabled={loading}
                />
            </div>

            <button
                type="submit"
                disabled={!machineId || loading}
                className="w-full flex justify-center py-3 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 transition"
            >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : (
                    <>
                        Continuar
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                )}
            </button>
        </form>
        
        {/* Hidden div for file scan API requirement */}
        <div id="reader" className={scanning ? '' : 'hidden'}></div>
      </div>
    </div>
  );
};