import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Report, ReportStatus } from '../types';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST, SPECIAL_CHECKLIST } from '../constants';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// Función interna para dibujar un reporte en una página (o páginas) del documento actual
const addReportToDoc = (doc: jsPDF, report: Report, locationName: string) => {
  // --- DEFINICIÓN DE LISTA SEGÚN TIPO ---
  // Si es mensual, combina checklist semanal + mensual (lógica implementada previamente)
  const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : 
                    report.type === 'monthly' ? [...WEEKLY_CHECKLIST, ...MONTHLY_CHECKLIST] :
                    SPECIAL_CHECKLIST;
                    
  const dateStr = format(new Date(report.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es });
  
  // Título dinámico
  let reportTitle = "REPORTE TÉCNICO DE CALIDAD";
  if (report.type === 'monthly') reportTitle = "REPORTE MENSUAL INTEGRAL";
  if (report.type === 'special') reportTitle = "BITÁCORA DE EVENTOS ESPECIALES";

  // --- 1. HEADER ---
  // Background Color varies by report type
  let headerColor = [15, 23, 42]; // Slate (Default Weekly)
  if (report.type === 'monthly') headerColor = [79, 70, 229]; // Indigo (Monthly)
  if (report.type === 'special') headerColor = [217, 119, 6]; // Amber (Special)

  doc.setFillColor(headerColor[0], headerColor[1], headerColor[2]); 
  doc.rect(0, 0, 210, 40, 'F');

  // Logo logic
  const logoUrl = '/logo.jpg';
  const img = new Image();
  img.src = logoUrl;
  
  try {
     doc.addImage(img, 'JPEG', 15, 10, 20, 20); 
  } catch (e) {
     doc.setFillColor(14, 165, 233); 
     doc.circle(25, 20, 10, 'F');
     doc.setTextColor(255, 255, 255);
     doc.setFontSize(14);
     doc.setFont('helvetica', 'bold');
     doc.text("A/24", 18, 22); 
  }

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.text("Agua/24", 45, 18);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(255, 255, 255); 
  doc.text(reportTitle, 45, 24);

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

  // --- SPECIAL REPORT LAYOUT ---
  if (report.type === 'special') {
      const notesItem = report.data.find(d => d.itemId === 's_notes');
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text("DESCRIPCIÓN DEL EVENTO", 15, 70);
      
      // Box for text
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, 75, 180, 80); 
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(51, 65, 85);
      
      // Word wrap text
      const splitText = doc.splitTextToSize(notesItem?.value as string || "Sin descripción", 170);
      doc.text(splitText, 20, 82);
      
      currentY = 165;

      // Image
      if (notesItem?.photoUrl) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text("EVIDENCIA FOTOGRÁFICA", 15, currentY);
          
          try {
              doc.addImage(notesItem.photoUrl, 'JPEG', 15, currentY + 5, 120, 90);
          } catch (e) {
              doc.text("(Error cargando imagen)", 15, currentY + 10);
          }
      }
      
  } else {
      // --- STANDARD & MONTHLY REPORT LAYOUT ---

      // --- GRÁFICOS DE CALIDAD (GAUGES) - Solo si tiene datos químicos (Semanal o Mensual hibrido) ---
      const hasChemData = report.data.some(d => ['w_ph', 'w_tds'].includes(d.itemId));

      if (hasChemData) {
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

              doc.setFillColor(226, 232, 240);
              doc.roundedRect(x, y, width, height, 2, 2, 'F');

              let pct = value / totalScale;
              if (pct > 1) pct = 1;
              if (pct < 0) pct = 0;
              
              let color = [34, 197, 94]; 
              if (min !== undefined && value < min) color = [239, 68, 68];
              if (max !== undefined && value > max) color = [239, 68, 68];

              doc.setFillColor(color[0], color[1], color[2]);
              doc.roundedRect(x, y, width * pct, height, 2, 2, 'F');

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

          drawGauge("pH (Acidez)", ph, "pH", 15, currentY + 5, 6.5, 8.5, 14);
          drawGauge("TDS (Sólidos)", tds, "ppm", 110, currentY + 5, 50, 300, 400); 
          drawGauge("Cloro Libre", cl, "mg/L", 15, currentY + 25, 0.2, 1.5, 3);
          drawGauge("Dureza", hard, "mg/L", 110, currentY + 25, undefined, 200, 300);

          currentY += 45; 
      }

      // --- 3. TABLA DE DATOS ---
      // Excluir SOLAMENTE Ventas Totales (w13) y Resetear Ventas (w_reset_sales)
      const excludedIds = ['w13', 'w_reset_sales']; 
      
      const visibleChecklist = checklist.filter(item => !excludedIds.includes(item.id));

      const tableBody = visibleChecklist.map((item) => {
        const dataItem = report.data.find(d => d.itemId === item.id);
        const value = dataItem?.value;
        const comment = dataItem?.comment || '';
        
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
  }
};

// --- FUNCIÓN PÚBLICA: Generar PDF Individual ---
export const generateReportPDF = (report: Report, locationName: string, isPublicVersion: boolean = false) => {
  const doc = new jsPDF();
  addReportToDoc(doc, report, locationName);
  
  // Footer
  const pageCount = (doc as any).internal.getNumberOfPages();
  for(let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Página ${i} de ${pageCount} - Generado por Agua/24`, 105, 290, { align: 'center' });
  }

  doc.save(`Reporte_${report.type}_${report.machineId}_${format(new Date(), 'yyyyMMdd')}.pdf`);
};

// NOTA: Se eliminó generateMonthlyBundlePDF para asegurar que solo se descarguen reportes individuales.
