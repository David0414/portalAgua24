import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Loader2, Camera, X, AlertTriangle, Image as ImageIcon, Zap } from 'lucide-react';
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

  // Auto-start scanning on mount for "Arrive & Scan" feel
  useEffect(() => {
    // Check if we can auto-start
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
    if (isSecure) {
        startScanning();
    }

    return () => {
      stopScanning();
    };
  }, []);

  const startScanning = async () => {
      setError('');
      setScanning(true);

      const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
      if (!isSecure) {
          setError("HTTPS requerido para cámara. Usa 'Subir Foto'.");
          setScanning(false);
          return;
      }

      setTimeout(async () => {
          try {
              if (!scannerRef.current) {
                  scannerRef.current = new Html5Qrcode("reader");
              }

              // Configuración optimizada para escaneo rápido
              const config = { 
                  fps: 15, 
                  qrbox: { width: 280, height: 280 },
                  aspectRatio: 1.0,
                  disableFlip: false
              };

              await scannerRef.current.start(
                  { facingMode: "environment" }, 
                  config,
                  (decodedText) => {
                      handleProcessId(decodedText);
                      stopScanning();
                  },
                  (errorMessage) => {
                      // Ignorar errores de frame vacíos
                  }
              );
          } catch (err: any) {
              console.warn("Auto-start camera failed:", err);
              // Si falla el auto-start, dejamos que el usuario lo intente manual o suba foto
              setScanning(false);
              if (err.name === 'NotAllowedError') setError("Permiso de cámara denegado.");
          }
      }, 300);
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
              // Sonido de éxito (opcional, visual feedback es mejor)
              if (navigator.vibrate) navigator.vibrate(200);
              navigate(`/tech/start/${cleanId}`);
          } else {
              setError(`Máquina "${cleanId}" no encontrada en el sistema.`);
              if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
          }
      } catch (e) {
          setError("Error de conexión verificando la máquina.");
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
            setError("No se detectó código QR en la imagen.");
            setLoading(false);
        });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!machineId) return;
    handleProcessId(machineId);
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      
      {/* Header específico de la tarea */}
      {!scanning && (
        <div className="text-center py-4">
            <h2 className="text-2xl font-bold text-slate-800">Escanear Máquina</h2>
            <p className="text-slate-500">Apunta al código QR del equipo</p>
        </div>
      )}

      {/* SCANNER VIEWPORT */}
      <div className={`relative rounded-2xl overflow-hidden shadow-2xl border-4 ${scanning ? 'border-blue-500' : 'border-slate-200'} bg-black transition-all duration-300`}>
           
           {/* Loading Overlay inside Scanner */}
           {loading && (
               <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm text-white animate-in fade-in">
                   <Loader2 className="h-12 w-12 animate-spin mb-4 text-blue-400" />
                   <p className="font-bold text-lg">Verificando Máquina...</p>
               </div>
           )}

           <div id="reader" className="w-full min-h-[350px] bg-black"></div>
           
           {scanning && (
               <>
                {/* Overlay Lines to simulate viewfinder */}
                <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-white/50 rounded-xl relative">
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-blue-500 -mt-1 -ml-1 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-blue-500 -mt-1 -mr-1 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-blue-500 -mb-1 -ml-1 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-blue-500 -mb-1 -mr-1 rounded-br-lg"></div>
                    </div>
                </div>
                <div className="absolute bottom-4 left-0 right-0 text-center z-20">
                    <p className="text-white/90 text-sm font-medium bg-black/40 inline-block px-4 py-1 rounded-full backdrop-blur-md">
                        Escaneando...
                    </p>
                </div>
                <button 
                    onClick={stopScanning}
                    className="absolute top-4 right-4 z-30 bg-white/20 text-white p-2 rounded-full hover:bg-white/30 backdrop-blur-md"
                >
                    <X className="h-6 w-6" />
                </button>
               </>
           )}

           {!scanning && !loading && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 z-10">
                   <QrCode className="h-16 w-16 text-slate-300 mb-4" />
                   <button
                        onClick={startScanning}
                        className="bg-blue-600 text-white px-8 py-3 rounded-full font-bold shadow-lg hover:bg-blue-700 flex items-center transform hover:scale-105 transition"
                    >
                        <Camera className="mr-2 h-5 w-5" />
                        Activar Cámara
                   </button>
               </div>
           )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start animate-in slide-in-from-top-2">
            <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <p className="text-red-700 font-medium text-sm">{error}</p>
        </div>
      )}

      {/* Manual Options */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-bold text-slate-400 uppercase mb-3 text-center">Opciones Alternativas</p>
          
          <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
              >
                  <ImageIcon className="h-6 w-6 text-slate-500 mb-2" />
                  <span className="text-xs font-bold text-slate-600">Subir Foto</span>
              </button>
              
              <div className="relative">
                  <input 
                    type="file" 
                    accept="image/*"
                    ref={fileInputRef}
                    className="hidden"
                    onChange={handleFileUpload}
                  />
              </div>

              <div className="col-span-2">
                <form onSubmit={handleManualSubmit} className="relative">
                    <input
                        type="text"
                        value={machineId}
                        onChange={(e) => setMachineId(e.target.value)}
                        className="w-full pl-4 pr-12 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-mono text-center uppercase placeholder:text-slate-300"
                        placeholder="ID MANUAL"
                    />
                    <button 
                        type="submit"
                        disabled={!machineId}
                        className="absolute right-1 top-1 bottom-1 bg-blue-600 text-white px-3 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition"
                    >
                        <ArrowRight className="h-5 w-5" />
                    </button>
                </form>
              </div>
          </div>
      </div>
    </div>
  );
};