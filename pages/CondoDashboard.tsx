import React, { useEffect, useState, useMemo } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus, Machine } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, Info, Activity, TestTube, Download, FileText, Check, AlertCircle, Shield, Calendar, Eye, X, Image as ImageIcon, ZoomIn, Clock, Maximize2, AlertOctagon, ChevronRight } from 'lucide-react';
import { format, differenceInDays, subMonths, isAfter, parseISO, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Brush } from 'recharts';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST, SPECIAL_CHECKLIST } from '../constants';
import { generateReportPDF } from '../services/pdfGenerator';

type TimeRange = 'latest' | '1m' | '3m' | '6m';

const getCondoTableData = (report: Report | null) => {
    if (!report) return [];
    
    // For Special reports, we manually construct the display data
    if (report.type === 'special') {
         const dataItem = report.data.find(d => d.itemId === 's_notes');
         return [{
             label: 'Descripción de Evento',
             reference: 'N/A',
             unit: '',
             type: 'text',
             value: dataItem?.value,
             photoUrl: dataItem?.photoUrl 
         }];
    }

    const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;
    
    return checklist
      .filter(item => !item.private)
      .map(item => {
          const dataItem = report.data.find(d => d.itemId === item.id);
          return {
              label: item.label,
              reference: item.reference,
              unit: item.unit,
              type: item.type,
              value: dataItem?.value,
              photoUrl: dataItem?.photoUrl
          };
      });
};

interface QualityChartProps {
  title: string;
  icon: React.ReactNode;
  data: any[];
  dataKey: string;
  color: string;
  unit: string;
  min?: number;
  max?: number;
  isLatest: boolean;
  onExpand: () => void;
}

const QualityChart: React.FC<QualityChartProps> = ({ 
  title, icon, data, dataKey, color, unit, min, max, isLatest, onExpand 
}) => {
  const latestVal = data.length > 0 ? data[data.length - 1][dataKey] : null;

  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
       <div className="flex justify-between items-center mb-4">
           <div className="flex items-center text-sm font-bold text-slate-600">
               {icon} {title}
           </div>
           <div className="flex items-center gap-2">
              {latestVal !== null && latestVal !== undefined && (
                  <div className="text-xl font-black" style={{ color }}>
                      {latestVal} <span className="text-xs text-slate-400 font-normal">{unit}</span>
                  </div>
              )}
              <button 
                  onClick={onExpand}
                  className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded transition"
                  title="Ampliar Gráfica"
              >
                  <Maximize2 className="h-4 w-4" />
              </button>
           </div>
       </div>
       
       <div className="h-[200px]">
           {data.length === 0 ? (
               <div className="h-full flex items-center justify-center text-slate-300 text-xs">Sin datos</div>
           ) : isLatest ? (
               <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={data} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                       <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                       <XAxis type="number" domain={[0, (max ? max * 1.5 : 'auto')]} hide />
                       <YAxis type="category" dataKey="date" hide />
                       <Tooltip 
                           cursor={{fill: 'transparent'}}
                           content={({ payload }) => {
                               if (payload && payload.length) {
                                   return (
                                       <div className="bg-slate-800 text-white text-xs p-2 rounded shadow">
                                           {payload[0].value} {unit}
                                       </div>
                                   );
                               }
                               return null;
                           }}
                       />
                       <Bar dataKey={dataKey} fill={color} barSize={40} radius={[0, 4, 4, 0]} />
                       {max && <ReferenceLine x={max} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Max', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />}
                       {min && <ReferenceLine x={min} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />}
                   </BarChart>
               </ResponsiveContainer>
           ) : (
               <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={data}>
                       <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                       <XAxis dataKey="shortDate" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                       <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} width={30} />
                       <Tooltip 
                           contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                           labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}
                           formatter={(value: any) => [`${value} ${unit}`, title]}
                       />
                       {max && <ReferenceLine y={max} stroke="#ef4444" strokeDasharray="3 3" />}
                       {min && <ReferenceLine y={min} stroke="#ef4444" strokeDasharray="3 3" />}
                       <Line 
                           type="monotone" 
                           dataKey={dataKey} 
                           stroke={color} 
                           strokeWidth={3} 
                           dot={{ r: 3, fill: 'white', strokeWidth: 2 }}
                           activeDot={{ r: 6 }}
                       />
                   </LineChart>
               </ResponsiveContainer>
           )}
       </div>
    </div>
  );
};

