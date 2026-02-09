import React, { useEffect, useState } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export const InstallPWA: React.FC = () => {
  const [supportsPWA, setSupportsPWA] = useState(false);
  const [promptInstall, setPromptInstall] = useState<any>(null);
  const [isIOS, setIsIOS] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already dismissed the prompt in this session
    if (sessionStorage.getItem('pwa_dismissed')) return;

    const handler = (e: any) => {
      e.preventDefault();
      setPromptInstall(e);
      setSupportsPWA(true);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Detect iOS
    const isIosDevice = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;

    if (isIosDevice && !isStandalone) {
        setIsIOS(true);
        setIsVisible(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!promptInstall) {
      return;
    }
    promptInstall.prompt();
    promptInstall.userChoice.then((choiceResult: any) => {
        if (choiceResult.outcome === 'accepted') {
            setIsVisible(false);
        }
        setPromptInstall(null);
    });
  };

  const handleDismiss = () => {
      setIsVisible(false);
      sessionStorage.setItem('pwa_dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[100] animate-in slide-in-from-bottom-5 duration-500">
      <div className="bg-slate-900 text-white p-4 rounded-xl shadow-2xl flex flex-col md:flex-row items-center justify-between gap-4 border border-slate-700">
        
        <div className="flex items-center gap-3">
            <div className="bg-white p-1 rounded-lg">
                <img src="/logo.jpg" alt="Logo" className="w-10 h-10 object-contain rounded-md" />
            </div>
            <div>
                <h3 className="font-bold text-sm">Instalar Agua/24</h3>
                <p className="text-xs text-slate-400">Acceso rápido y pantalla completa.</p>
            </div>
        </div>

        {isIOS ? (
            <div className="text-xs text-slate-300 flex flex-col gap-1 items-end text-right">
                <div className="flex items-center gap-1">
                    1. Toca el botón compartir <Share className="h-3 w-3" />
                </div>
                <div className="flex items-center gap-1">
                    2. Selecciona "Agregar a Inicio" <PlusSquare className="h-3 w-3" />
                </div>
            </div>
        ) : (
            <button 
                onClick={handleInstallClick}
                className="bg-brand-600 hover:bg-brand-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center shadow-lg transition"
            >
                <Download className="h-4 w-4 mr-2" />
                Instalar App
            </button>
        )}

        <button 
            onClick={handleDismiss} 
            className="absolute top-2 right-2 p-1 text-slate-500 hover:text-white"
        >
            <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};