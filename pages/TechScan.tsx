import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Loader2, Camera, X, AlertTriangle } from 'lucide-react';
import { api } from '../services/db';
import { Html5QrcodeScanner } from 'html5-qrcode';

export const TechScan: React.FC = () => {
  const navigate = useNavigate();
  const [machineId, setMachineId] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let scanner: any = null;

    if (scanning) {
        // Inicializar el escáner cuando el estado scanning es true
        scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render(async (decodedText: string) => {
            // Éxito al escanear
            console.log("QR Code detected:", decodedText);
            
            // Limpiar escáner
            scanner.clear();
            setScanning(false);
            
            // Procesar ID
            handleProcessId(decodedText);
        }, (errorMessage: any) => {
            // Error de escaneo (común mientras busca, ignorar)
        });
    }

    return () => {
        if (scanner) {
            scanner.clear().catch((error: any) => console.error("Failed to clear scanner", error));
        }
    };
  }, [scanning]);

  const handleProcessId = async (id: string) => {
      setLoading(true);
      setError('');
      
      const cleanId = id.trim();
      setMachineId(cleanId); // Actualizar input visualmente

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
    <div className="max-w-md mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200 mt-10">
      <div className="flex flex-col items-center mb-8">
        <div className={`p-4 rounded-full transition-all duration-300 ${scanning ? 'bg-indigo-100' : 'bg-slate-100'}`}>
          <QrCode className={`h-12 w-12 ${scanning ? 'text-indigo-600' : 'text-slate-600'}`} />
        </div>
        <h2 className="text-2xl font-bold mt-4">
          Escanear Máquina
        </h2>
        <p className="text-slate-500 text-center mt-2">
          Escanea el código QR pegado en la máquina o ingresa su ID manualmente.
        </p>
      </div>

      <div className="space-y-6">
        {/* Lector de QR */}
        {scanning ? (
            <div className="bg-black rounded-lg overflow-hidden relative">
                 <button 
                    onClick={() => setScanning(false)}
                    className="absolute top-2 right-2 z-10 bg-white/20 p-2 rounded-full text-white hover:bg-white/40"
                 >
                    <X className="h-5 w-5" />
                 </button>
                 <div id="reader" className="w-full"></div>
                 <p className="text-white text-center text-xs py-2">Apunta la cámara al código QR</p>
            </div>
        ) : (
            <button
                type="button"
                onClick={() => setScanning(true)}
                className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md text-lg font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition transform hover:scale-[1.02]"
            >
                <Camera className="mr-2 h-6 w-6" />
                Activar Cámara
            </button>
        )}

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs uppercase font-bold">O ingresar ID</span>
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
                className="mt-1 block w-full px-3 py-2 border border-slate-300 rounded-lg shadow-sm focus:outline-none focus:ring-brand-500 focus:border-brand-500 uppercase"
                placeholder="Ej: M-001"
                disabled={loading}
                />
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200 flex items-center">
                   <AlertTriangle className="h-4 w-4 mr-2" />
                   {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!machineId || loading}
                className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
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