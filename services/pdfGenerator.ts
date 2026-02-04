import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, ReportStatus, ChecklistValue } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST } from '../constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const generateReportPDF = (report: Report, locationName: string, isPublicVersion: boolean = false) => {
  const doc = new jsPDF();
  const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;
  const dateStr = format(new Date(report.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es });

  // --- 1. HEADER ---
  doc.setFillColor(15, 23, 42); 
  doc.rect(0, 0, 210, 40, 'F');

  doc.setFillColor(14, 165, 233); 
  doc.circle(25, 20, 10, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text("A/24", 18, 22); 

  doc.setFontSize(22);
  doc.text("Agua/24", 45, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); 
  doc.text("REPORTE TÉCNICO DE CALIDAD", 45, 24);

  const isApproved = report.status === ReportStatus.APPROVED;
  doc.setFillColor(isApproved ? 34 : 220, isApproved ? 197 : 38, isApproved ? 94 : 38); 
  doc.roundedRect(160, 10, 35, 8, 1, 1, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text(isApproved ? "VALIDADO" : "REVISIÓN", 177.5, 15, { align: 'center' });

  // INFO BAR
  doc.setFillColor(241, 245, 249); 
  doc.rect(0, 40, 210, 20, 'F');
  
  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  
  doc.setFont('helvetica', 'bold');
  doc.text("SITIO:", 15, 48);
  doc.text("ID:", 15, 54);
  
  doc.setFont('helvetica', 'normal');
  doc.text(locationName.substring(0, 35), 30, 48);
  doc.text(report.machineId, 30, 54);

  doc.setFont('helvetica', 'bold');
  doc.text("FECHA:", 110, 48);
  doc.text("TÉCNICO:", 110, 54);

  doc.setFont('helvetica', 'normal');
  doc.text(dateStr, 130, 48);
  doc.text(report.technicianName, 130, 54);

  let currentY = 75;

  // --- 2. GRÁFICOS DE CALIDAD (GAUGES) ---
  if (report.type === 'weekly') {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("INDICADORES DE CALIDAD", 15, 70);
      doc.setDrawColor(203, 213, 225);
      doc.line(15, 72, 195, 72);

      const getVal = (id: string): number => {
          const item = report.data.find(d => d.itemId === id);
          if (item && item.value) {
              const num = parseFloat(item.value.toString().replace(/[^0-9.]/g, ''));
              return isNaN(num) ? 0 : num;
          }
          return 0;
      };

      const ph = getVal('w_ph');
      const cl = getVal('w_cl');
      const tds = getVal('w_tds');
      const hard = getVal('w_hardness');

      // Función para dibujar una barra de progreso estilo "Gauge"
      const drawGauge = (label: string, value: number, unit: string, x: number, y: number, min: number | undefined, max: number | undefined, totalScale: number) => {
          const width = 80;
          const height = 6;
          
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(71, 85, 105);
          doc.text(label, x, y - 2);
          
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`${value} ${unit}`, x + width, y - 2, { align: 'right' });

          // Fondo Barra
          doc.setFillColor(226, 232, 240);
          doc.roundedRect(x, y, width, height, 2, 2, 'F');

          // Calcular porcentaje
          let pct = value / totalScale;
          if (pct > 1) pct = 1;
          if (pct < 0) pct = 0;
          
          // Color Lógica
          let color = [34, 197, 94]; // Green
          if (min !== undefined && value < min) color = [239, 68, 68]; // Red (Low)
          if (max !== undefined && value > max) color = [239, 68, 68]; // Red (High)

          doc.setFillColor(color[0], color[1], color[2]);
          doc.roundedRect(x, y, width * pct, height, 2, 2, 'F');

          // Líneas de Referencia
          doc.setDrawColor(100, 116, 139);
          doc.setLineWidth(0.3);

          if (min !== undefined) {
              const minX = x + (min / totalScale) * width;
              doc.line(minX, y - 2, minX, y + height + 2);
              doc.setFontSize(6);
              doc.setTextColor(100, 116, 139);
              doc.text(`${min}`, minX, y + height + 5, { align: 'center' });
          }

          if (max !== undefined) {
              const maxX = x + (max / totalScale) * width;
              doc.line(maxX, y - 2, maxX, y + height + 2);
              doc.setFontSize(6);
              doc.setTextColor(100, 116, 139);
              doc.text(`${max}`, maxX, y + height + 5, { align: 'center' });
          }
      };

      // Fila 1
      drawGauge("pH (Acidez)", ph, "pH", 15, currentY + 5, 6.5, 8.5, 14);
      drawGauge("TDS (Sólidos)", tds, "ppm", 110, currentY + 5, 50, 300, 400); // 400 scale for headroom
      
      // Fila 2
      drawGauge("Cloro Libre", cl, "mg/L", 15, currentY + 25, 0.2, 1.5, 3);
      drawGauge("Dureza", hard, "mg/L", 110, currentY + 25, undefined, 200, 300);

      currentY += 45;
  }

  // --- 3. TABLA DE DATOS (SIN FOTOS INCRUSTADAS) ---
  
  const visibleChecklist = isPublicVersion 
      ? checklist.filter(item => !item.private) 
      : checklist;

  const tableBody = visibleChecklist.map((item) => {
    const dataItem = report.data.find(d => d.itemId === item.id);
    const value = dataItem?.value;
    const comment = dataItem?.comment || '';
    
    // NOTE: Photos are excluded from the PDF to keep it short.
    
    let displayValue = '--';
    if (value !== undefined && value !== '') {
        if (item.type === 'boolean') {
            displayValue = value ? 'Sí / Cumple' : 'No Cumple';
        } else {
            displayValue = `${value} ${item.unit || ''}`;
        }
    }

    return [
        item.label,
        `${item.reference || '-'}`,
        displayValue,
        comment
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Punto de Control', 'Ref.', 'Resultado', 'Notas']],
    body: tableBody,
    theme: 'grid',
    headStyles: { 
        fillColor: [248, 250, 252], 
        textColor: [15, 23, 42],
        fontStyle: 'bold',
        lineWidth: 0.1,
        lineColor: [226, 232, 240],
        fontSize: 8
    },
    styles: { 
        fontSize: 8, 
        cellPadding: 3, 
        textColor: [51, 65, 85],
        valign: 'middle',
        lineWidth: 0.1,
        lineColor: [226, 232, 240]
    },
    columnStyles: {
        0: { cellWidth: 70 }, 
        1: { cellWidth: 35 }, 
        2: { cellWidth: 35, fontStyle: 'bold' }, 
        3: { cellWidth: 50, fontStyle: 'italic', textColor: [100, 116, 139] }
    },
    didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 2) {
            const text = data.cell.raw as string;
            if (text.includes('No Cumple')) data.cell.styles.textColor = [220, 38, 38];
            else if (text.includes('Cumple')) data.cell.styles.textColor = [22, 163, 74];
        }
    }
  });

  // --- FOOTER GLOBAL ---
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${pageCount} - Generado por Agua/24`, 105, 290, { align: 'center' });
  }

  doc.save(`Reporte_${report.machineId}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};