import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { Droplets, Info, Activity, TestTube, Download, FileText, Check, AlertCircle, TrendingUp, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { ComposedChart, Line, Area, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
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
      // 1. Refresh user info from DB to get assigned machine
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

      // 3. Prepare Chart Data (Using NEW IDs: w_ph, w_cl, w_tds, w_hardness)
      const weeklyReports = machineReports.filter(r => r.type === 'weekly');
      
      const graphData = weeklyReports.slice(0, 10).reverse().map(r => {
        const getVal = (id: string) => {
            const item = r.data.find(i => i.itemId === id);
            return item ? Number(item.value) : 0;
        };

        return {
          date: format(new Date(r.createdAt), 'dd/MM'),
          tds: getVal('w_tds'),
          ph: getVal('w_ph'),
          cl: getVal('w_cl'),
          hard: getVal('w_hardness')
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

  const condoTableData = getCondoTableData(latestReport);

  // Get Reference Values from Constants
  const tdsDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_tds');
  const phDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_ph');
  const clDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_cl');
  const hardDef = WEEKLY_CHECKLIST.find(i => i.id === 'w_hardness');

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
           <span className="font-bold text-sm">Calidad Certificada</span>
        </div>
      </div>

      {/* 4 CHART GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* GRAPH 1: TDS */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center">
                <Activity className="mr-2 text-teal-500 h-4 w-4" /> Pureza (TDS)
            </h3>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChartWrapper 
                        data={chartData} 
                        dataKey="tds" 
                        color="#0d9488" 
                        name="TDS" 
                        unit={tdsDef?.unit} 
                        maxRef={tdsDef?.max} 
                    />
                </ResponsiveContainer>
            </div>
        </div>

        {/* GRAPH 2: pH */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center">
                <TestTube className="mr-2 text-indigo-500 h-4 w-4" /> Nivel de pH
            </h3>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChartWrapper 
                        data={chartData} 
                        dataKey="ph" 
                        color="#6366f1" 
                        name="pH" 
                        minRef={phDef?.min} 
                        maxRef={phDef?.max} 
                    />
                </ResponsiveContainer>
            </div>
        </div>

        {/* GRAPH 3: Chlorine */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center">
                <Droplets className="mr-2 text-cyan-500 h-4 w-4" /> Cloro Libre
            </h3>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                     <BarChartWrapper 
                        data={chartData} 
                        dataKey="cl" 
                        color="#06b6d4" 
                        name="Cloro" 
                        unit={clDef?.unit} 
                        minRef={clDef?.min}
                        maxRef={clDef?.max}
                     />
                </ResponsiveContainer>
            </div>
        </div>

        {/* GRAPH 4: Hardness */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center">
                <Shield className="mr-2 text-purple-500 h-4 w-4" /> Dureza
            </h3>
            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                     <AreaChartWrapper 
                        data={chartData} 
                        dataKey="hard" 
                        color="#8b5cf6" 
                        name="Dureza" 
                        unit={hardDef?.unit} 
                        maxRef={hardDef?.max} 
                     />
                </ResponsiveContainer>
            </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Latest Report Detail Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
             <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Parámetros Última Visita</h3>
                <span className="text-xs text-slate-500 bg-white px-2 py-1 rounded border">
                    {latestReport ? format(new Date(latestReport.createdAt), 'dd MMM yyyy') : 'Sin datos'}
                </span>
             </div>
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                   <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                      <tr>
                         <th className="px-6 py-3">Parámetro</th>
                         <th className="px-6 py-3 text-center">Ref. Ideal</th>
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

        {/* History List */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[500px]">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-700 flex items-center">
                    <FileText className="mr-2 h-4 w-4" /> Historial de Reportes
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
  );
};

// --- CHART HELPERS ---

const AreaChartWrapper = ({ data, dataKey, color, name, unit, maxRef }: any) => (
    <ComposedChart data={data}>
        <defs>
            <linearGradient id={`color${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.2}/>
                <stop offset="95%" stopColor={color} stopOpacity={0}/>
            </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <Tooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
        {maxRef && <ReferenceLine y={maxRef} stroke="#f87171" strokeDasharray="3 3" />}
        <Area type="monotone" dataKey={dataKey} name={name} unit={unit} stroke={color} strokeWidth={2} fillOpacity={1} fill={`url(#color${dataKey})`} />
    </ComposedChart>
);

const LineChartWrapper = ({ data, dataKey, color, name, minRef, maxRef }: any) => (
    <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <Tooltip />
        {maxRef && <ReferenceLine y={maxRef} stroke="#ef4444" strokeDasharray="3 3" />}
        {minRef && <ReferenceLine y={minRef} stroke="#ef4444" strokeDasharray="3 3" />}
        <Line type="monotone" dataKey={dataKey} name={name} stroke={color} strokeWidth={2} dot={{r:3}} />
    </ComposedChart>
);

const BarChartWrapper = ({ data, dataKey, color, name, unit, minRef, maxRef }: any) => (
    <ComposedChart data={data}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
        <Tooltip cursor={{fill: 'transparent'}} />
        {maxRef && <ReferenceLine y={maxRef} stroke="#f87171" strokeDasharray="3 3" />}
        {minRef && <ReferenceLine y={minRef} stroke="#f87171" strokeDasharray="3 3" />}
        <Bar dataKey={dataKey} name={name} unit={unit} fill={color} radius={[4, 4, 0, 0]} barSize={20} />
    </ComposedChart>
);

function getCondoTableData(report: Report | null) {
    if (!report) return [];
    const checklist = report.type === 'weekly' ? WEEKLY_CHECKLIST : MONTHLY_CHECKLIST;
    return checklist.filter(item => {
        return ['w_ph', 'w_tds', 'w_cl', 'w_hardness', 'w12', 'w_capping'].includes(item.id) || item.section === 'monthly';
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