import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { QrCode, ArrowRight, Loader2, Camera } from 'lucide-react';
import { api } from '../services/db';

export const TechScan: React.FC = () => {
  const navigate = useNavigate();
  const [machineId, setMachineId] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);

  // NOTE: For Real QR Scanning
  // 1. Install 'html5-qrcode': npm install html5-qrcode
  // 2. Import Html5QrcodeScanner
  // 3. Render the scanner in a div with id="reader"
  
  const handleScanClick = () => {
    setScanning(true);
    // Here you would initialize the real camera scanner.
    // For now, in this standard version, we toggle the UI to prompt manual entry 
    // or indicate camera permissions would be requested here.
    setError("Para usar el escáner real, se requiere instalar la librería 'html5-qrcode'. Por favor ingrese el ID manualmente.");
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    setScanning(true); // Show loading state
    const machine = await api.getMachine(machineId);
    setScanning(false);
    
    if (machine) {
      navigate(`/tech/start/${machineId}`);
    } else {
      setError('Máquina no encontrada. Verifique el ID.');
    }
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
          Ingrese el ID de la máquina o use el código QR.
        </p>
      </div>

      <div className="space-y-6">
        {/* Placeholder for QR Camera */}
        {scanning && (
            <div id="reader" className="bg-black rounded-lg h-64 flex items-center justify-center text-white mb-4">
                <div className="text-center p-4">
                   <Camera className="h-10 w-10 mx-auto mb-2 opacity-50" />
                   <p className="text-sm">Vista de Cámara</p>
                   <p className="text-xs text-slate-400 mt-2">(Requiere integración de librería)</p>
                </div>
            </div>
        )}

        <button
            type="button"
            onClick={handleScanClick}
            className="w-full flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-md text-lg font-bold text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 transition transform hover:scale-[1.02]"
        >
            <QrCode className="mr-2 h-6 w-6" />
            Activar Cámara
        </button>

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
                autoFocus
                />
            </div>

            {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-200">
                {error}
                </div>
            )}

            <button
                type="submit"
                disabled={!machineId}
                className="w-full flex justify-center py-2 px-4 border border-slate-300 rounded-lg shadow-sm text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
            >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
            </button>
        </form>
      </div>
    </div>
  );
};