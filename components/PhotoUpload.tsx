import React, { useRef, useState } from 'react';
import { Camera, X, Check } from 'lucide-react';

interface PhotoUploadProps {
  value?: string;
  onChange: (value: string) => void;
  label: string;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ value, onChange, label }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        // In a real app, you would upload to Supabase Storage here
        // const { data, error } = await supabase.storage.from('evidence').upload(...)
        // onChange(data.publicUrl);
        
        // For demo, we use Base64
        onChange(reader.result as string);
        setLoading(false);
      };
      reader.readAsDataURL(file);
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
          className="flex items-center space-x-2 text-sm text-brand-600 font-medium hover:text-brand-700 bg-brand-50 px-3 py-2 rounded-lg border border-brand-200 transition-colors"
        >
          <Camera className="h-4 w-4" />
          <span>{loading ? 'Procesando...' : 'Tomar Evidencia'}</span>
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
