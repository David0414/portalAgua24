import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, ReportStatus, ChecklistItemDefinition } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST } from '../constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const generateReportPDF = (report: Report, locationName: string) => {
  const doc = new jsPDF();
  const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;
  const dateStr = format(new Date(report.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es });

  // --- HEADER ---
  // Fondo azul superior
  doc.setFillColor(14, 165, 233); // Brand-500
  // CORRECCIÓN: Se cambió 21s0 por 210
  doc.rect(0, 0, 210, 40, 'F');

  // Logo Text (Simulado)
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text("Agua/24", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text("Certificado de Calidad y Mantenimiento", 14, 28);

  // Status Badge visual
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(150, 10, 45, 12, 2, 2, 'F');
  
  if (report.status === ReportStatus.APPROVED) {
      doc.setTextColor(22, 163, 74); // Green
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text("VALIDADO", 158, 18);
  } else {
      doc.setTextColor(220, 38, 38); // Red
      doc.text(report.status === ReportStatus.PENDING ? "PENDIENTE" : "RECHAZADO", 155, 18);
  }

  // --- INFO BLOCK ---
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  
  let y = 50;
  doc.text("Ubicación:", 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(locationName, 40, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.text("ID Máquina:", 14, y);
  doc.setFont('helvetica', 'normal');
  doc.text(report.machineId, 40, y);

  doc.setFont('helvetica', 'bold');
  doc.text("Fecha:", 120, y-6); // Alineado con Ubicación
  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 140, y-6);

  doc.setFont('helvetica', 'bold');
  doc.text("Técnico:", 120, y);
  doc.setFont('helvetica', 'normal');
  doc.text(report.technicianName, 140, y);

  // --- TABLE ---
  const tableRows = checklist.map((item) => {
    const dataItem = report.data.find(d => d.itemId === item.id);
    const value = dataItem?.value;
    
    let displayValue = '--';
    if (value !== undefined && value !== '') {
        if (item.type === 'boolean') {
            displayValue = value ? 'Cumple / Hecho' : 'No Cumple';
        } else {
            displayValue = `${value} ${item.unit || ''}`;
        }
    }

    // Status column logic
    let status = 'N/A';
    if (item.type === 'boolean') {
        status = value ? 'OK' : 'FALLO';
    } else {
        // Simple logic check based on reference (just visual for PDF)
        status = (value !== undefined && value !== '') ? 'Registrado' : 'Pendiente';
    }

    return [
        item.label,
        `${item.reference || '-'} ${item.unit || ''}`, // REFERENCIA
        displayValue, // VALOR REAL
        status
    ];
  });

  autoTable(doc, {
    startY: 70,
    head: [['Parámetro de Control', 'Referencia (Ideal)', 'Resultado', 'Estado']],
    body: tableRows,
    theme: 'grid',
    headStyles: { fillColor: [240, 240, 240], textColor: [60, 60, 60], fontStyle: 'bold' },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
        0: { cellWidth: 80 }, // Parámetro
        1: { cellWidth: 40 }, // Referencia
        2: { cellWidth: 35 }, // Resultado
        3: { cellWidth: 30 }  // Estado
    },
    didParseCell: function(data) {
        // Colorear status
        if (data.section === 'body' && data.column.index === 3) {
            if (data.cell.raw === 'OK' || data.cell.raw === 'Registrado') {
                data.cell.styles.textColor = [22, 163, 74]; // Green
            } else if (data.cell.raw === 'FALLO') {
                data.cell.styles.textColor = [220, 38, 38]; // Red
            }
        }
    }
  });

  // --- FOOTER ---
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text("Este documento es un reporte generado automáticamente por el sistema Agua/24.", 14, 280);
  doc.text("Para verificar la autenticidad, contacte a la administración.", 14, 285);

  // Save
  doc.save(`Reporte_${report.machineId}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};