export const CondoDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Report[]>([]);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [machineInfo, setMachineInfo] = useState<Machine | null>(null);
  const [specialReports, setSpecialReports] = useState<Report[]>([]);
  
  // NEW TIME RANGE STATE
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');

  // State for Report Details Modal
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  // State for Image Preview Modal
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  // State for Full Screen Chart
  const [expandedChart, setExpandedChart] = useState<any | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const dbUsers = await api.getUsers();
      const freshUser = dbUsers.find(u => u.id === user?.id);
      const machineId = freshUser?.assignedMachineId;

      if (!machineId) {
        setLoading(false);
        return; 
      }

      const machineDetails = await api.getMachine(machineId);
      if (machineDetails) {
         setMachineInfo(machineDetails);
      }

      const machineReports = await api.getReportsByMachine(machineId, 50);
      const approvedReports = machineReports.filter(r => r.status === ReportStatus.APPROVED);

      // Separate standard reports from special reports
      const standardReports = approvedReports.filter(r => r.type !== 'special');
      const specialReps = approvedReports.filter(r => r.type === 'special');

      setHistory(approvedReports); 
      setLatestReport(standardReports[0] || null); 
      setSpecialReports(specialReps);
      setLoading(false);
    };
    
    if(user) fetch();
  }, [user]);

  // --- CHART DATA PREPARATION WITH TIME FILTER ---
  const chartData = useMemo(() => {
      let filteredReports = history.filter(r => r.type === 'weekly');

      // Filter by Time Range
      const now = new Date();
      if (timeRange === 'latest') {
          filteredReports = filteredReports.slice(0, 1);
      } else {
          let cutoffDate = new Date();
          if (timeRange === '1m') cutoffDate = subMonths(now, 1);
          if (timeRange === '3m') cutoffDate = subMonths(now, 3);
          if (timeRange === '6m') cutoffDate = subMonths(now, 6);
          
          filteredReports = filteredReports.filter(r => isAfter(new Date(r.createdAt), cutoffDate));
      }

      // Transform and Reverse (Oldest -> Newest)
      return filteredReports.reverse().map(r => {
        const getVal = (id: string, allowZero = false) => {
            const item = r.data.find(i => i.itemId === id);
            if (!item || item.value === undefined || item.value === '') return null;
            
            const cleanStr = item.value.toString().replace(',', '.');
            const num = parseFloat(cleanStr);
            
            if (isNaN(num)) return null;
            if (!allowZero && num === 0) return null;
            
            return num;
        };

        return {
          date: format(new Date(r.createdAt), 'dd/MM HH:mm'),
          shortDate: format(new Date(r.createdAt), 'dd MMM'),
          fullDate: format(new Date(r.createdAt), "dd 'de' MMMM, HH:mm", { locale: es }),
          tds: getVal('w_tds', false),     
          ph: getVal('w_ph', false),       
          cl: getVal('w_cl', true),        
          hard: getVal('w_hardness', true) 
        };
      });
  }, [history, timeRange]);

  const handleDownloadReport = (e: React.MouseEvent, report: Report) => {
      e.stopPropagation();
      if (machineInfo) {
          generateReportPDF(report, machineInfo.location, true);
      }
  };

  const isImageExpired = (reportDate: string) => {
      return differenceInDays(new Date(), new Date(reportDate)) > 60;
  };

  const getNextVisitDisplay = () => {
      if (!machineInfo || !machineInfo.nextWeeklyVisit) return null;
      
      const date = parseISO(machineInfo.nextWeeklyVisit);
      const isLate = isPast(date) && !isToday(date);
      
      let label = format(date, "EEEE d 'de' MMMM", { locale: es });
      if (isToday(date)) label = "Hoy";
      if (isTomorrow(date)) label = "Mañana";

      const daysDiff = differenceInDays(date, new Date());
      let diffText = "";
      if (daysDiff > 1 && daysDiff < 7) diffText = `(En ${daysDiff} días)`;
      
      return { label, isLate, diffText };
  };

  const nextVisit = getNextVisitDisplay();

  if (loading) return <div className="flex justify-center items-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;

  if (!machineInfo) {
    return (
      <div className="text-center p-10 bg-white rounded-xl shadow border border-slate-100 mt-10 max-w-lg mx-auto">
        <Info className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Sin Máquina Asignada</h2>
        <p className="text-slate-500 mt-2">Tu cuenta aún no ha sido vinculada a una purificadora.</p>
        <button onClick={logout} className="px-6 py-2 border border-teal-600 text-teal-600 rounded-lg font-bold hover:bg-teal-50 transition">Cerrar Sesión</button>
      </div>
    );
  }

  const condoTableData = getCondoTableData(latestReport);

  // Chart References
  const tdsDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_tds');
  const phDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_ph');
  const clDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_cl');
  const hardDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_hardness');

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-500">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{machineInfo.location}</h1>
          <p className="text-slate-500 mt-1">
            Sistema de Purificación Central | ID: <span className="font-mono font-bold text-teal-600">{machineInfo.id}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100">
           <Shield className="h-4 w-4" />
           <span className="font-bold text-sm">Calidad Certificada</span>
        </div>
      </div>

      {/* --- NEXT VISIT CARD --- */}
      {nextVisit && (
          <div className={`rounded-xl p-4 border flex items-center shadow-sm ${nextVisit.isLate ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}>
              <div className={`p-3 rounded-full mr-4 ${nextVisit.isLate ? 'bg-amber-100' : 'bg-teal-100'}`}>
                  <Calendar className={`h-6 w-6 ${nextVisit.isLate ? 'text-amber-600' : 'text-teal-600'}`} />
              </div>
              <div>
                  <h3 className={`text-sm font-bold uppercase ${nextVisit.isLate ? 'text-amber-800' : 'text-teal-800'}`}>
                      {nextVisit.isLate ? 'Visita Pendiente' : 'Próxima Visita Programada'}
                  </h3>
                  <p className="text-lg font-bold text-slate-800 capitalize">
                      {nextVisit.label} <span className="text-sm font-normal text-slate-500">{nextVisit.diffText}</span>
                  </p>
              </div>
          </div>
      )}

      {/* --- SPECIAL REPORTS SECTION (BITÁCORA DE EVENTOS) --- */}
      {specialReports.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center">
                  <AlertOctagon className="h-5 w-5 mr-2 text-slate-600" />
                  <h2 className="text-lg font-bold text-slate-800">
                      Bitácora de Eventos Especiales
                  </h2>
              </div>
              <div className="divide-y divide-slate-100">
                  {specialReports.slice(0, 3).map(report => (
                      <div key={report.id} className="p-4 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3" onClick={() => setSelectedReport(report)}>
                          <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                  <span className="text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">
                                      {format(new Date(report.createdAt), 'dd MMM yyyy')}
                                  </span>
                                  <span className="text-xs text-slate-400">
                                      {format(new Date(report.createdAt), 'HH:mm')} hrs
                                  </span>
                              </div>
                              <p className="text-sm text-slate-700 font-medium line-clamp-1">
                                  {report.data[0]?.value as string || 'Detalles del reporte...'}
                              </p>
                          </div>
                          <div className="flex items-center gap-2 self-end sm:self-auto">
                              <button 
                                onClick={(e) => handleDownloadReport(e, report)}
                                className="text-slate-400 hover:text-indigo-600 p-2 rounded-full hover:bg-indigo-50 transition"
                                title="Descargar PDF"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              <ChevronRight className="h-5 w-5 text-slate-300" />
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* TIME FILTER CONTROLS */}
      <div className="flex justify-end mt-4">
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex">
            {[
                { id: 'latest', label: 'Último Reporte' },
                { id: '1m', label: '1 Mes' },
                { id: '3m', label: '3 Meses' },
                { id: '6m', label: '6 Meses' }
            ].map((t) => (
                <button
                    key={t.id}
                    onClick={() => setTimeRange(t.id as TimeRange)}
                    className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
                        timeRange === t.id 
                        ? 'bg-teal-50 text-teal-700 shadow-sm ring-1 ring-teal-200' 
                        : 'text-slate-500 hover:text-teal-600 hover:bg-slate-50'
                    }`}
                >
                    {t.label}
                </button>
            ))}
        </div>
      </div>

      {/* 4 CHART GRID (Dashboard Visualizations) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QualityChart 
            title="Sólidos Disueltos Totales (TDS)" icon={<Activity className="mr-2 text-teal-500 h-4 w-4" />}
            data={chartData} dataKey="tds" color="#d946ef" unit="ppm" min={tdsDef?.min} max={tdsDef?.max} isLatest={timeRange === 'latest'}
            onExpand={() => setExpandedChart({ title: "TDS (Sólidos Disueltos Totales)", icon: <Activity className="text-white h-5 w-5"/>, dataKey: "tds", color: "#d946ef", unit: "ppm", min: tdsDef?.min, max: tdsDef?.max })}
        />
        <QualityChart 
            title="Nivel de pH" icon={<TestTube className="mr-2 text-indigo-500 h-4 w-4" />}
            data={chartData} dataKey="ph" color="#6366f1" unit="pH" min={phDef?.min} max={phDef?.max} isLatest={timeRange === 'latest'}
            onExpand={() => setExpandedChart({ title: "pH (Potencial de Hidrógeno)", icon: <TestTube className="text-white h-5 w-5"/>, dataKey: "ph", color: "#6366f1", unit: "pH", min: phDef?.min, max: phDef?.max })}
        />
        <QualityChart 
            title="Cloro Libre" icon={<Droplets className="mr-2 text-cyan-500 h-4 w-4" />}
            data={chartData} dataKey="cl" color="#06b6d4" unit="mg/L" min={clDef?.min} max={clDef?.max} isLatest={timeRange === 'latest'}
            onExpand={() => setExpandedChart({ title: "Cloro (Cloro Libre)", icon: <Droplets className="text-white h-5 w-5"/>, dataKey: "cl", color: "#06b6d4", unit: "mg/L", min: clDef?.min, max: clDef?.max })}
        />
        <QualityChart 
            title="Dureza Total" icon={<Shield className="mr-2 text-purple-500 h-4 w-4" />}
            data={chartData} dataKey="hard" color="#8b5cf6" unit="mg/L" min={0} max={hardDef?.max} isLatest={timeRange === 'latest'}
            onExpand={() => setExpandedChart({ title: "Dureza (Dureza Total)", icon: <Shield className="text-white h-5 w-5"/>, dataKey: "hard", color: "#8b5cf6", unit: "mg/L", min: 0, max: hardDef?.max })}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Report Detail Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Resumen Última Visita</h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border flex items-center">
                    <Calendar className="w-3 h-3 mr-1"/>
                    {latestReport ? format(new Date(latestReport.createdAt), 'dd MMM yyyy') : 'Sin datos'}
                </span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                      <tr>
                         <th className="px-6 py-3">Parámetro</th>
                         <th className="px-6 py-3 text-center">Rango Ideal</th>
                         <th className="px-6 py-3 text-center">Resultado</th>
                         <th className="px-6 py-3 text-center">Estado</th>
                         <th className="px-6 py-3 text-center">Evidencia</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {condoTableData.map((row, idx) => (
                         <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="px-6 py-4 font-medium text-slate-700">{row.label}</td>
                            <td className="px-6 py-4 text-center font-mono text-slate-500 text-xs">
                               {row.reference || '-'} {row.unit}
                            </td>
                            <td className="px-6 py-4 text-center">
                               <span className="font-bold text-slate-800">
                                   {row.type === 'boolean' 
                                     ? (row.value ? 'Cumple' : 'No Cumple') 
                                     : `${row.value || '--'} ${row.unit || ''}`}
                               </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                                {(row.value !== undefined && row.value !== '') ? (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-green-100 text-green-700">
                                        <Check className="w-3 h-3 mr-1" /> OK
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-bold bg-slate-100 text-slate-400">
                                        <AlertCircle className="w-3 h-3 mr-1" /> N/A
                                    </span>
                                )}
                            </td>
                            <td className="px-6 py-4 text-center">
                                {isImageExpired(latestReport?.createdAt || '') ? (
                                    <span className="text-[10px] text-slate-300 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100 cursor-help" title="Eliminado automáticamente por política de 60 días">
                                        EXPIRADO
                                    </span>
                                ) : (
                                    row.photoUrl ? (
                                        <div className="relative group inline-block">
                                            <img 
                                                src={row.photoUrl} 
                                                alt="Evidencia"
                                                className="h-10 w-10 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 transition shadow-sm"
                                                onClick={() => setPreviewImage(row.photoUrl || null)}
                                            />
                                            <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5 shadow border border-slate-100 pointer-events-none">
                                                <ZoomIn className="h-3 w-3 text-teal-600" />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )
                                )}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
        </div>

        {/* History List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700 flex items-center">
                    <FileText className="mr-2 h-4 w-4" /> Historial Completo
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                {history.map(rep => (
                    <div key={rep.id} className="p-4 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition group cursor-pointer" onClick={() => setSelectedReport(rep)}>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                {format(new Date(rep.createdAt), 'dd MMM yyyy')}
                            </p>
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-slate-500">
                                    {rep.type === 'weekly' ? 'Mantenimiento Semanal' : 
                                    rep.type === 'monthly' ? 'Análisis Mensual' : 'Reporte Especial'}
                                </p>
                                {rep.type === 'special' && (
                                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-amber-100 text-amber-700 font-bold border border-amber-200">
                                        ESPECIAL
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex space-x-1">
                            <button 
                                className="text-slate-400 hover:text-teal-600 transition p-2 rounded-full hover:bg-teal-50"
                                title="Ver Detalles y Fotos"
                            >
                                <Eye className="h-5 w-5" />
                            </button>
                            <button 
                                onClick={(e) => handleDownloadReport(e, rep)}
                                className="text-slate-400 hover:text-indigo-600 transition p-2 rounded-full hover:bg-indigo-50"
                                title="Descargar PDF"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                        </div>
                    </div>
                ))}
                {history.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">Sin reportes disponibles.</div>}
            </div>
        </div>
      </div>

      {/* REPORT DETAIL MODAL & PREVIEW MODAL (Same as before) */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                 <div className={`p-4 border-b border-slate-200 flex justify-between items-center ${selectedReport.type === 'special' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                     <div>
                         <h3 className={`font-bold text-lg ${selectedReport.type === 'special' ? 'text-amber-800' : 'text-slate-800'}`}>
                             {selectedReport.type === 'special' ? 'Detalle de Evento Especial' : 'Detalles de Reporte'}
                         </h3>
                         <p className="text-xs text-slate-500">
                             {format(new Date(selectedReport.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}
                         </p>
                     </div>
                     <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-black/10 rounded-full transition">
                         <X className="h-5 w-5 text-slate-500" />
                     </button>
                 </div>
                 
                 <div className="p-0 overflow-y-auto flex-1">
                    {selectedReport.type === 'special' ? (
                        <div className="p-6">
                            {getCondoTableData(selectedReport).map((row, idx) => (
                                <div key={idx}>
                                    <h4 className="font-bold text-slate-700 mb-2">{row.label}</h4>
                                    <p className="text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100 whitespace-pre-wrap">
                                        {row.value}
                                    </p>
                                    
                                    {row.photoUrl && !isImageExpired(selectedReport.createdAt) && (
                                        <div className="mt-4">
                                            <h5 className="text-xs font-bold text-slate-400 uppercase mb-2">Evidencia</h5>
                                            <img 
                                                src={row.photoUrl} 
                                                alt="Evidencia" 
                                                className="w-full max-h-60 object-cover rounded-lg cursor-pointer hover:opacity-90 transition"
                                                onClick={() => setPreviewImage(row.photoUrl || null)}
                                            />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 sticky top-0">
                            <tr>
                                <th className="px-6 py-3 border-b">Parámetro</th>
                                <th className="px-6 py-3 border-b text-center">Resultado</th>
                                <th className="px-6 py-3 border-b text-center">Evidencia</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {getCondoTableData(selectedReport).map((row, idx) => (
                                <tr key={idx}>
                                    <td className="px-6 py-4 font-medium text-slate-700">
                                        {row.label}
                                        <span className="block text-[10px] text-slate-400 font-normal">{row.reference || ''} {row.unit || ''}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                    <span className="font-bold text-slate-800">
                                        {row.type === 'boolean' 
                                            ? (row.value ? 'Cumple' : 'No Cumple') 
                                            : `${row.value || '--'} ${row.unit || ''}`}
                                    </span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {isImageExpired(selectedReport.createdAt) ? (
                                            <span className="text-[10px] text-slate-300 font-bold bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                                EXPIRADO
                                            </span>
                                        ) : (
                                            row.photoUrl ? (
                                                <div className="relative group inline-block">
                                                    <img 
                                                        src={row.photoUrl} 
                                                        alt="Evidencia"
                                                        className="h-12 w-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:opacity-80 transition"
                                                        onClick={() => setPreviewImage(row.photoUrl || null)}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="text-slate-300 text-xs">-</span>
                                            )
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        </table>
                    )}
                 </div>

                 <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
                     <button 
                         onClick={() => {
                             if(machineInfo) generateReportPDF(selectedReport, machineInfo.location, true);
                         }}
                         className="flex items-center space-x-2 text-indigo-600 font-bold text-sm hover:underline"
                     >
                         <Download className="h-4 w-4" />
                         <span>Descargar PDF</span>
                     </button>
                 </div>
             </div>
        </div>
      )}

      {/* FULL SCREEN IMAGE PREVIEW MODAL */}
      {previewImage && (
        <div 
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-95 backdrop-blur-sm animate-in fade-in duration-200"
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

      {/* FULL SCREEN CHART MODAL */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300">
            {/* Modal Header */}
            <div className="bg-teal-700 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center">
                    <div className="p-2 bg-white/10 rounded-full mr-3">
                         {expandedChart.icon}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{expandedChart.title}</h2>
                        <p className="text-xs text-teal-100">Vista detallada e historial</p>
                    </div>
                </div>
                <button 
                    onClick={() => setExpandedChart(null)}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 p-6 bg-slate-50 overflow-hidden flex flex-col">
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200 flex-1 p-6">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                                dataKey="date" 
                                tick={{ fontSize: 12, fill: '#64748b' }} 
                                height={60} 
                            />
                            <YAxis 
                                domain={['auto', 'auto']} 
                                tick={{ fontSize: 12, fill: '#64748b' }} 
                            />
                            <Tooltip 
                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                labelStyle={{ color: '#64748b', marginBottom: '4px' }}
                                formatter={(value: any) => [value, expandedChart.unit]}
                            />
                            {expandedChart.max && (
                                <ReferenceLine y={expandedChart.max} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Máximo', fill: '#ef4444', position: 'insideTopRight' }} />
                            )}
                            {expandedChart.min && (
                                <ReferenceLine y={expandedChart.min} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Mínimo', fill: '#ef4444', position: 'insideBottomRight' }} />
                            )}
                            <Line 
                                type="monotone" 
                                dataKey={expandedChart.dataKey} 
                                stroke={expandedChart.color} 
                                strokeWidth={4} 
                                activeDot={{ r: 8 }}
                                dot={{ r: 4, strokeWidth: 2, stroke: expandedChart.color, fill: 'white' }}
                            />
                             {/* BRUSH COMPONENT: Adds the Slider at the bottom */}
                            {timeRange !== 'latest' && (
                                <Brush 
                                    dataKey="date" 
                                    height={40} 
                                    stroke="#94a3b8" 
                                    fill="#f8fafc"
                                    tickFormatter={() => ''}
                                />
                            )}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="mt-4 text-center text-slate-400 text-sm">
                    {timeRange !== 'latest' ? 'Desliza la barra inferior para hacer zoom y moverte en el tiempo.' : 'Vista instantánea (Zoom no disponible en modo Último Reporte)'}
                </div>
            </div>
        </div>
      )}

    </div>
  );
};