import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { Report, ReportStatus, User, Role } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST } from '../constants';
import { Check, X, ArrowLeft, MessageSquare, MessageCircle, ExternalLink, Loader2, Trash2, AlertTriangle, FileText, Share2, Building, Download, Paperclip, ZoomIn } from 'lucide-react';
import { sendWhatsAppNotification, generateTechEditLink, generateCondoReportMessage, PRODUCTION_URL } from '../services/whatsapp';
import { generateReportPDF } from '../services/pdfGenerator';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';

export const AdminReview: React.FC = () => {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const [report, setReport] = useState<Report | null>(null);
  const [loadingAction, setLoadingAction] = useState(false);
  const [condoContact, setCondoContact] = useState<User | null>(null);
  const [machineInfo, setMachineInfo] = useState<{location: string} | null>(null);
  
  // Modal states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // Image Preview State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // Success State
  const [outcome, setOutcome] = useState<{
    status: ReportStatus;
    message: string;
    correctionLink?: string;
  } | null>(null);

  useEffect(() => {
    const loadData = async () => {
      if (reportId) {
        const r = await api.getReportById(reportId);
        setReport(r || null);

        if (r) {
            // Fetch Machine Info & Condo Contact
            const machine = await api.getMachine(r.machineId);
            setMachineInfo(machine || null);
            
            if (machine && machine.assignedToUserId) {
                const users = await api.getUsers();
                const condoUser = users.find(u => u.id === machine.assignedToUserId);
                setCondoContact(condoUser || null);
            }
        }
      }
    };
    loadData();
  }, [reportId]);

  const isImageExpired = (reportDate: string) => {
    return differenceInDays(new Date(), new Date(reportDate)) > 60;
  };

  if (!report) return <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin text-brand-600" /></div>;

  const checklistDef = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;

  const goBackToDashboard = () => {
      // Usamos navigate para navegación interna, mucho más rápido que reload
      navigate('/owner/dashboard');
  };

  // PDF DOWNLOAD HANDLER
  const handleDownloadPDF = () => {
      if (report && machineInfo) {
          generateReportPDF(report, machineInfo.location);
      }
  };

  const handleApprove = async () => {
    setLoadingAction(true);
    try {
      // 1. Update Status in DB
      await api.reviewReport(report.id, ReportStatus.APPROVED);
      
      // 2. Auto-Download PDF for the Owner
      if (machineInfo) {
          const approvedReport = { ...report, status: ReportStatus.APPROVED };
          generateReportPDF(approvedReport, machineInfo.location);
      }
      
      const msgTech = `✅ *Reporte Aprobado*\nTu mantenimiento de la máquina ${report.machineId} ha sido validado correctamente.`;
      
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
      
      const editLink = generateTechEditLink(report.id, report.machineId);
      const msgTech = `❌ *Reporte Rechazado*\nHay observaciones en tu mantenimiento de ${report.machineId}:\n_"${rejectReason}"_\n\nPor favor corrige aquí: ${editLink}`;
      
      setRejectModalOpen(false);
      
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

  const handleDeleteReport = async () => {
    setLoadingAction(true);
    try {
        await api.deleteReport(report.id);
        goBackToDashboard();
    } catch (error) {
        console.error("Error deleting:", error);
        alert("No se pudo eliminar el reporte.");
        setLoadingAction(false);
        setDeleteModalOpen(false);
    }
  };

  // WhatsApp Functions
  const sendTechWhatsApp = () => {
    if (outcome && report) {
      sendWhatsAppNotification(report.technicianId, outcome.message);
    }
  };

  const sendCondoWhatsApp = () => {
    if (!report || !machineInfo || !condoContact?.phone) return;
    const msg = `✅ *Reporte Listo*\n\nAdjunto el PDF con los detalles del mantenimiento en *${machineInfo.location}*.\n\nTambién disponible en tu portal: ${PRODUCTION_URL}/#/login/condo`;
    sendWhatsAppNotification(condoContact.phone, msg);
  };

  const getValue = (itemId: string) => {
    return report.data.find(d => d.itemId === itemId);
  };

  // --- SUCCESS VIEW (DOBLE NOTIFICACIÓN) ---
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
        
        {outcome.status === ReportStatus.APPROVED && (
            <div className="bg-blue-50 text-blue-700 p-3 rounded-lg text-sm mb-4">
                <p>📥 El PDF se ha descargado a tu dispositivo automáticamente.</p>
            </div>
        )}

        <div className="space-y-4">
            {outcome.status === ReportStatus.APPROVED ? (
               <>
                 {/* Step 1: Tech */}
                <button
                    onClick={sendTechWhatsApp}
                    className="w-full flex items-center justify-between px-4 py-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition group"
                >
                    <div className="flex items-center">
                        <div className="bg-brand-100 p-2 rounded-full mr-3">
                             <MessageCircle className="h-5 w-5 text-brand-600" />
                        </div>
                        <div className="text-left">
                            <span className="block font-bold text-slate-700">1. Avisar al Técnico</span>
                        </div>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-400" />
                </button>
                
                {/* Step 2: Condo */}
                {condoContact ? (
                    <div className="border border-teal-200 rounded-xl overflow-hidden">
                        <div className="bg-teal-50 p-3 text-left border-b border-teal-100">
                             <p className="text-xs font-bold text-teal-800 uppercase mb-1">Paso 2: Enviar a Cliente</p>
                             <p className="text-sm text-teal-600">Al dar clic, se abrirá WhatsApp. <strong>Arrastra el PDF descargado</strong> al chat.</p>
                        </div>
                        <button
                            onClick={sendCondoWhatsApp}
                            className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-teal-50 transition"
                        >
                            <div className="flex items-center">
                                <div className="bg-teal-200 p-2 rounded-full mr-3">
                                    <Paperclip className="h-5 w-5 text-teal-800" />
                                </div>
                                <div className="text-left">
                                    <span className="block font-bold text-teal-900">2. Abrir WhatsApp Cliente</span>
                                </div>
                            </div>
                            <ExternalLink className="h-4 w-4 text-teal-500" />
                        </button>
                    </div>
                ) : (
                    <div className="p-3 bg-slate-50 text-slate-400 text-xs rounded-lg text-left">
                        * No hay usuario de condominio asignado para notificar.
                    </div>
                )}
               </>
            ) : (
                 <button
                    onClick={sendTechWhatsApp}
                    className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg"
                 >
                    <AlertTriangle className="h-5 w-5" />
                    <span>Enviar Correcciones al Técnico</span>
                 </button>
            )}
        </div>
           
        <button
            onClick={goBackToDashboard}
            className="w-full flex items-center justify-center space-x-2 text-slate-500 px-4 py-3 rounded-xl font-medium hover:bg-slate-50 transition mt-4"
        >
            <ArrowLeft className="h-5 w-5" />
            <span>Volver al Dashboard</span>
        </button>
      </div>
    );
  }

  // --- REVIEW VIEW ---
  return (
    <div className="max-w-4xl mx-auto pb-32">
      <div className="flex justify-between items-center mb-4">
          <button onClick={goBackToDashboard} className="flex items-center text-slate-500 hover:text-brand-600 transition">
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </button>
          
          <button 
             onClick={handleDownloadPDF}
             className="flex items-center space-x-2 bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-slate-900 transition shadow-sm"
          >
             <Download className="h-4 w-4" />
             <span>Descargar PDF</span>
          </button>
      </div>

      {/* HEADER TIPO REPORTE */}
      <div className="bg-white rounded-t-xl shadow-sm border border-slate-200 border-b-0 p-8 flex flex-col md:flex-row justify-between items-start md:items-center relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-500 to-indigo-600"></div>
        
        <div>
           <div className="flex items-center space-x-3 mb-2">
              <FileText className="h-6 w-6 text-brand-600" />
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">Certificado de Servicio</h1>
           </div>
           <p className="text-slate-500">Máquina: <span className="font-bold text-slate-900">{machineInfo?.location || report.machineId}</span></p>
           <p className="text-xs text-slate-400 mt-1">ID: {report.machineId} • Fecha: {format(new Date(report.createdAt), "dd/MM/yyyy HH:mm")}</p>
        </div>

        <div className="mt-4 md:mt-0 flex flex-col items-end">
            <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-2 ${
                report.status === ReportStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                report.status === ReportStatus.APPROVED ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
                {report.status === ReportStatus.PENDING ? 'Por Validar' : 
                report.status === ReportStatus.APPROVED ? 'Validado' : 'Rechazado'}
            </div>
            <p className="text-xs text-slate-500 text-right">Técnico: <span className="font-medium">{report.technicianName}</span></p>
            <button 
                onClick={() => setDeleteModalOpen(true)}
                className="text-red-300 hover:text-red-500 text-xs flex items-center mt-2 transition"
            >
                <Trash2 className="h-3 w-3 mr-1" /> Eliminar Reporte
            </button>
        </div>
      </div>

      {/* TABLA DE RESULTADOS */}
      <div className="bg-white shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                        <th className="p-4 font-bold">Parámetro de Control</th>
                        <th className="p-4 font-bold text-center">Referencia (Ideal)</th>
                        <th className="p-4 font-bold text-center">Resultado (Real)</th>
                        <th className="p-4 font-bold text-center">Obs / Comentarios</th>
                        <th className="p-4 font-bold text-center">Evidencia</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                    {checklistDef.map((item, idx) => {
                         const data = getValue(item.id);
                         const val = data?.value;
                         const isBool = item.type === 'boolean';
                         const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                         
                         return (
                            <tr key={item.id} className={`${rowBg} hover:bg-indigo-50/30 transition`}>
                                <td className="p-4 font-medium text-slate-700">
                                    {item.label}
                                </td>
                                <td className="p-4 text-center text-slate-400 font-mono text-xs">
                                    {item.reference || '-'} {item.unit}
                                </td>
                                <td className="p-4 text-center">
                                    <span className={`font-bold text-base ${
                                        item.id === 'w13' ? 'text-emerald-600' : 'text-slate-800'
                                    }`}>
                                        {isBool ? (val ? 'Cumple' : 'No Cumple') : (
                                            item.id === 'w13' ? `$${val}` : `${val || '--'} ${item.unit || ''}`
                                        )}
                                    </span>
                                </td>
                                <td className="p-4 text-center text-xs text-slate-500 italic max-w-[200px]">
                                    {data?.comment || '-'}
                                </td>
                                <td className="p-4 text-center">
                                    {isImageExpired(report.createdAt) ? (
                                        <span className="text-[10px] text-slate-300 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100 cursor-help" title="Eliminado automáticamente por antigüedad">
                                            EXPIRADO
                                        </span>
                                    ) : (
                                        data?.photoUrl ? (
                                            <div className="relative group inline-block">
                                                <img 
                                                    src={data.photoUrl} 
                                                    alt="Evidencia" 
                                                    className="h-10 w-10 object-cover rounded border border-slate-300 cursor-pointer shadow-sm hover:opacity-80 transition z-10 relative bg-white"
                                                    onClick={() => setPreviewImage(data.photoUrl || null)}
                                                />
                                                <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-0 group-hover:bg-opacity-20 transition pointer-events-none rounded">
                                                    <ZoomIn className="text-white opacity-0 group-hover:opacity-100 h-3 w-3" />
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-red-300 italic font-bold">Sin foto</span>
                                        )
                                    )}
                                </td>
                            </tr>
                         );
                    })}
                </tbody>
            </table>
        </div>
      </div>

      {/* ACTIONS FOOTER */}
      {report.status === ReportStatus.PENDING && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-4xl mx-auto flex space-x-4">
            <button 
              onClick={() => setRejectModalOpen(true)}
              disabled={loadingAction}
              className="flex-1 bg-white text-red-600 border border-red-200 py-3 rounded-xl font-bold hover:bg-red-50 flex justify-center items-center transition disabled:opacity-50"
            >
              <X className="mr-2" /> Rechazar
            </button>
            <button 
              onClick={handleApprove}
              disabled={loadingAction}
              className="flex-[2] bg-gradient-to-r from-brand-600 to-indigo-600 text-white py-3 rounded-xl font-bold hover:from-brand-700 hover:to-indigo-700 flex justify-center items-center shadow-lg hover:shadow-xl transition disabled:opacity-70 transform hover:-translate-y-0.5"
            >
              {loadingAction ? <Loader2 className="mr-2 animate-spin" /> : <Check className="mr-2" />}
              {loadingAction ? 'Procesando...' : 'Validar y Descargar'}
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

      {/* DELETE CONFIRMATION MODAL */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-slate-900 bg-opacity-70 flex items-center justify-center p-4 z-[60] animate-in fade-in duration-200">
          <div className="bg-white rounded-xl max-w-sm w-full p-6 shadow-2xl border-t-4 border-red-600">
            <div className="flex flex-col items-center text-center">
                <div className="bg-red-100 p-3 rounded-full mb-4">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 mb-2">¿Eliminar Reporte?</h3>
                <p className="text-slate-500 text-sm mb-6 leading-relaxed">
                    Esta acción eliminará permanentemente el reporte de la base de datos. <br/><strong>No se puede deshacer.</strong>
                </p>
                
                <div className="flex w-full space-x-3">
                    <button 
                        onClick={() => setDeleteModalOpen(false)}
                        disabled={loadingAction}
                        className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 font-bold hover:bg-slate-50 transition"
                    >
                        Cancelar
                    </button>
                    <button 
                        onClick={handleDeleteReport}
                        disabled={loadingAction}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 shadow-md transition flex justify-center items-center"
                    >
                        {loadingAction ? <Loader2 className="animate-spin h-4 w-4" /> : 'Sí, Eliminar'}
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* FULL SCREEN IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setPreviewImage(null)}
        >
            <div className="relative w-full h-full flex items-center justify-center p-4">
                <img 
                    src={previewImage} 
                    alt="Evidencia Ampliada" 
                    className="max-w-full max-h-full object-contain rounded shadow-2xl animate-in zoom-in-50 duration-300" 
                    onClick={(e) => e.stopPropagation()} 
                />
                
                <button 
                    onClick={() => setPreviewImage(null)}
                    className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>
        </div>
      )}
    </div>
  );
};