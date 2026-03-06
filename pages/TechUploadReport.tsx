import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { CheckCircle, FileUp, Loader2, MessageCircle, Send, FileText } from 'lucide-react';
import { api } from '../services/db';
import { useAuth } from '../contexts/AuthContext';
import { Role, Report } from '../types';
import { generateAdminReviewLink, sendWhatsAppNotification } from '../services/whatsapp';

export const TechUploadReport: React.FC = () => {
  const { machineId } = useParams<{ machineId: string }>();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const reportIdToEdit = searchParams.get('reportId');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notes, setNotes] = useState('');
  const [pdfDataUrl, setPdfDataUrl] = useState('');
  const [pdfName, setPdfName] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<Report | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      if (!reportIdToEdit) return;
      const report = await api.getReportById(reportIdToEdit);
      if (!report) return;

      const noteItem = report.data.find(d => d.itemId === 's_notes');
      const pdfItem = report.data.find(d => d.itemId === 's_pdf');

      setNotes(typeof noteItem?.value === 'string' ? noteItem.value : '');
      setPdfDataUrl(typeof pdfItem?.value === 'string' ? pdfItem.value : '');
      setPdfName(pdfItem?.comment || '');
    };

    loadReport();
  }, [reportIdToEdit]);

  const handleFileChange = (file?: File) => {
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert('Solo se permiten archivos PDF.');
      return;
    }

    const maxSizeMb = 8;
    if (file.size > maxSizeMb * 1024 * 1024) {
      alert(`El PDF excede el limite de ${maxSizeMb} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setPdfDataUrl(reader.result as string);
      setPdfName(file.name);
    };
    reader.onerror = () => {
      alert('No se pudo leer el archivo PDF.');
    };
    reader.readAsDataURL(file);
  };

  const validate = () => {
    if (!user?.phone) {
      alert('Error de perfil: no tienes numero telefonico registrado.');
      return false;
    }

    if (!machineId) {
      alert('No se encontro la maquina.');
      return false;
    }

    if (!pdfDataUrl) {
      alert('Debes seleccionar un archivo PDF.');
      return false;
    }

    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const finalNotes = notes.trim() || `Se adjunta reporte PDF: ${pdfName}`;

      const payload = {
        data: [
          { itemId: 's_notes', value: finalNotes },
          { itemId: 's_pdf', value: pdfDataUrl, comment: pdfName }
        ],
        technicianId: user!.phone!,
        technicianName: user!.name
      };

      if (reportIdToEdit) {
        await api.updateReport(reportIdToEdit, payload);
        const updated = await api.getReportById(reportIdToEdit);
        if (updated) setSubmittedReport(updated);
      } else {
        const newReport = await api.submitReport({
          machineId,
          technicianId: user!.phone!,
          technicianName: user!.name,
          type: 'special',
          data: payload.data
        });
        setSubmittedReport(newReport);
      }
    } catch (error) {
      console.error(error);
      alert('Error al subir el reporte PDF.');
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

      if (!admin?.phone) {
        alert('No se encontro un numero de administrador (Owner).');
        return;
      }

      const link = generateAdminReviewLink(submittedReport.id);
      const message = `✅ *Reporte PDF Subido*\n\nTecnico: ${user?.name}\nMaquina: ${machineId}\nArchivo: ${pdfName}\n\nRevisar aqui: ${link}`;
      sendWhatsAppNotification(admin.phone, message);
      navigate('/tech/scan');
    } catch (error) {
      console.error(error);
      alert('Error al intentar notificar al administrador.');
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
          <h2 className="text-2xl font-bold text-slate-800 mb-2">{reportIdToEdit ? 'Reporte PDF Actualizado' : 'Reporte PDF Enviado'}</h2>
          <p className="text-slate-500 mb-8">Tu archivo ya quedo en espera de validacion.</p>

          <button
            onClick={handleNotifyAdmin}
            disabled={loading}
            className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition shadow-lg disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin mr-2 h-5 w-5" /> : <MessageCircle className="mr-2 h-5 w-5" />}
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
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <FileUp className="h-6 w-6 mr-2 text-brand-600" />
          {reportIdToEdit ? 'Corregir Reporte PDF' : 'Subir Reporte PDF'}
        </h1>
        <p className="text-slate-500 mt-1">
          Maquina: <span className="font-mono font-bold text-brand-600">{machineId}</span>
        </p>
        <p className="text-xs text-slate-400 mt-2">
          Este reporte seguira el flujo normal: quedara en estado pendiente hasta validacion del administrador.
        </p>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-5">
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Archivo PDF *</label>
          <label className="w-full border-2 border-dashed border-slate-300 rounded-xl p-6 flex flex-col items-center justify-center text-slate-500 hover:border-brand-400 hover:bg-brand-50/40 transition cursor-pointer">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0])}
            />
            <FileText className="h-8 w-8 mb-2" />
            <span className="font-medium">{pdfName || 'Seleccionar PDF'}</span>
            <span className="text-xs text-slate-400 mt-1">Tamano maximo: 8 MB</span>
          </label>
        </div>

        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">Descripcion (opcional)</label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm bg-slate-50 focus:bg-white focus:ring-1 focus:ring-brand-400 outline-none resize-none"
            placeholder="Ejemplo: mantenimiento correctivo por cambio de filtro..."
          />
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full flex items-center justify-center bg-brand-600 text-white py-4 rounded-xl font-bold text-lg shadow-lg hover:bg-brand-700 transition disabled:opacity-70"
      >
        {loading ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Send className="h-5 w-5 mr-2" />}
        {loading ? 'Enviando...' : reportIdToEdit ? 'Reenviar Reporte PDF' : 'Finalizar Reporte PDF'}
      </button>
    </div>
  );
};
