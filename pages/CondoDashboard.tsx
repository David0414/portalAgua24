import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, Info, Activity, TestTube, Download, FileText, Check, AlertCircle, Shield, Calendar, Eye, X, Image as ImageIcon } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { ComposedChart, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceArea, ReferenceLine } from 'recharts';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST } from '../constants';
import { generateReportPDF } from '../services/pdfGenerator';

export const CondoDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Report[]>([]);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [machineInfo, setMachineInfo] = useState<{id: string, location: string} | null>(null);
  
  // State for Modal
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);

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
         setMachineInfo({ id: machineDetails.id, location: machineDetails.location });
      }

      const machineReports = await api.getReportsByMachine(machineId, 50);
      const approvedReports = machineReports.filter(r => r.status === ReportStatus.APPROVED);

      setHistory(approvedReports);
      setLatestReport(approvedReports[0] || null);

      // --- PREPARE DATA FOR CHARTS ---
      const weeklyReports = approvedReports.filter(r => r.type === 'weekly');
      
      const graphData = weeklyReports.slice(0, 10).reverse().map(r => {
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
      setChartData(graphData);
      setLoading(false);
    };
    
    if(user) fetch();
  }, [user]);

  const handleDownloadReport = (e: React.MouseEvent, report: Report) => {
      e.stopPropagation();
      if (machineInfo) {
          generateReportPDF(report, machineInfo.location, true);
      }
  };

  const isImageExpired = (reportDate: string) => {
      // Images must be deleted (or hidden) after 60 days
      return differenceInDays(new Date(), new Date(reportDate)) > 60;
  };

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

      {/* 4 CHART GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <QualityChart 
            type="area" title="Pureza (TDS)" icon={<Activity className="mr-2 text-teal-500 h-4 w-4" />}
            data={chartData} dataKey="tds" color="#0d9488" unit="ppm" min={tdsDef?.min} max={tdsDef?.max}
        />
        <QualityChart 
            type="area" title="Nivel de pH" icon={<TestTube className="mr-2 text-indigo-500 h-4 w-4" />}
            data={chartData} dataKey="ph" color="#6366f1" unit="pH" min={phDef?.min} max={phDef?.max}
        />
        <QualityChart 
            type="bar" title="Cloro Libre" icon={<Droplets className="mr-2 text-cyan-500 h-4 w-4" />}
            data={chartData} dataKey="cl" color="#06b6d4" unit="mg/L" min={clDef?.min} max={clDef?.max}
        />
        <QualityChart 
            type="bar" title="Dureza Total" icon={<Shield className="mr-2 text-purple-500 h-4 w-4" />}
            data={chartData} dataKey="hard" color="#8b5cf6" unit="mg/L" min={0} max={hardDef?.max}
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
                                {row.photoUrl ? (
                                    isImageExpired(latestReport?.createdAt || '') ? (
                                        <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200" title="Eliminado por antigüedad (>60 días)">
                                            EXPIRADO
                                        </span>
                                    ) : (
                                        <button 
                                            onClick={() => window.open(row.photoUrl, '_blank')}
                                            className="text-teal-600 hover:text-teal-800 transition p-1 bg-teal-50 rounded-lg border border-teal-100"
                                        >
                                            <ImageIcon className="h-4 w-4" />
                                        </button>
                                    )
                                ) : (
                                    <span className="text-slate-300">-</span>
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
                    <FileText className="mr-2 h-4 w-4" /> Historial de Certificados
                </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
                {history.map(rep => (
                    <div key={rep.id} className="p-4 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition group cursor-pointer" onClick={() => setSelectedReport(rep)}>
                        <div>
                            <p className="text-sm font-bold text-slate-800">
                                {format(new Date(rep.createdAt), 'dd MMM yyyy')}
                            </p>
                            <p className="text-xs text-slate-500">
                                {rep.type === 'weekly' ? 'Mantenimiento Semanal' : 'Análisis Mensual'}
                            </p>
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

      {/* REPORT DETAIL MODAL */}
      {selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
             <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden">
                 <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                     <div>
                         <h3 className="font-bold text-lg text-slate-800">Detalles de Reporte</h3>
                         <p className="text-xs text-slate-500">
                             {format(new Date(selectedReport.createdAt), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}
                         </p>
                     </div>
                     <button onClick={() => setSelectedReport(null)} className="p-2 hover:bg-slate-200 rounded-full transition">
                         <X className="h-5 w-5 text-slate-500" />
                     </button>
                 </div>
                 
                 <div className="p-0 overflow-y-auto flex-1">
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
                                    {row.photoUrl ? (
                                        isImageExpired(selectedReport.createdAt) ? (
                                            <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-2 py-1 rounded border border-slate-200">
                                                EXPIRADO
                                            </span>
                                        ) : (
                                            <div className="relative group inline-block">
                                                <img 
                                                    src={row.photoUrl} 
                                                    alt="Evidencia"
                                                    className="h-12 w-12 object-cover rounded-lg border border-slate-200 cursor-pointer hover:scale-110 transition"
                                                    onClick={() => window.open(row.photoUrl, '_blank')}
                                                />
                                            </div>
                                        )
                                    ) : (
                                        <span className="text-slate-300 text-xs">-</span>
                                    )}
                                </td>
                             </tr>
                          ))}
                       </tbody>
                    </table>
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
    </div>
  );
};

