import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { api } from '../services/db';
import { ChecklistValue, Report, Role } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST, SPECIAL_CHECKLIST } from '../constants';
import { PhotoUpload } from '../components/PhotoUpload';
import { sendWhatsAppNotification, generateAdminReviewLink } from '../services/whatsapp';
import { CheckCircle, Save, MessageCircle, AlertTriangle, MessageSquare, Loader2, Camera, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const TechForm: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const reportIdToEdit = searchParams.get('reportId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [formType, setFormType] = useState<'weekly' | 'monthly' | 'special'>('weekly');
  const [values, setValues] = useState<Record<string, ChecklistValue>>({});
  const [loading, setLoading] = useState(false);
  const [previousComments, setPreviousComments] = useState<string | null>(null);
  
  // State for success modal
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  // LOGIC CHANGE: Monthly Report now includes ALL Weekly items + Monthly items
  const checklist = useMemo(() => {
      if (formType === 'weekly') return WEEKLY_CHECKLIST;
      if (formType === 'monthly') return [...WEEKLY_CHECKLIST, ...MONTHLY_CHECKLIST];
      return SPECIAL_CHECKLIST;
  }, [formType]);

  useEffect(() => {
    const loadReport = async () => {
      if (reportIdToEdit) {
        const report = await api.getReportById(reportIdToEdit);
        if (report) {
          setFormType(report.type);
          setPreviousComments(report.adminComments || null);
          const valMap: Record<string, ChecklistValue> = {};
          
          const rawData = report.data as any;
          
          if (Array.isArray(rawData)) {
            rawData.forEach((item: any) => {
              if (item && item.itemId) {
                valMap[item.itemId] = item;
              }
            });
          }
          setValues(valMap);
        }
      }
    };
    loadReport();
  }, [reportIdToEdit]);

  const handleInputChange = (itemId: string, val: string | number | boolean) => {
    setValues(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, value: val }
    }));
  };

  const handleCommentChange = (itemId: string, comment: string) => {
    setValues(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, comment }
    }));
  };

  const handlePhotoChange = (itemId: string, photoUrl: string) => {
    setValues(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, photoUrl }
    }));
  };

  const validateForm = () => {
    if (!user || !user.phone) {
        alert("Error de perfil: No tienes un número de teléfono registrado. Contacta al administrador.");
        return false;
    }

    for (const item of checklist) {
      const entry = values[item.id];
      
      // 1. Validar Valor Requerido (El valor SI es obligatorio)
      if (item.required) {
        if (!entry || entry.value === undefined || entry.value === "") {
             alert(`Falta completar el campo: "${item.label}"`);
             const element = document.getElementById(`item-${item.id}`);
             element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
             return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const reportData = Object.values(values) as ChecklistValue[];

      if (reportIdToEdit) {
        await api.updateReport(reportIdToEdit, {
            data: reportData,
            technicianId: user!.phone,
            technicianName: user!.name
        });
        const r = await api.getReportById(reportIdToEdit);
        if (r) setSubmittedReport(r);

      } else {
        const newReport = await api.submitReport({
          machineId: machineId!,
          technicianId: user!.phone!,
          technicianName: user!.name,
          data: reportData,
          type: formType,
        });
        setSubmittedReport(newReport);
      }
      
    } catch (error) {
      console.error(error);
      alert("Error al guardar reporte");
    } finally {
      setLoading(false);
    }
  };

  const handleNotifyAdmin = async () => {
      if (!submittedReport) return;
      
      setLoading(true); 
      try {
          const users = await api.getUsers();
          const admin = users.find(u => u.role === Role.OWNER && u.phone);

          if (!admin || !admin.phone) {
              alert("No se encontró un número de administrador (Owner) registrado en el sistema.");
              setLoading(false);
              return;
          }

          const link = generateAdminReviewLink(submittedReport.id);
          const reportTypeLabel = formType === 'special' ? 'REPORTE ESPECIAL' : 'Mantenimiento';
          const message = `✅ *${reportTypeLabel} Completado*\n\nTécnico: ${user?.name}\nMáquina: ${machineId}\n\nRevisar aquí: ${link}`;
          
          sendWhatsAppNotification(admin.phone, message);
          navigate('/tech/scan');
      } catch (error) {
          console.error("Error buscando admin:", error);
          alert("Error al intentar notificar al administrador.");
      } finally {
          setLoading(false);
      }
  };

  if (submittedReport) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-green-50 animate-in zoom-in duration-300">
              <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-sm w-full">
                  <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-green-100 mb-6">
                      <CheckCircle className="h-10 w-10 text-green-600" />
                  </div>
                  <h2 className="text-2xl font-bold text-slate-800 mb-2">¡Reporte Enviado!</h2>
                  <p className="text-slate-500 mb-8">La información ha sido registrada correctamente.</p>
                  
                  <button 
                    onClick={handleNotifyAdmin}
                    disabled={loading}
                    className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg transform hover:scale-105 disabled:opacity-70 disabled:transform-none"
                  >
                      {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5"/> : <MessageCircle className="mr-2 h-5 w-5" />}
                      Notificar al Admin
                  </button>

                  <button 
                     onClick={() => navigate('/tech/scan')}
                     className="mt-4 text-slate-400 text-sm font-medium hover:text-slate-600"
                  >
                      Volver al Inicio
                  </button>
              </div>
          </div>
      );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6 sticky top-20 z-10">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-2xl font-bold text-slate-800">Checklist de Servicio</h1>
                <p className="text-slate-500 text-sm">Máquina: <span className="font-mono font-bold text-brand-600">{machineId}</span></p>
            </div>
            <div className="flex space-x-2 bg-slate-100 p-1 rounded-lg w-full md:w-auto">
                <button 
                    onClick={() => setFormType('weekly')}
                    className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition ${formType === 'weekly' ? 'bg-white shadow text-brand-600' : 'text-slate-400'}`}
                >
                    SEMANAL
                </button>
                <button 
                    onClick={() => setFormType('monthly')}
                    className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition ${formType === 'monthly' ? 'bg-white shadow text-indigo-600' : 'text-slate-400'}`}
                >
                    MENSUAL
                </button>
                <button 
                    onClick={() => setFormType('special')}
                    className={`flex-1 md:flex-none px-3 py-1.5 text-xs font-bold rounded-md transition flex items-center justify-center ${formType === 'special' ? 'bg-white shadow text-amber-600' : 'text-slate-400'}`}
                >
                    <FileText className="w-3 h-3 mr-1" />
                    ESPECIAL
                </button>
            </div>
        </div>
        {previousComments && (
            <div className="mt-4 bg-red-50 border border-red-100 p-3 rounded-lg flex items-start text-sm text-red-700 animate-pulse">
                <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
                <div>
                    <span className="font-bold block">Correcciones Solicitadas:</span>
                    {previousComments}
                </div>
            </div>
        )}
      </div>

      <div className="space-y-6">
        {checklist.map((item) => (
          <div key={item.id} id={`item-${item.id}`} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 transition hover:shadow-md">
            <div className="flex justify-between items-start mb-3">
                <label className="block text-lg font-medium text-slate-800">
                    {item.label} <span className="text-red-500">*</span>
                </label>
                {item.reference && (
                    <span className="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded font-mono border border-slate-200">
                        {item.reference}
                    </span>
                )}
            </div>
            
            <div className="space-y-4">
                {item.type === 'boolean' ? (
                    <div className="flex gap-4">
                        <button
                        type="button"
                        onClick={() => handleInputChange(item.id, true)}
                        className={`flex-1 py-3 px-4 rounded-lg border font-medium transition flex items-center justify-center ${
                            values[item.id]?.value === true
                            ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        >
                        <CheckCircle className={`mr-2 h-5 w-5 ${values[item.id]?.value === true ? 'opacity-100' : 'opacity-0'}`} />
                        Cumple / Sí
                        </button>
                        <button
                        type="button"
                        onClick={() => handleInputChange(item.id, false)}
                        className={`flex-1 py-3 px-4 rounded-lg border font-medium transition ${
                            values[item.id]?.value === false
                            ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500'
                            : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                        }`}
                        >
                        No Cumple
                        </button>
                    </div>
                ) : item.type === 'textarea' ? (
                    // TEXTAREA FOR SPECIAL REPORTS
                    <div className="relative">
                        <textarea
                            required
                            rows={6}
                            value={values[item.id]?.value as string || ''}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 p-4 text-base bg-slate-50 focus:bg-white transition resize-none"
                            placeholder="Escribe aquí todos los detalles, observaciones y acciones realizadas..."
                        />
                    </div>
                ) : (
                    <div className="relative">
                        <input
                            type={item.type === 'number' ? 'number' : 'text'}
                            value={values[item.id]?.value as string || ''}
                            onChange={(e) => handleInputChange(item.id, e.target.value)}
                            className="block w-full rounded-lg border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 py-3 px-4 text-lg bg-slate-50 focus:bg-white transition"
                            placeholder={`Ingrese valor (${item.unit || 'texto'})`}
                        />
                        {item.unit && (
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <span className="text-slate-400 font-bold sm:text-sm">{item.unit}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Photo Upload (Opcional - But visually main evidence for special reports) */}
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center">
                        <Camera className="h-3 w-3 mr-1" /> Evidencia Fotográfica {item.type === 'textarea' ? '(Importante)' : '(Opcional)'}
                    </p>
                    <PhotoUpload
                        label={item.label}
                        value={values[item.id]?.photoUrl}
                        onChange={(url) => handlePhotoChange(item.id, url)}
                    />
                </div>

                {/* Optional Comment Box (Only for standard items, not for textarea which is already a comment) */}
                {item.type !== 'textarea' && (
                    <div>
                    <label className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center">
                        <MessageSquare className="h-3 w-3 mr-1" /> Comentarios (Opcional)
                    </label>
                    <textarea 
                        className="w-full text-sm p-2 border border-slate-200 rounded-lg focus:ring-1 focus:ring-brand-300 outline-none resize-none bg-slate-50 focus:bg-white"
                        rows={2}
                        placeholder="Observaciones adicionales..."
                        value={values[item.id]?.comment || ''}
                        onChange={(e) => handleCommentChange(item.id, e.target.value)}
                    />
                    </div>
                )}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-20">
        <div className="max-w-3xl mx-auto">
             <button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full flex items-center justify-center space-x-2 bg-brand-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-brand-700 transition transform active:scale-95 disabled:opacity-70 disabled:transform-none"
             >
                {loading ? (
                    <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Guardando...
                    </>
                ) : (
                    <>
                    <Save className="h-6 w-6 mr-2" />
                    Finalizar Reporte
                    </>
                )}
            </button>
        </div>
      </div>
    </div>
  );
};