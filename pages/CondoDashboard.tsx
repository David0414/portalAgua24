import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus, ChecklistItemDefinition } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Droplets, Calendar, Activity, Wind, Info, LogOut, Microscope, TestTube, Eye, FileText, Check, AlertCircle, Download, File } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ComposedChart, Line, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { WEEKLY_CHECKLIST, MONTHLY_CHECKLIST } from '../constants';
import { generateReportPDF } from '../services/pdfGenerator';

export const CondoDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Report[]>([]);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [machineInfo, setMachineInfo] = useState<{id: string, location: string} | null>(null);

  useEffect(() => {
    const fetch = async () => {
      // 1. Refresh user info from DB
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

      const allReports = await api.getAllReports();
      
      // 2. Filter reports: Match Machine ID AND ensure they are APPROVED
      const machineReports = allReports
        .filter(r => r.machineId === machineId && r.status === ReportStatus.APPROVED)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setHistory(machineReports);
      setLatestReport(machineReports[0] || null);

      // 3. Prepare Chart Data (Weekly TDS and pH)
      const weeklyReports = machineReports.filter(r => r.type === 'weekly');
      
      const graphData = weeklyReports.slice(0, 10).reverse().map(r => {
        const tds = r.data.find(i => i.itemId === 'w9')?.value || 0;
        const ph = r.data.find(i => i.itemId === 'w5')?.value || 7;
        return {
          date: format(new Date(r.createdAt), 'dd/MM'),
          tds: Number(tds),
          ph: Number(ph),
        };
      });
      setChartData(graphData);
      setLoading(false);
    };
    
    if(user) fetch();
  }, [user]);

  const getValue = (report: Report | null, itemId: string): string | number => {
    if (!report) return '-';
    const item = report.data.find(i => i.itemId === itemId);
    if (!item) return '-';
    if (typeof item.value === 'boolean') return item.value ? 'Sí' : 'No';
    return item.value;
  };

  const handleDownloadReport = (report: Report) => {
      if (machineInfo) {
          generateReportPDF(report, machineInfo.location);
      }
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

  const isMonthly = latestReport?.type === 'monthly';
  const condoTableData = getCondoTableData(latestReport);

  return (
    <div className="space-y-8 pb-10">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{machineInfo.location}</h1>
          <p className="text-slate-500 mt-1">
            Sistema de Purificación Central | ID: <span className="font-mono font-bold text-teal-600">{machineInfo.id}</span>
          </p>
        </div>
        <div className="mt-4 md:mt-0 flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100">
           <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
           </span>
           <span className="font-bold text-sm">Sistema Operativo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* GRAPH 1: TDS (Pureza) - Enhanced with Reference Lines */}
        <div className="lg:col-span-2 space-y-8">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Activity className="mr-2 text-teal-500 h-5 w-5" />
                    Tendencia de Pureza (TDS)
                    </h2>
                    <div className="flex items-center space-x-3 text-xs">
                        <span className="flex items-center"><span className="w-2 h-2 bg-teal-500 rounded-full mr-1"></span> Lectura</span>
                        <span className="flex items-center text-slate-400"><span className="w-2 h-2 border border-red-400 bg-red-50 rounded-full mr-1"></span> Límite Máx (300)</span>
                    </div>
                </div>
                
                <div className="h-[300px] w-full">
                    {chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                        <defs>
                            <linearGradient id="colorTds" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2}/>
                            <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} domain={[0, 400]} />
                        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        
                        {/* Reference Lines - VISUAL AID */}
                        <ReferenceLine y={300} stroke="#f87171" strokeDasharray="3 3" label={{ value: 'Máx Permitido', position: 'insideTopRight', fill: '#f87171', fontSize: 10 }} />
                        <ReferenceLine y={50} stroke="#4ade80" strokeDasharray="3 3" label={{ value: 'Excelente', position: 'insideBottomRight', fill: '#4ade80', fontSize: 10 }} />

                        <Area type="monotone" dataKey="tds" name="TDS (mg/L)" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorTds)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                    ) : (
                    <div className="h-full flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg">
                        <p>No hay datos suficientes.</p>
                    </div>
                    )}
                </div>
            </div>

             {/* GRAPH 2: pH (Acidez) */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <TestTube className="mr-2 text-indigo-500 h-5 w-5" />
                    Estabilidad del pH
                    </h2>
                    <span className="text-xs text-slate-400">Rango Ideal: 6.8 - 7.8</span>
                </div>
                <div className="h-[200px] w-full">
                     <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="date" hide />
                            <YAxis domain={[6, 9]} axisLine={false} tickLine={false} />
                            <Tooltip />
                            {/* Visual Green Zone */}
                            <ReferenceLine y={7.8} stroke="#ef4444" strokeDasharray="3 3" />
                            <ReferenceLine y={6.8} stroke="#ef4444" strokeDasharray="3 3" />
                            <Line type="monotone" dataKey="ph" stroke="#6366f1" strokeWidth={3} dot={{r:4}} />
                        </ComposedChart>
                     </ResponsiveContainer>
                </div>
            </div>
        </div>

        {/* Current Metrics Cards */}
        <div className="space-y-6">
             <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                <Droplets className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10" />
                <p className="text-teal-100 text-sm font-medium mb-1">Calidad Actual</p>
                <div className="flex items-baseline space-x-2">
                    <span className="text-5xl font-bold">{getValue(latestReport, 'w9')}</span>
                    <span className="text-lg opacity-80">ppm TDS</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/20 text-sm">
                    <span className="opacity-80">Última visita: </span>
                    <span className="font-bold">{latestReport ? format(new Date(latestReport.createdAt), 'dd/MM/yyyy') : '--'}</span>
                </div>
            </div>

            {/* List of Reports for Download */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center">
                        <FileText className="mr-2 h-4 w-4" /> Reportes Disponibles
                    </h3>
                </div>
                <div className="flex-1 overflow-y-auto">
                    {history.map(rep => (
                        <div key={rep.id} className="p-4 border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 transition group">
                            <div>
                                <p className="text-sm font-bold text-slate-800">
                                    {format(new Date(rep.createdAt), 'dd MMM yyyy')}
                                </p>
                                <p className="text-xs text-slate-500">
                                    {rep.type === 'weekly' ? 'Mantenimiento Semanal' : 'Análisis Mensual'}
                                </p>
                            </div>
                            <button 
                                onClick={() => handleDownloadReport(rep)}
                                className="text-slate-400 hover:text-teal-600 transition p-2 rounded-full hover:bg-teal-50"
                                title="Descargar PDF"
                            >
                                <Download className="h-5 w-5" />
                            </button>
                        </div>
                    ))}
                    {history.length === 0 && <div className="p-4 text-center text-slate-400 text-sm">Sin reportes</div>}
                </div>
            </div>
        </div>
      </div>
      
      {/* Detail Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden mt-8">
         <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h3 className="font-bold text-slate-700">Detalle de Parámetros (Última Visita)</h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                     <th className="px-6 py-3">Parámetro</th>
                     <th className="px-6 py-3 text-center">Referencia Ideal</th>
                     <th className="px-6 py-3 text-center">Resultado</th>
                     <th className="px-6 py-3 text-center">Estado</th>
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
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};

// Helper function within the file or imported
function getCondoTableData(report: Report | null) {
    if (!report) return [];
    const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;
    
    return checklist.filter(item => {
        const label = item.label.toLowerCase();
        return label.includes('salida') || 
               item.section === 'monthly' ||
               item.id === 'w12' || item.id === 'w4' || item.id === 'w_capping';
    }).map(item => {
        const dataItem = report.data.find(d => d.itemId === item.id);
        return {
            label: item.label,
            value: dataItem?.value,
            reference: item.reference,
            unit: item.unit,
            type: item.type
        };
    });
}