// --- CHART COMPONENT ---

interface QualityChartProps {
    title: string;
    icon: React.ReactNode;
    data: any[];
    dataKey: string;
    color: string;
    unit?: string;
    min?: number;
    max?: number;
    type?: 'area' | 'bar'; 
}

const CustomTooltip = ({ active, payload, label, unit, min, max }: any) => {
    if (active && payload && payload.length) {
        const value = payload[0].value;
        let status = "Normal";
        let statusColor = "text-green-400";

        if (max !== undefined && value > max) {
            status = "Alto";
            statusColor = "text-red-400";
        } else if (min !== undefined && value < min) {
            status = "Bajo";
            statusColor = "text-amber-400";
        } else {
            status = "Excelente";
        }

        return (
            <div className="bg-slate-800 text-white p-3 rounded-lg shadow-xl border border-slate-700 text-xs z-50">
                <p className="font-bold mb-1 text-slate-300 border-b border-slate-600 pb-1">{payload[0].payload.fullDate}</p>
                <div className="flex items-center justify-between gap-4 mt-2">
                    <span className="text-slate-400">Medición:</span>
                    <span className="font-bold text-lg text-white">{value} <span className="text-[10px] font-normal text-slate-400">{unit}</span></span>
                </div>
                <div className="mt-1 flex justify-between gap-4">
                    <span className="text-slate-400">Estado:</span>
                    <span className={`font-bold uppercase ${statusColor}`}>{status}</span>
                </div>
            </div>
        );
    }
    return null;
};

const QualityChart: React.FC<QualityChartProps> = ({ title, icon, data, dataKey, color, unit, min, max, type = 'area' }) => {
    return (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center justify-between">
                <span className="flex items-center">{icon} {title}</span>
                {(min !== undefined || max !== undefined) && (
                     <span className="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded border border-green-100">
                         Ideal: {min !== undefined ? min : '0'} - {max !== undefined ? max : '∞'}
                     </span>
                )}
            </h3>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data}>
                        <defs>
                            <linearGradient id={`gradient-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={color} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={color} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#94a3b8', fontSize: 10}}
                            interval="preserveStartEnd" 
                        />
                        <YAxis 
                            domain={['auto', 'auto']} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fill: '#94a3b8', fontSize: 10}} 
                            width={30}
                        />
                        <Tooltip content={<CustomTooltip unit={unit} min={min} max={max} />} />
                        
                        {(min !== undefined || max !== undefined) && (
                            <ReferenceArea 
                                y1={min || 0} 
                                y2={max} 
                                strokeOpacity={0}
                                {...({ fill: "#dcfce7", fillOpacity: 0.4 } as any)}
                            />
                        )}

                        {max !== undefined && (
                            <ReferenceLine 
                                y={max} 
                                stroke="#ef4444" 
                                strokeDasharray="4 2" 
                                label={{ value: `Max: ${max}`, position: 'insideTopRight', fill: '#ef4444', fontSize: 9 }} 
                            />
                        )}
                        {min !== undefined && (
                            <ReferenceLine 
                                y={min} 
                                stroke="#ef4444" 
                                strokeDasharray="4 2" 
                                label={{ value: `Min: ${min}`, position: 'insideBottomRight', fill: '#ef4444', fontSize: 9 }}
                            />
                        )}

                        {type === 'bar' ? (
                            <Bar 
                                dataKey={dataKey} 
                                fill={color} 
                                radius={[4, 4, 0, 0]}
                                barSize={20}
                            />
                        ) : (
                            <Area 
                                type="monotone" 
                                dataKey={dataKey} 
                                stroke={color} 
                                strokeWidth={3} 
                                fill={`url(#gradient-${dataKey})`} 
                                activeDot={{r: 6, strokeWidth: 0, fill: color}}
                                dot={{r: 3, strokeWidth: 1, stroke: color, fill: 'white'}}
                                connectNulls={false} 
                            />
                        )}
                    </ComposedChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};

function getCondoTableData(report: Report | null) {
    if (!report) return [];
    const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;
    
    // Filter out items marked as private (Owner Only)
    const publicItems = checklist.filter(item => !item.private);
    
    return publicItems.filter(item => {
        // Keep key metrics + monthly section items + new water meter
        return ['w_ph', 'w_tds', 'w_cl', 'w_hardness', 'w12', 'w_capping', 'w_water_meter'].includes(item.id) || item.section === 'monthly';
    }).map(item => {
        const dataItem = report.data.find(d => d.itemId === item.id);
        return {
            label: item.label,
            value: dataItem?.value,
            reference: item.reference,
            unit: item.unit,
            type: item.type,
            photoUrl: dataItem?.photoUrl
        };
    });
}