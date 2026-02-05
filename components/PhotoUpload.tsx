import React, { useRef, useState } from 'react';
import { Camera, X, Plus, Loader2 } from 'lucide-react';

interface PhotoUploadProps {
  values?: string[]; // Array of base64 strings
  onChange: (values: string[]) => void;
  label: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ values = [], onChange, label }) => {
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
          // OPTIMIZATION: Reduced from 1024 to 800 to save DB space
          const MAX_WIDTH = 800; 
          const MAX_HEIGHT = 800;
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
          
          // OPTIMIZATION: Compressed to JPEG quality 0.6
          const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
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
        const compressedBase64 = await compressImage(file);
        // Important: Create a new array reference
        const newPhotos = [...values, compressedBase64];
        onChange(newPhotos);
      } catch (error) {
        console.error("Error comprimiendo imagen", error);
        alert("Error al procesar la imagen. Intente de nuevo.");
      } finally {
        setLoading(false);
        // Reset input so same file can be selected again if needed
        if (inputRef.current) inputRef.current.value = '';
      }
    }
  };

  const removePhoto = (indexToRemove: number) => {
    const newPhotos = values.filter((_, idx) => idx !== indexToRemove);
    onChange(newPhotos);
  };

  return (
    <div className="mt-3">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        ref={inputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      
      <div className="flex flex-wrap gap-3">
          {/* List of Photos */}
          {values.map((photo, idx) => (
              <div key={idx} className="relative w-24 h-24 shrink-0 animate-in zoom-in duration-200">
                  <img 
                    src={photo} 
                    alt={`Evidencia ${idx + 1}`} 
                    className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm bg-white" 
                  />
                  {/* Delete Button - Positioned inside to avoid clipping */}
                  <button
                    type="button"
                    onClick={(e) => {
                        e.stopPropagation();
                        removePhoto(idx);
                    }}
                    className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1 shadow-md hover:bg-red-700 transition z-10 flex items-center justify-center w-6 h-6"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                      #{idx + 1}
                  </div>
              </div>
          ))}

          {/* Add Button */}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={loading}
            className={`w-24 h-24 shrink-0 flex flex-col items-center justify-center rounded-lg border-2 border-dashed transition-all active:scale-95 ${
                values.length > 0 
                ? 'border-brand-300 bg-brand-50 text-brand-600' 
                : 'border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            {loading ? (
                <Loader2 className="h-8 w-8 animate-spin mb-1 text-brand-500" />
            ) : values.length > 0 ? (
                <Plus className="h-8 w-8 mb-1" />
            ) : (
                <Camera className="h-8 w-8 mb-1" />
            )}
            <span className="text-[10px] font-bold uppercase tracking-wide">
                {loading ? 'Subiendo...' : values.length > 0 ? 'Otra Foto' : 'Tomar Foto'}
            </span>
          </button>
      </div>
      
      {values.length === 0 && (
          <p className="text-xs text-red-500 mt-2 font-bold flex items-center animate-pulse">
              * Se requiere al menos 1 foto.
          </p>
      )}
    </div>
  );
};