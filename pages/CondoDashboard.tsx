import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus } from '../types';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, Droplets, Calendar, Activity, Wind, Info, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export const CondoDashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<Report[]>([]);
  const [latestReport, setLatestReport] = useState<Report | null>(null);
  const [chartData, setChartData] = useState<any[]>([]);
  const [machineInfo, setMachineInfo] = useState<{id: string, location: string} | null>(null);

  useEffect(() => {
    const fetch = async () => {
      // 1. Identify which machine this user is assigned to
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
      
      // 2. Filter reports for assigned machine
      const machineReports = allReports
        .filter(r => r.machineId === machineId && r.status === ReportStatus.APPROVED)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      setHistory(machineReports);
      setLatestReport(machineReports[0] || null);

      // 3. Prepare Chart Data (Using Output Values: w9 = TDS Final, w5 = PH Final)
      const graphData = machineReports.slice(0, 10).reverse().map(r => {
        const tds = r.data.find(i => i.itemId === 'w9')?.value || 0;
        const ph = r.data.find(i => i.itemId === 'w5')?.value || 0;
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

  const getValue = (itemId: string): string | number => {
    if (!latestReport) return '-';
    const item = latestReport.data.find(i => i.itemId === itemId);
    if (!item) return '-';
    if (typeof item.value === 'boolean') return item.value ? 'Sí' : 'No';
    return item.value;
  };

  if (loading) return <div className="flex justify-center items-center h-96"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div></div>;

  if (!machineInfo) {
    return (
      <div className="text-center p-10 bg-white rounded-xl shadow">
        <Info className="h-12 w-12 text-slate-400 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">Sin Máquina Asignada</h2>
        <p className="text-slate-500 mt-2">Tu cuenta aún no ha sido vinculada a una purificadora.</p>
        <p className="text-slate-500">Contacta al propietario para obtener acceso.</p>
        <button onClick={logout} className="mt-6 text-teal-600 font-bold hover:underline">Cerrar Sesión</button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{machineInfo.location}</h1>
          <p className="text-slate-500 mt-1">
            Sistema de Purificación Central | ID: <span className="font-mono font-bold text-teal-600">{machineInfo.id}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
           <div className="flex items-center space-x-2 bg-green-50 text-green-700 px-4 py-2 rounded-full border border-green-100">
             <span className="relative flex h-3 w-3">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
             </span>
             <span className="font-bold text-sm">Sistema Operativo</span>
           </div>
           <button onClick={logout} className="text-xs text-slate-400 hover:text-red-500 flex items-center">
             <LogOut className="h-3 w-3 mr-1" /> Cerrar Sesión
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Chart Section (TDS Final) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <Activity className="mr-2 text-teal-500 h-5 w-5" />
              Tendencia de Pureza (TDS Salida)
            </h2>
            <div className="text-xs text-slate-400 bg-slate-50 px-2 py-1 rounded">
              Últimas semanas
            </div>
          </div>
          
          <div className="h-[300px] w-full">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorTds" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    labelStyle={{color: '#64748b', marginBottom: '4px'}}
                  />
                  <Area type="monotone" dataKey="tds" name="TDS (ppm)" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorTds)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Faltan datos para generar la gráfica.
              </div>
            )}
          </div>
        </div>

        {/* Current Metrics Cards - ONLY OUTPUT VALUES */}
        <div className="space-y-6">
           {/* TDS CARD */}
           <div className="bg-gradient-to-br from-teal-500 to-teal-700 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
              <Droplets className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10" />
              <p className="text-teal-100 text-sm font-medium mb-1">Pureza Final (TDS)</p>
              <div className="flex items-baseline space-x-2">
                 <span className="text-5xl font-bold">{getValue('w9')}</span>
                 <span className="text-lg opacity-80">ppm</span>
              </div>
              <div className="mt-4 pt-4 border-t border-white/20 flex justify-between items-center text-sm">
                 <span>Calidad:</span>
                 <span className="bg-white/20 px-2 py-0.5 rounded font-bold">Excelente</span>
              </div>
           </div>

           {/* Chemical Params - OUTPUT ONLY */}
           <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-slate-500 font-bold text-sm uppercase mb-4">Calidad del Agua (Salida)</h3>
              <div className="space-y-4">
                 <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="font-medium text-slate-700">pH Final</span>
                    <span className="text-xl font-bold text-slate-800">{getValue('w5')}</span>
                 </div>
                 <div className="flex justify-between items-center pb-3 border-b border-slate-50">
                    <span className="font-medium text-slate-700">Cloro Residual</span>
                    <span className="text-xl font-bold text-slate-800">{getValue('w7')}</span>
                 </div>
                 <div className="flex justify-between items-center">
                    <span className="font-medium text-slate-700">Dureza Final</span>
                    <span className="text-xl font-bold text-slate-800">{getValue('w11')}</span>
                 </div>
              </div>
           </div>
        </div>
      </div>
      
       <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
         <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-700 flex items-center">
               <Calendar className="mr-2 h-5 w-5 text-slate-400" />
               Historial de Mantenimiento Validado
            </h3>
         </div>
         <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
               <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-100">
                  <tr>
                     <th className="px-6 py-3">Fecha</th>
                     <th className="px-6 py-3">Técnico</th>
                     <th className="px-6 py-3">Estado</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100">
                  {history.map((report) => (
                     <tr key={report.id}>
                        <td className="px-6 py-4">{format(new Date(report.createdAt), "dd/MM/yyyy", { locale: es })}</td>
                        <td className="px-6 py-4">{report.technicianName}</td>
                        <td className="px-6 py-4"><span className="text-green-600 font-bold flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Validado</span></td>
                     </tr>
                  ))}
               </tbody>
            </table>
         </div>
      </div>
    </div>
  );
};