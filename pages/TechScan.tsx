import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Loader2, Camera, X, AlertTriangle, Image as ImageIcon, Zap, Calendar, MapPin, CheckCircle, Clock } from 'lucide-react';
import { api } from '../services/db';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../contexts/AuthContext';
import { Visit } from '../types';
import { format, parseISO, isToday, isTomorrow, isPast } from 'date-fns';
import { es } from 'date-fns/locale';

export const TechScan: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [machineId, setMachineId] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Schedule State
  const [myVisits, setMyVisits] = useState<Visit[]>([]);
  
  // Input para subir archivo (fallback)
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  // Auto-start scanning on mount for "Arrive & Scan" feel
  useEffect(() => {
    // Load Schedule
    if (user) {
        loadSchedule();
    }

    // Check if we can auto-start
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname.includes('127.0.0.1');
    if (isSecure) {
        startScanning();
    }

    return () => {
      stopScanning();
    };
  }, [user]);

  const loadSchedule = async () => {
      if(!user) return;
      // Fetch visits for this technician ID
      const visits = await api.getVisitsByTechnician(user.id);
      // Filter only future or today
      const upcoming = visits.filter(v => !isPast(parseISO(v.date)) || isToday(parseISO(v.date)));
      setMyVisits(upcoming);
  };

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
    <div className="max-w-md mx-auto space-y-8 pb-20">
      
      {/* SECTION 1: SCANNER */}
      <section>
          {!scanning && (
            <div className="text-center py-4">
                <h2 className="text-2xl font-bold text-slate-800">Iniciar Servicio</h2>
                <p className="text-slate-500">Escanea el QR para comenzar el checklist</p>
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
            <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg flex items-start animate-in slide-in-from-top-2 mt-4">
                <AlertTriangle className="h-5 w-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <p className="text-red-700 font-medium text-sm">{error}</p>
            </div>
          )}

          {/* Manual Options (Collapsed/Small) */}
          <div className="mt-4 flex justify-center space-x-4">
               <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-slate-400 font-bold hover:text-blue-600 flex items-center"
               >
                   <ImageIcon className="h-4 w-4 mr-1" /> Subir Foto
               </button>
               <input type="file" accept="image/*" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
          </div>
      </section>

      {/* SECTION 2: SCHEDULE */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 flex items-center">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" /> Mi Agenda
              </h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                  {myVisits.length}
              </span>
          </div>

          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
              {myVisits.length === 0 ? (
                  <div className="p-8 text-center text-slate-400">
                      <CheckCircle className="h-10 w-10 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">Todo al día. Sin visitas pendientes.</p>
                  </div>
              ) : (
                  myVisits.map(visit => {
                      const dateObj = parseISO(visit.date);
                      let dateLabel = format(dateObj, "dd MMM", { locale: es });
                      let statusColor = "bg-slate-100 text-slate-500";
                      
                      if (isToday(dateObj)) {
                          dateLabel = "HOY";
                          statusColor = "bg-green-100 text-green-700 border-green-200";
                      } else if (isTomorrow(dateObj)) {
                          dateLabel = "MAÑANA";
                          statusColor = "bg-blue-50 text-blue-600";
                      } else if (isPast(dateObj)) {
                          dateLabel = "ATRASADO";
                          statusColor = "bg-red-50 text-red-600";
                      }

                      return (
                          <div key={visit.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition cursor-pointer" onClick={() => handleProcessId(visit.machineId)}>
                              <div className="flex items-start space-x-3">
                                  <div className={`flex flex-col items-center justify-center w-12 h-12 rounded-lg border text-xs font-bold ${statusColor}`}>
                                      <span>{isToday(dateObj) || isTomorrow(dateObj) || isPast(dateObj) ? '' : format(dateObj, 'dd')}</span>
                                      <span className="text-[10px]">{dateLabel}</span>
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-800 text-sm">{visit.machineId}</p>
                                      <div className="flex items-center text-xs text-slate-500 mt-1">
                                          <MapPin className="h-3 w-3 mr-1" />
                                          <span className="truncate max-w-[150px]">Ver máquina...</span> 
                                      </div>
                                      <div className="mt-1">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded uppercase font-bold ${visit.type === 'monthly' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-500'}`}>
                                              {visit.type}
                                          </span>
                                      </div>
                                  </div>
                              </div>
                              <ArrowRight className="h-5 w-5 text-slate-300" />
                          </div>
                      );
                  })
              )}
          </div>
      </section>
    </div>
  );
};
