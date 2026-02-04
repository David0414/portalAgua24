import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, ReportStatus } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST } from '../constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const generateReportPDF = (report: Report, locationName: string) => {
  const doc = new jsPDF();
  const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;
  const dateStr = format(new Date(report.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es });

  // --- 1. HEADER DISEÑO PREMIUM ---
  
  // Fondo superior Azul
  doc.setFillColor(15, 23, 42); // Slate-900 (Dark Blue)
  doc.rect(0, 0, 210, 45, 'F');

  // LOGO PLACEHOLDER (Simulado con círculo y texto, reemplaza URL si tienes una real)
  doc.setFillColor(14, 165, 233); // Brand Blue
  doc.circle(25, 22, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text("A/24", 17, 24); // Texto dentro del logo

  // Título Empresa
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text("Agua/24", 45, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184); // Slate-400
  doc.text("SERVICIO DE MANTENIMIENTO INTEGRAL", 45, 26);

  // Status Badge (Esquina Derecha)
  const isApproved = report.status === ReportStatus.APPROVED;
  doc.setFillColor(isApproved ? 34 : 220, isApproved ? 197 : 38, isApproved ? 94 : 38); // Green-500 or Red-600
  doc.roundedRect(155, 12, 40, 10, 2, 2, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  const statusText = isApproved ? "CERTIFICADO" : "REVISIÓN";
  doc.text(statusText, 175, 18, { align: 'center' });

  // --- 2. INFORMACIÓN DEL SERVICIO ---
  doc.setFillColor(241, 245, 249); // Slate-100 background strip
  doc.rect(0, 45, 210, 25, 'F');

  doc.setTextColor(71, 85, 105);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  // Fila 1 de datos
  doc.text("UBICACIÓN:", 15, 55);
  doc.text("FECHA:", 110, 55);
  
  doc.setFont('helvetica', 'normal');
  doc.text(locationName, 35, 55);
  doc.text(dateStr, 125, 55);

  // Fila 2 de datos
  doc.setFont('helvetica', 'bold');
  doc.text("ID MÁQUINA:", 15, 63);
  doc.text("TÉCNICO:", 110, 63);

  doc.setFont('helvetica', 'normal');
  doc.text(report.machineId, 36, 63);
  doc.text(report.technicianName, 128, 63);

  // --- 3. GRÁFICOS VISUALES (4 GRÁFICOS SOLICITADOS) ---
  // Solo si es reporte semanal, donde tenemos estos datos numéricos
  
  let currentY = 85;

  if (report.type === 'weekly') {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("ANÁLISIS DE CALIDAD DE AGUA", 15, currentY);
      
      doc.setDrawColor(203, 213, 225);
      doc.line(15, currentY + 2, 195, currentY + 2);
      currentY += 10;

      // Helper para obtener valor numérico
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

      // Helper para definiciones
      const getItem = (id: string) => WEEKLY_CHECKLIST.find(i => i.id === id);

      const phItem = getItem('w_ph');
      const clItem = getItem('w_cl');
      const tdsItem = getItem('w_tds');
      const hardItem = getItem('w_hardness');

      // Helper para dibujar barra
      const drawBar = (label: string, val: number, maxRange: number, unit: string, x: number, y: number, isGood: boolean) => {
          doc.setFontSize(9);
          doc.setTextColor(100, 116, 139);
          doc.text(label, x, y);

          // Valor Texto
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`${val} ${unit}`, x + 80, y, { align: 'right' });

          // Fondo Barra
          doc.setFillColor(226, 232, 240);
          doc.roundedRect(x, y + 3, 80, 4, 1, 1, 'F');

          // Barra Valor
          let percentage = val / maxRange;
          if (percentage > 1) percentage = 1;
          const barWidth = 80 * percentage;
          
          // Color (Green if good, Red if bad)
          if (isGood) doc.setFillColor(34, 197, 94); // Green
          else doc.setFillColor(239, 68, 68); // Red

          doc.roundedRect(x, y + 3, barWidth, 4, 1, 1, 'F');
      };

      // Fila 1 de Gráficos (pH y TDS)
      // pH Logic: Valid if between min and max (6.5 - 8.5)
      const phMin = phItem?.min || 6.5;
      const phMax = phItem?.max || 8.5;
      const isPhGood = (ph >= phMin && ph <= phMax);
      drawBar("pH (Acidez)", ph, 14, "pH", 15, currentY, isPhGood);

      // TDS Logic: Valid if between min and max
      const tdsMax = tdsItem?.max || 300;
      const isTdsGood = (tds <= tdsMax);
      drawBar("TDS (Pureza)", tds, 400, "ppm", 110, currentY, isTdsGood);
      
      currentY += 15;

      // Fila 2 de Gráficos (Cloro y Dureza)
      const clMin = clItem?.min || 0.2;
      const clMax = clItem?.max || 1.5;
      const isClGood = (cl >= clMin && cl <= clMax);
      drawBar("Cloro Libre", cl, 3, "mg/L", 15, currentY, isClGood);

      const hardMax = hardItem?.max || 200;
      const isHardGood = (hard <= hardMax);
      drawBar("Dureza", hard, 300, "mg/L", 110, currentY, isHardGood);

      currentY += 20;
  }

  // --- 4. TABLA DETALLADA ---
  
  const tableBody = checklist.map((item) => {
    const dataItem = report.data.find(d => d.itemId === item.id);
    const value = dataItem?.value;
    const comment = dataItem?.comment || '';
    const photoUrl = dataItem?.photoUrl || '';
    
    let displayValue = '--';
    if (value !== undefined && value !== '') {
        if (item.type === 'boolean') {
            displayValue = value ? 'Cumple' : 'No Cumple';
        } else {
            displayValue = `${value} ${item.unit || ''}`;
        }
    }

    return [
        item.label,
        `${item.reference || '-'} ${item.unit || ''}`,
        displayValue,
        comment,
        photoUrl
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Punto de Control', 'Ref. Ideal', 'Resultado', 'Notas', 'Evidencia']],
    body: tableBody,
    theme: 'grid',
    headStyles: { 
        fillColor: [30, 41, 59], // Slate-800
        textColor: [255, 255, 255], 
        fontStyle: 'bold',
        lineWidth: 0,
        fontSize: 9
    },
    styles: { 
        fontSize: 8, 
        cellPadding: 4, 
        textColor: [51, 65, 85],
        valign: 'middle',
        minCellHeight: 14
    },
    columnStyles: {
        0: { cellWidth: 55 }, 
        1: { cellWidth: 30 }, 
        2: { cellWidth: 25, fontStyle: 'bold' }, 
        3: { cellWidth: 45 }, 
        4: { cellWidth: 25 }
    },
    didParseCell: function(data) {
        if (data.section === 'body' && data.column.index === 2) {
            const text = data.cell.raw as string;
            if (text === 'Cumple') data.cell.styles.textColor = [22, 163, 74];
            if (text === 'No Cumple') data.cell.styles.textColor = [220, 38, 38];
        }
    },
    didDrawCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
            const rawImage = data.cell.raw as string;
            if (rawImage && rawImage.length > 100) { 
                try {
                    const imgSize = 10;
                    const posX = data.cell.x + (data.cell.width - imgSize) / 2;
                    const posY = data.cell.y + (data.cell.height - imgSize) / 2;
                    doc.addImage(rawImage, 'JPEG', posX, posY, imgSize, imgSize);
                } catch (e) { }
            }
        }
    },
    willDrawCell: function(data) {
        if (data.section === 'body' && data.column.index === 4) {
            data.cell.text = [];
        }
    }
  });

  // --- FOOTER ---
  const finalY = (doc as any).lastAutoTable.finalY + 15;
  
  doc.setDrawColor(226, 232, 240);
  doc.line(15, 280, 195, 280);

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Este documento certifica que el equipo ha sido inspeccionado según los estándares de calidad de Agua/24.", 15, 285);
  doc.text(`Generado: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 15, 290);
  doc.text("Agua/24 - Siempre pura.", 195, 290, { align: 'right' });

  doc.save(`Reporte_${report.machineId}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};