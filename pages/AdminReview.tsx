import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/db';
import { Report, ReportStatus, User, Role } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST, SPECIAL_CHECKLIST } from '../constants';
import { Check, X, ArrowLeft, MessageSquare, MessageCircle, ExternalLink, Loader2, Trash2, AlertTriangle, FileText, Share2, Building, Download, Paperclip, ZoomIn, Eye, EyeOff, ChevronLeft, ChevronRight, Copy, Users, Phone, UserCheck, Send, FileCheck } from 'lucide-react';
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
  const [machineInfo, setMachineInfo] = useState<{location: string, id: string} | null>(null);
  
  // VISIBILITY STATE FOR SPECIAL REPORTS
  const [showInCondo, setShowInCondo] = useState(true);

  // Modal states
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  
  // GALLERY STATE
  const [gallery, setGallery] = useState<{ images: string[], index: number } | null>(null);
  
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
        
        // Default visibility to true (or whatever is in DB if already reviewed)
        if (r) setShowInCondo(r.showInCondo !== false);

        if (r) {
            // Fetch Machine Info
            const machine = await api.getMachine(r.machineId);
            setMachineInfo(machine || null);
            
            // CORRECCIÓN IMPORTANTE: Búsqueda robusta del Administrador del Condominio
            const users = await api.getUsers();
            
            // 1. Buscar usuario con rol CONDO_ADMIN asignado a esta máquina
            let condoUser = users.find(u => 
                u.role === Role.CONDO_ADMIN && 
                u.assignedMachineId === r.machineId
            );

            // 2. Si no se encuentra por asignación directa, intentar por la referencia en la máquina (siempre verificando el rol)
            if (!condoUser && machine?.assignedToUserId) {
                 condoUser = users.find(u => 
                     u.id === machine.assignedToUserId && 
                     u.role === Role.CONDO_ADMIN
                 );
            }

            setCondoContact(condoUser || null);
        }
      }
    };
    loadData();
  }, [reportId]);

  const isImageExpired = (reportDate: string) => {
    return differenceInDays(new Date(), new Date(reportDate)) > 60;
  };

  // Gallery Navigation Handlers
  const handleNextImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (gallery && gallery.index < gallery.images.length - 1) {
          setGallery({ ...gallery, index: gallery.index + 1 });
      }
  };

  const handlePrevImage = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (gallery && gallery.index > 0) {
          setGallery({ ...gallery, index: gallery.index - 1 });
      }
  };

  if (!report) return <div className="p-8 text-center flex justify-center"><Loader2 className="animate-spin text-brand-600" /></div>;

  // LOGIC CHANGE: Monthly Report view now merges lists
  const checklistDef = report.type === 'weekly' ? WEEKLY_CHECKLIST : 
                       report.type === 'monthly' ? [...WEEKLY_CHECKLIST, ...MONTHLY_CHECKLIST] :
                       SPECIAL_CHECKLIST;

  const goBackToDashboard = () => {
      // Usamos navigate para navegación interna, mucho más rápido que reload
      navigate('/owner/dashboard');
  };

  // PDF DOWNLOAD HANDLER
  const handleDownloadPDF = () => {
      if (report && machineInfo) {
          // No history passed
          generateReportPDF(report, machineInfo.location, false);
      }
  };

  const handleApprove = async () => {
    setLoadingAction(true);
    try {
      // CRITICAL LOGIC: 
      // If report is Weekly or Monthly, enforce visibility = TRUE always.
      // If report is Special, respect the `showInCondo` toggle state.
      const finalVisibility = report.type !== 'special' ? true : showInCondo;

      // 1. Update Status in DB with Visibility Flag
      await api.reviewReport(report.id, ReportStatus.APPROVED, undefined, finalVisibility);
      
      // 2. Auto-Download PDF for the Owner (Always download for owner)
      if (machineInfo) {
          const approvedReport = { ...report, status: ReportStatus.APPROVED };
          generateReportPDF(approvedReport, machineInfo.location, false);
      }
      
      const msgTech = `✅ *Reporte Aprobado*\nTu reporte (${report.type === 'special' ? 'Especial' : 'Mantenimiento'}) de la máquina ${report.machineId} ha sido validado correctamente.`;
      
      setOutcome({
        status: ReportStatus.APPROVED,
        message: msgTech
      });
    } catch (error: any) {
      console.error("Error approving:", error);
      
      // Manejo de error específico de columna faltante en Supabase
      if (error?.message?.includes('showInCondo') || error?.details?.includes('showInCondo') || error?.code === 'PGRST204') {
          alert("⚠️ ERROR DE CONFIGURACIÓN DE BASE DE DATOS\n\nLa base de datos no tiene la columna 'showInCondo' necesaria para guardar la visibilidad.\n\nSOLUCIÓN: Ve al SQL Editor en Supabase y ejecuta el contenido del archivo 'FIX_SCHEMA.sql'.");
      } else {
          alert("Hubo un error al aprobar el reporte: " + (error.message || "Error desconocido"));
      }
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectReason.trim()) return;

    setLoadingAction(true);
    try {
      // Rejecting sets status to REJECTED. Visibility doesn't matter much here, but we can save it.
      await api.reviewReport(report.id, ReportStatus.REJECTED, rejectReason, false);
      
      const editLink = generateTechEditLink(report.id, report.machineId);
      const msgTech = `❌ *Reporte Rechazado*\nHay observaciones en tu reporte de ${report.machineId}:\n_"${rejectReason}"_\n\nPor favor corrige aquí: ${editLink}`;
      
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
      // Enviar estrictamente al ID del técnico (que es su teléfono)
      sendWhatsAppNotification(report.technicianId, outcome.message);
    }
  };

  // Helper to generate the message string
  const getCondoMessage = () => {
      if (!report || !machineInfo) return '';
      const dateStr = format(new Date(report.createdAt), "dd/MM/yyyy HH:mm");
      
      // Intentar obtener valores clave para el resumen
      const tds = report.data.find(d => d.itemId === 'w_tds')?.value || '--';
      const ph = report.data.find(d => d.itemId === 'w_ph')?.value || '--';
      
      if (report.type === 'special') {
          return `⚠️ *Bitácora de Evento*\n\nSe ha registrado un reporte especial en *${machineInfo.location}* (ID: ${machineInfo.id}) el día ${dateStr}.\n\n📄 Detalles disponibles en su portal:\n${PRODUCTION_URL}/#/login/condo\n\n(Se adjunta PDF con evidencias)`;
      }

      return generateCondoReportMessage(machineInfo.id, machineInfo.location, dateStr, tds.toString(), ph.toString()) + "\n\n(Se adjunta PDF con detalles)";
  };

  const sendCondoWhatsApp = () => {
    if (!condoContact?.phone) {
        alert("El usuario asignado no tiene teléfono registrado.");
        return;
    }
    const msg = getCondoMessage();
    // Enviar estrictamente al teléfono del contacto del condominio
    sendWhatsAppNotification(condoContact.phone, msg);
  };

  const getValue = (itemId: string) => {
    return report.data.find(d => d.itemId === itemId);
  };

  // Helper to extract photos array (supporting legacy)
  const getPhotos = (dataItem: any): string[] => {
      if (!dataItem) return [];
      if (dataItem.photos && dataItem.photos.length > 0) return dataItem.photos;
      if (dataItem.photoUrl) return [dataItem.photoUrl];
      return [];
  };

  // --- SUCCESS VIEW (DOBLE NOTIFICACIÓN) ---
  if (outcome) {
    const isActuallyVisible = report.type !== 'special' ? true : showInCondo;

    return (
      <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-2xl shadow-2xl text-center border-t-8 border-indigo-500 animate-in fade-in zoom-in duration-300">
        
        {/* HEADER DE ESTATUS */}
        <div className="flex flex-col items-center mb-6">
          <div className={`p-4 rounded-full mb-3 ${outcome.status === ReportStatus.APPROVED ? 'bg-green-100' : 'bg-red-100'}`}>
            {outcome.status === ReportStatus.APPROVED ? (
              <Check className="h-10 w-10 text-green-600" />
            ) : (
              <X className="h-10 w-10 text-red-600" />
            )}
          </div>
          <h2 className="text-2xl font-bold text-slate-900">
            {outcome.status === ReportStatus.APPROVED ? 'Validación Completada' : 'Reporte Rechazado'}
          </h2>
          {outcome.status === ReportStatus.APPROVED && (
              <div className="mt-2 flex items-center justify-center space-x-2 text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full text-xs font-bold border border-indigo-100">
                 <FileCheck className="h-4 w-4" />
                 <span>PDF Descargado Automáticamente</span>
              </div>
          )}
        </div>

        <div className="space-y-6 text-left">
            {outcome.status === ReportStatus.APPROVED ? (
               <>
                 {/* Step 1: Tech */}
                 <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 relative overflow-hidden group hover:border-blue-300 transition">
                    <div className="absolute top-0 right-0 bg-slate-200 text-slate-600 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">PASO 1</div>
                    <div className="flex items-start mb-3">
                        <UserCheck className="h-5 w-5 text-blue-600 mr-3 mt-1" />
                        <div>
                            <h3 className="font-bold text-slate-800">Confirmar al Técnico</h3>
                            <p className="text-xs text-slate-500">
                                Nombre: <span className="font-bold">{report.technicianName}</span>
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={sendTechWhatsApp}
                        className="w-full flex items-center justify-center space-x-2 bg-white border border-slate-300 text-slate-700 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 py-3 rounded-lg font-bold transition shadow-sm"
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span>Enviar a: {report.technicianId}</span>
                    </button>
                 </div>
                
                {/* Step 2: Condo - ONLY IF VISIBLE */}
                {isActuallyVisible ? (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-5 relative overflow-hidden shadow-sm">
                        <div className="absolute top-0 right-0 bg-teal-200 text-teal-800 text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">PASO 2</div>
                        <div className="flex items-start mb-4">
                            <Building className="h-5 w-5 text-teal-600 mr-3 mt-1" />
                            <div className="flex-1">
                                <h3 className="font-bold text-teal-900">Enviar Reporte al Condominio</h3>
                                <div className="mt-1 flex items-center justify-between">
                                    {condoContact ? (
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-teal-800 flex items-center">
                                                <UserCheck className="h-3 w-3 mr-1" /> {condoContact.name}
                                            </span>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-red-500 font-bold bg-red-50 px-2 py-1 rounded">
                                            ⚠️ Sin administrador asignado
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* IMPORTANT ALERT */}
                        <div className="mb-4 bg-white border-l-4 border-amber-400 p-3 rounded-r shadow-sm flex items-start">
                            <Paperclip className="h-4 w-4 text-amber-500 mr-2 mt-0.5 flex-shrink-0" />
                            <p className="text-xs text-slate-600">
                                <strong>Importante:</strong> El PDF ya se descargó. Debes adjuntarlo manualmente.
                            </p>
                        </div>

                        <button
                            onClick={sendCondoWhatsApp}
                            disabled={!condoContact?.phone}
                            className="w-full flex items-center justify-center space-x-2 bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-lg font-bold transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Send className="h-4 w-4" />
                            <span>Enviar a: {condoContact?.phone || 'Sin número'}</span>
                        </button>
                    </div>
                ) : (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center text-slate-500 text-sm">
                        <EyeOff className="h-5 w-5 mr-2" />
                        <span>Reporte interno (Oculto al cliente).</span>
                    </div>
                )}
               </>
            ) : (
                 <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
                     <h3 className="font-bold text-red-900 mb-2">Corrección Solicitada</h3>
                     <p className="text-sm text-red-700 mb-4">Debes notificar al técnico sobre los cambios requeridos.</p>
                     <button
                        onClick={sendTechWhatsApp}
                        className="w-full flex items-center justify-center space-x-2 bg-red-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-red-700 transition shadow-lg"
                     >
                        <AlertTriangle className="h-5 w-5" />
                        <span>Enviar a: {report.technicianId}</span>
                     </button>
                 </div>
            )}
        </div>
           
        <button
            onClick={goBackToDashboard}
            className="w-full flex items-center justify-center space-x-2 text-slate-400 px-4 py-3 rounded-xl font-medium hover:text-slate-600 hover:bg-slate-50 transition mt-6"
        >
            <ArrowLeft className="h-4 w-4" />
            <span>Volver al Dashboard</span>
        </button>
      </div>
    );
  }

  // --- REVIEW VIEW ---
  return (
    <div className="max-w-4xl mx-auto pb-48">
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
        <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${report.type === 'special' ? 'from-amber-500 to-orange-600' : 'from-brand-500 to-indigo-600'}`}></div>
        
        <div>
           <div className="flex items-center space-x-3 mb-2">
              <FileText className={`h-6 w-6 ${report.type === 'special' ? 'text-amber-600' : 'text-brand-600'}`} />
              <h1 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">
                  {report.type === 'special' ? 'Reporte Especial' : 'Certificado de Servicio'}
              </h1>
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

      {/* CONTENIDO DEL REPORTE */}
      <div className="bg-white shadow-lg border border-slate-200 overflow-hidden">
        {/* SPECIAL REPORT LAYOUT */}
        {report.type === 'special' ? (
             <div className="p-6">
                 {checklistDef.map((item) => {
                     const data = getValue(item.id);
                     if (!data) return null;
                     const photos = getPhotos(data);
                     
                     return (
                         <div key={item.id} className="mb-6">
                             <h3 className="text-lg font-bold text-slate-800 mb-2">{item.label}</h3>
                             <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                                 {data.value}
                             </div>
                             
                             {/* Evidence Photos */}
                             {photos.length > 0 && (
                                 <div className="mt-4">
                                     <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase">Evidencia Fotográfica</h4>
                                     <div className="flex flex-wrap gap-2">
                                        {photos.map((url, idx) => (
                                            <div key={idx} className="relative group inline-block">
                                                <img 
                                                    src={url} 
                                                    alt={`Evidencia ${idx}`} 
                                                    className="h-32 object-cover rounded-lg border border-slate-300 cursor-pointer shadow-sm hover:opacity-90 transition"
                                                    onClick={() => setGallery({ images: photos, index: idx })}
                                                />
                                            </div>
                                        ))}
                                     </div>
                                 </div>
                             )}
                         </div>
                     );
                 })}
             </div>
        ) : (
            /* STANDARD TABLE LAYOUT */
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
                            // If item is not found in data (e.g. newly added item to checklist but old report), skip or show empty
                            if (!data) return null; 

                            const val = data?.value;
                            const isBool = item.type === 'boolean';
                            const rowBg = idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50';
                            const photos = getPhotos(data);
                            
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
                                            photos.length > 0 ? (
                                                <div className="flex gap-1 justify-center">
                                                    {photos.slice(0, 2).map((url, i) => (
                                                        <div key={i} className="relative group inline-block">
                                                            <img 
                                                                src={url} 
                                                                alt="Evidencia" 
                                                                className="h-10 w-10 object-cover rounded border border-slate-300 cursor-pointer shadow-sm hover:opacity-80 transition z-10 relative bg-white"
                                                                onClick={() => setGallery({ images: photos, index: i })}
                                                            />
                                                        </div>
                                                    ))}
                                                    {photos.length > 2 && (
                                                        <button 
                                                            className="flex items-center justify-center h-10 w-10 bg-slate-100 border border-slate-300 rounded text-xs text-slate-500 font-bold hover:bg-slate-200 transition"
                                                            onClick={() => setGallery({ images: photos, index: 0 })}
                                                        >
                                                            +{photos.length - 2}
                                                        </button>
                                                    )}
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
        )}
      </div>

      {/* ACTIONS FOOTER */}
      {report.status === ReportStatus.PENDING && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-50">
          <div className="max-w-4xl mx-auto space-y-4">
            
            {/* VISIBILITY TOGGLE (ONLY FOR SPECIAL REPORTS) */}
            {report.type === 'special' && (
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                    <div className="flex items-center">
                        {showInCondo ? <Eye className="text-teal-600 h-5 w-5 mr-3" /> : <EyeOff className="text-slate-400 h-5 w-5 mr-3" />}
                        <div>
                            <span className="block text-sm font-bold text-slate-800">
                                {showInCondo ? 'Visible para Condominio' : 'Oculto para Condominio'}
                            </span>
                            <span className="text-xs text-slate-500">
                                {showInCondo 
                                 ? 'El cliente verá este reporte en su dashboard y podrás notificarle.' 
                                 : 'Este reporte será de uso exclusivo para administración interna.'}
                            </span>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={showInCondo} 
                            onChange={(e) => setShowInCondo(e.target.checked)} 
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                    </label>
                </div>
            )}

            <div className="flex space-x-4">
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
                {loadingAction ? 'Procesando...' : 'Validar y Continuar'}
                </button>
            </div>
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

      {/* GALLERY MODAL (CAROUSEL) */}
      {gallery && (
        <div 
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setGallery(null)}
        >
            <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                
                {/* Close Button */}
                <button 
                    onClick={() => setGallery(null)}
                    className="absolute top-4 right-4 text-white bg-white/10 hover:bg-white/20 p-3 rounded-full backdrop-blur-md transition z-20"
                >
                    <X className="h-6 w-6" />
                </button>

                {/* Left Arrow */}
                {gallery.index > 0 && (
                    <button
                        onClick={handlePrevImage}
                        className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition z-20"
                    >
                        <ChevronLeft className="h-8 w-8" />
                    </button>
                )}

                {/* Main Image */}
                <img 
                    src={gallery.images[gallery.index]} 
                    alt={`Evidencia ${gallery.index + 1}`} 
                    className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl animate-in zoom-in-50 duration-300" 
                    onClick={(e) => e.stopPropagation()} 
                />

                {/* Right Arrow */}
                {gallery.index < gallery.images.length - 1 && (
                    <button
                        onClick={handleNextImage}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full backdrop-blur-md transition z-20"
                    >
                        <ChevronRight className="h-8 w-8" />
                    </button>
                )}

                {/* Indicator */}
                <div className="absolute bottom-6 bg-black/60 px-4 py-2 rounded-full text-white text-sm font-medium backdrop-blur-md">
                    Imagen {gallery.index + 1} de {gallery.images.length}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};