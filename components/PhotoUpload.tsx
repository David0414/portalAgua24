import React, { useRef, useState } from 'react';
import { Camera, X, Check, Loader2 } from 'lucide-react';

interface PhotoUploadProps {
  value?: string;
  onChange: (value: string) => void;
  label: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ value, onChange, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  // Helper to compress image
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1024; // Reducimos a un tamaño HD aceptable para reportes
          const MAX_HEIGHT = 1024;
          let width = img.width;
          let height = img.height;

          // Calcular nuevas dimensiones manteniendo aspecto
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          // Comprimir a JPEG calidad 0.7 (Reduce de 5MB a ~200KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      try {
        // Usamos la compresión antes de enviar
        const compressedBase64 = await compressImage(file);
        onChange(compressedBase64);
      } catch (error) {
        console.error("Error comprimiendo imagen", error);
        alert("Error al procesar la imagen. Intente de nuevo.");
      } finally {
        setLoading(false);
      }
    }
  };

  const clearPhoto = () => {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="mt-2">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      {!value ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={loading}
          className="flex items-center space-x-2 text-sm text-brand-600 font-medium hover:text-brand-700 bg-brand-50 px-3 py-2 rounded-lg border border-brand-200 transition-colors"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
          <span>{loading ? 'Comprimiendo...' : 'Tomar Foto'}</span>
        </button>
      ) : (
        <div className="relative inline-block mt-2">
          <img 
            src={value} 
            alt="Evidencia" 
            className="h-24 w-24 object-cover rounded-lg border-2 border-brand-500 shadow-sm" 
          />
          <button
            type="button"
            onClick={clearPhoto}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow hover:bg-red-600"
          >
            <X className="h-3 w-3" />
          </button>
          <div className="absolute bottom-0 right-0 bg-green-500 text-white rounded-full p-0.5 border border-white">
            <Check className="h-3 w-3" />
          </div>
        </div>
      )}
    </div>
  );
};