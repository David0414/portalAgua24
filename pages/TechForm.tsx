import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../services/db';
import { ChecklistValue, ReportStatus, Report } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST, ADMIN_PHONE } from '../constants';
import { PhotoUpload } from '../components/PhotoUpload';
import { sendWhatsAppNotification, generateAdminReviewLink } from '../services/whatsapp';
import { AlertTriangle, CheckCircle, Save, ArrowRight, MessageCircle } from 'lucide-react';

export const TechForm: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const [searchParams] = useSearchParams();
  const reportIdToEdit = searchParams.get('reportId');
  const navigate = useNavigate();

  const [formType, setFormType] = useState<'weekly' | 'monthly'>('weekly');
  const [values, setValues] = useState<Record<string, ChecklistValue>>({});
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [previousComments, setPreviousComments] = useState<string | null>(null);
  
  // State for success modal
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  const checklist = formType === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;

  useEffect(() => {
    const loadReport = async () => {
      if (reportIdToEdit) {
        const report = await api.getReportById(reportIdToEdit);
        if (report) {
          setFormType(report.type);
          setTechName(report.technicianName);
          setTechPhone(report.technicianId);
          setPreviousComments(report.adminComments || null);
          
          const valMap: Record<string, ChecklistValue> = {};
          report.data.forEach(item => {
            valMap[item.itemId] = item;
          });
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

  const handlePhotoChange = (itemId: string, photoUrl: string) => {
    setValues(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], itemId, photoUrl }
    }));
  };

  const validateForm = () => {
    if (!techName.trim()) {
      alert("Por favor ingresa el nombre del técnico.");
      return false;
    }
    if (!techPhone.trim()) {
      alert("Por favor ingresa el teléfono del técnico.");
      return false;
    }

    for (const item of checklist) {
      if (item.required) {
        const entry = values[item.id];
        if (!entry || entry.value === undefined || entry.value === "") {
             alert(`Falta completar el campo: "${item.label}"`);
             return false;
        }
      }
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const reportData = Object.values(values) as ChecklistValue[];
      let reportResult: Report;

      if (reportIdToEdit) {
        reportResult = await api.updateReport(reportIdToEdit, {
          data: reportData,
          technicianName: techName,
          technicianId: techPhone
        });
      } else {
        reportResult = await api.submitReport({
          machineId: machineId!,
          technicianId: techPhone,
          technicianName: techName,
          data: reportData,
          type: formType
        });
      }
      
      // Instead of redirecting immediately, show the success state
      setSubmittedReport(reportResult);

    } catch (err) {
      console.error(err);
      alert("Error al guardar el reporte.");
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsAppClick = () => {
    if (!submittedReport) return;
    const reviewLink = generateAdminReviewLink(submittedReport.id);
    const msg = `🔔 *Nuevo Reporte Mantenimiento*\nMáquina: ${machineId}\nTécnico: ${techName}\nTipo: ${formType}\n\nRevisar aquí: ${reviewLink}`;
    sendWhatsAppNotification(ADMIN_PHONE, msg);
  };

  // --- SUCCESS VIEW ---
  if (submittedReport) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl text-center border-t-8 border-green-500">
        <div className="flex justify-center mb-6">
          <div className="bg-green-100 p-4 rounded-full">
            <CheckCircle className="h-16 w-16 text-green-600" />
          </div>
        </div>
        <h2 className="text-3xl font-bold text-slate-900 mb-2">¡Reporte Guardado!</h2>
        <p className="text-slate-500 mb-8">
          El reporte ha sido registrado exitosamente.
        </p>

        <div className="space-y-4">
          <button
            onClick={handleWhatsAppClick}
            className="w-full flex items-center justify-center space-x-3 bg-green-500 text-white px-6 py-4 rounded-xl font-bold hover:bg-green-600 transition shadow-lg"
          >
            <MessageCircle className="h-6 w-6" />
            <span>Notificar al Propietario (WhatsApp)</span>
          </button>
        </div>
        
        <button 
          onClick={() => navigate('/')}
          className="mt-8 text-slate-400 hover:text-slate-600 text-sm underline"
        >
          Volver al Inicio
        </button>
      </div>
    );
  }

  // --- FORM VIEW ---
  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-brand-500 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Bitácora de Mantenimiento</h1>
          <p className="text-slate-500">Máquina: <span className="font-mono font-bold text-slate-900">{machineId}</span></p>
        </div>
      </div>
      
      {previousComments && (
           <div className="bg-red-50 border border-red-200 p-4 rounded-lg flex items-start space-x-3 mx-6 md:mx-0">
             <AlertTriangle className="text-red-500 h-6 w-6 flex-shrink-0" />
             <div>
               <h3 className="font-bold text-red-800">Corrección Requerida</h3>
               <p className="text-red-700 text-sm mt-1">{previousComments}</p>
             </div>
           </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Tech Info */}
        <div className="bg-white p-6 rounded-xl shadow-sm">
          <h3 className="text-lg font-semibold mb-4 text-brand-700">Datos del Técnico</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700">Nombre Completo</label>
              <input 
                required
                type="text" 
                value={techName}
                onChange={e => setTechName(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 p-2 border"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">Teléfono (WhatsApp)</label>
              <input 
                required
                type="tel" 
                value={techPhone}
                onChange={e => setTechPhone(e.target.value)}
                className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 p-2 border"
                placeholder="52..."
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">Tipo de Mantenimiento</label>
            <div className="mt-1 flex space-x-4">
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  checked={formType === 'weekly'} 
                  onChange={() => setFormType('weekly')}
                  className="form-radio text-brand-600" 
                  disabled={!!reportIdToEdit}
                />
                <span className="ml-2">Semanal</span>
              </label>
              <label className="inline-flex items-center">
                <input 
                  type="radio" 
                  checked={formType === 'monthly'} 
                  onChange={() => setFormType('monthly')}
                  className="form-radio text-brand-600" 
                  disabled={!!reportIdToEdit}
                />
                <span className="ml-2">Mensual</span>
              </label>
            </div>
          </div>
        </div>

        {/* Checklist */}
        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          <div className="bg-slate-50 p-4 border-b border-slate-200">
             <h3 className="font-semibold text-slate-700">Lista de Verificación ({formType === 'weekly' ? 'Semanal' : 'Mensual'})</h3>
          </div>
          
          {checklist.map((item) => (
            <div key={item.id} className="p-4 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-start md:justify-between space-y-3 md:space-y-0">
                <div className="flex-1 pr-4">
                  <label className="block text-sm font-medium text-slate-900 mb-1">
                    {item.label}
                    {item.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {item.type === 'boolean' && (
                    <div className="flex space-x-4 mt-2">
                       <button
                         type="button"
                         onClick={() => handleInputChange(item.id, true)}
                         className={`px-4 py-1.5 rounded-full text-sm font-medium border ${values[item.id]?.value === true ? 'bg-green-100 text-green-800 border-green-200' : 'bg-white text-slate-600 border-slate-300'}`}
                       >
                         Bien / Hecho
                       </button>
                       <button
                         type="button"
                         onClick={() => handleInputChange(item.id, false)}
                         className={`px-4 py-1.5 rounded-full text-sm font-medium border ${values[item.id]?.value === false ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white text-slate-600 border-slate-300'}`}
                       >
                         Mal / No Aplica
                       </button>
                    </div>
                  )}

                  {(item.type === 'number' || item.type === 'text') && (
                    <input
                      type={item.type}
                      value={values[item.id]?.value?.toString() || ''}
                      onChange={(e) => handleInputChange(item.id, e.target.value)}
                      className="mt-1 block w-full max-w-xs rounded-md border-slate-300 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm p-2 border"
                      placeholder="Ingrese lectura/valor"
                    />
                  )}
                </div>

                <div className="flex-shrink-0">
                  <PhotoUpload 
                    label="Evidencia"
                    value={values[item.id]?.photoUrl}
                    onChange={(url) => handlePhotoChange(item.id, url)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Submit Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 z-40">
           <div className="max-w-3xl mx-auto flex justify-between items-center">
             <div className="text-sm text-slate-500 hidden sm:block">
               {Object.keys(values).length} / {checklist.length} items completados
             </div>
             <button
               type="submit"
               disabled={loading}
               className="w-full sm:w-auto flex items-center justify-center space-x-2 bg-brand-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-brand-700 transition disabled:opacity-50"
             >
               {loading ? (
                 <span>Enviando...</span>
               ) : (
                 <>
                   <Save className="h-5 w-5" />
                   <span>{reportIdToEdit ? 'Enviar Corrección' : 'Finalizar y Enviar'}</span>
                 </>
               )}
             </button>
           </div>
        </div>
      </form>
    </div>
  );
};