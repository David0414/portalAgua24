import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { Report, ReportStatus } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST } from '../constants';
import { Check, X, ArrowLeft, MessageSquare, MessageCircle, ExternalLink, Loader2 } from 'lucide-react';
import { sendWhatsAppNotification, generateTechEditLink } from '../services/whatsapp';

export const AdminReview: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loadingAction, setLoadingAction] = useState(false); // New loading state for buttons
  
  // Modal states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  
  // Success/Simulation State
  const [outcome, setOutcome] = useState<{
    status: ReportStatus;
    message: string;
    correctionLink?: string;
  } | null>(null);

  useEffect(() => {
    if (reportId) {
      api.getReportById(reportId).then(setReport);
    }
  }, [reportId]);

  if (!report) return <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin text-brand-600" /></div>;

  const checklistDef = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;

  const handleApprove = async () => {
    // Removed window.confirm to prevent browser blocking issues
    setLoadingAction(true);
    try {
      await api.reviewReport(report.id, ReportStatus.APPROVED);
      
      // Construct Message
      const msgTech = `✅ *Reporte Aprobado*\nTu mantenimiento de la máquina ${report.machineId} ha sido validado correctamente.`;
      
      // Set Outcome for Simulation Screen
      setOutcome({
        status: ReportStatus.APPROVED,
        message: msgTech
      });
    } catch (error) {
      console.error("Error approving:", error);
      alert("Hubo un error al aprobar el reporte.");
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;

    setLoadingAction(true);
    try {
      await api.reviewReport(report.id, ReportStatus.REJECTED, rejectReason);
      
      // Construct Message & Link
      const editLink = generateTechEditLink(report.id, report.machineId);
      const msgTech = `❌ *Reporte Rechazado*\nHay observaciones en tu mantenimiento de ${report.machineId}:\n_"${rejectReason}"_\n\nPor favor corrige aquí: ${editLink}`;
      
      setRejectModalOpen(false);
      
      // Set Outcome for Simulation Screen
      setOutcome({
        status: ReportStatus.REJECTED,
        message: msgTech,
        correctionLink: `/tech/form/${report.machineId}?reportId=${report.id}` 
      });
    } catch (error) {
      console.error("Error rejecting:", error);
      alert("Hubo un error al rechazar el reporte.");
    } finally {
      setLoadingAction(false);
    }
  };

  const sendRealWhatsApp = () => {
    if (outcome && report) {
      sendWhatsAppNotification(report.technicianId, outcome.message);
    }
  };

  const getValue = (itemId: string) => {
    return report.data.find(d => d.itemId === itemId);
  };

  // --- SUCCESS VIEW ---
  if (outcome) {
    return (
      <div className="max-w-xl mx-auto mt-10 p-8 bg-white rounded-2xl shadow-xl text-center border-t-8 border-indigo-500 animate-in fade-in zoom-in duration-300">
        <div className="flex justify-center mb-6">
          <div className={`p-4 rounded-full ${outcome.status === ReportStatus.APPROVED ? 'bg-green-100' : 'bg-red-100'}`}>
            {outcome.status === ReportStatus.APPROVED ? (
              <Check className="h-16 w-16 text-green-600" />
            ) : (
              <X className="h-16 w-16 text-red-600" />
            )}
          </div>
        </div>
        
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {outcome.status === ReportStatus.APPROVED ? 'Reporte Aprobado' : 'Reporte Rechazado'}
        </h2>
        <p className="text-slate-500 mb-6">
          La base de datos ha sido actualizada.
        </p>

        {/* The Message Preview */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-8 text-left text-sm font-mono text-slate-600 whitespace-pre-wrap shadow-inner">
          {outcome.message}
        </div>

        <div className="space-y-4">
           <button
             onClick={sendRealWhatsApp}
             className="w-full flex items-center justify-center space-x-2 bg-green-500 text-white px-4 py-3 rounded-xl font-bold hover:bg-green-600 transition shadow-lg"
           >
             <MessageCircle className="h-5 w-5" />
             <span>Notificar al Técnico por WhatsApp</span>
           </button>
           
           <button
             onClick={() => navigate('/owner/dashboard')}
             className="w-full flex items-center justify-center space-x-2 bg-slate-200 text-slate-700 px-4 py-3 rounded-xl font-bold hover:bg-slate-300 transition"
           >
             <ArrowLeft className="h-5 w-5" />
             <span>Volver al Dashboard</span>
           </button>
        </div>
      </div>
    );
  }

  // --- REVIEW VIEW ---
  return (
    <div className="max-w-4xl mx-auto pb-32"> {/* Added padding bottom so footer doesn't hide content */}
      <button onClick={() => navigate('/owner/dashboard')} className="flex items-center text-slate-500 hover:text-brand-600 mb-4 transition">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
      </button>

      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="bg-slate-800 text-white p-6 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">Revisión de Reporte</h1>
            <p className="text-slate-400 text-sm">ID: {report.id.substring(0,8)}... | {report.technicianName}</p>
          </div>
          <div className={`px-3 py-1 rounded text-sm font-bold ${
            report.status === ReportStatus.PENDING ? 'bg-amber-500 text-white' :
            report.status === ReportStatus.APPROVED ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
          }`}>
            {report.status === ReportStatus.PENDING ? 'PENDIENTE' : 
             report.status === ReportStatus.APPROVED ? 'APROBADO' : 'RECHAZADO'}
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
           {checklistDef.map(item => {
             const data = getValue(item.id);
             return (
               <div key={item.id} className="border-b border-slate-100 pb-4">
                 <p className="text-sm font-medium text-slate-500 mb-1">{item.label}</p>
                 <div className="flex justify-between items-start">
                   <div className="font-semibold text-slate-800 text-lg">
                      {item.type === 'boolean' 
                        ? (data?.value 
                            ? <span className="inline-flex items-center text-green-600 bg-green-50 px-2 py-0.5 rounded"><Check className="w-4 h-4 mr-1"/> Correcto</span> 
                            : <span className="inline-flex items-center text-red-600 bg-red-50 px-2 py-0.5 rounded"><X className="w-4 h-4 mr-1"/> Incorrecto</span>)
                        : (item.type === 'number' && item.id === 'w13' ? `$${data?.value}` : data?.value || <span className="text-slate-300 italic">Sin dato</span>)
                      }
                   </div>
                   {data?.photoUrl && (
                     <div className="relative group">
                        <img 
                          src={data.photoUrl} 
                          alt="Evidencia" 
                          className="h-20 w-20 object-cover rounded border border-slate-300 cursor-pointer shadow-sm group-hover:shadow-md transition"
                          onClick={() => window.open(data.photoUrl, '_blank')}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition rounded pointer-events-none"></div>
                     </div>
                   )}
                 </div>
               </div>
             )
           })}
        </div>
      </div>

      {report.status === ReportStatus.PENDING && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <button 
              onClick={() => setRejectModalOpen(true)}
              disabled={loadingAction}
              className="flex-1 bg-red-50 text-red-700 border border-red-200 py-3 rounded-lg font-bold hover:bg-red-100 flex justify-center items-center transition disabled:opacity-50"
            >
              <X className="mr-2" /> Rechazar
            </button>
            <button 
              onClick={handleApprove}
              disabled={loadingAction}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 flex justify-center items-center shadow-lg hover:shadow-xl transition disabled:opacity-70"
            >
              {loadingAction ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
              {loadingAction ? 'Procesando...' : 'Aprobar Reporte'}
            </button>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl scale-100">
            <h3 className="text-xl font-bold mb-4 flex items-center text-slate-800">
              <MessageSquare className="mr-2 text-brand-600" /> Motivo del Rechazo
            </h3>
            <p className="text-sm text-slate-500 mb-2">Explique al técnico qué debe corregir:</p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="w-full h-32 border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none"
              placeholder="Ej: La foto de la limpieza exterior está borrosa..."
              autoFocus
            ></textarea>
            <div className="flex justify-end space-x-3 mt-6">
              <button 
                onClick={() => setRejectModalOpen(false)}
                disabled={loadingAction}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleRejectSubmit}
                disabled={loadingAction || !rejectReason.trim()}
                className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-bold shadow-md hover:shadow-lg transition disabled:opacity-50 flex items-center"
              >
                {loadingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirmar Rechazo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};