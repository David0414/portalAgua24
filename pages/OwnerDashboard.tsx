import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus, Machine } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Settings, Users, Activity, DollarSign, RefreshCw, Loader2, Info, TrendingUp } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks, getWeek } from 'date-fns';
import { PRODUCTION_URL } from '../services/whatsapp';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [financialData, setFinancialData] = useState<any[]>([]);

  // Función de carga de datos robusta
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const reportData = await api.getAllReports();
      const machineData = await api.getMachines();
      
      setReports(reportData);
      setMachines(machineData);
      
      // 1. Calculate Total Earnings (Sum of all time)
      let sum = 0;
      reportData.forEach(r => {
        const earningsItem = r.data.find(item => item.itemId === 'w13');
        if (earningsItem && earningsItem.value) {
            const rawVal = earningsItem.value.toString().replace(/[^0-9.]/g, '');
            sum += Number(rawVal) || 0;
        }
      });
      setTotalEarnings(sum);

      // 2. Prepare Financial Chart Data (Weekly aggregation)
      // Group last 4 weeks
      const today = new Date();
      const weeksData = [];
      
      for(let i=3; i>=0; i--) {
          const weekStart = startOfWeek(subWeeks(today, i));
          const weekEnd = endOfWeek(subWeeks(today, i));
          const weekNum = getWeek(weekStart);
          
          let weekSum = 0;
          reportData.forEach(r => {
             const rDate = new Date(r.createdAt);
             if (isWithinInterval(rDate, { start: weekStart, end: weekEnd })) {
                 const earningsItem = r.data.find(item => item.itemId === 'w13');
                 if (earningsItem && earningsItem.value) {
                    const rawVal = earningsItem.value.toString().replace(/[^0-9.]/g, '');
                    weekSum += Number(rawVal) || 0;
                 }
             }
          });
          
          weeksData.push({
              name: `Semana ${weekNum}`,
              dateLabel: format(weekStart, 'dd/MM'),
              ingreso: weekSum
          });
      }
      setFinancialData(weeksData);

    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (window.location.hostname.includes('-projects.vercel.app')) {
        window.location.href = `${PRODUCTION_URL}/#/owner/dashboard`;
        return;
    }
    const state = location.state as { forceRefresh?: boolean };
    const shouldForce = state?.forceRefresh || false;
    loadDashboardData(shouldForce);

    const handleFocus = () => loadDashboardData(true);
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDashboardData, location.key]); 

  // Stats logic
  const pendingCount = reports.filter(r => r.status === ReportStatus.PENDING).length;
  const approvedCount = reports.filter(r => r.status === ReportStatus.APPROVED).length;

  const pieData = [
    { name: 'Pendientes', value: pendingCount },
    { name: 'Aprobados', value: approvedCount },
    { name: 'Rechazados', value: reports.length - pendingCount - approvedCount },
  ];
  const COLORS = ['#fbbf24', '#22c55e', '#ef4444'];
  const hasData = pieData.some(d => d.value > 0);

  if (loading && !refreshing && reports.length === 0) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-slate-500">Cargando Panel...</p>
          </div>
      );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            Panel de Propietario
          </h1>
          <p className="text-slate-500">Gestión de activos, validación y finanzas.</p>
        </div>
        <button 
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="w-full md:w-auto bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center justify-center hover:bg-slate-50 transition"
        >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
        </button>
      </header>
      
      {/* FINANCIAL OVERVIEW SECTION (New) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
               <h2 className="font-bold text-slate-800 mb-4 flex items-center">
                   <TrendingUp className="mr-2 text-green-600 h-5 w-5" /> 
                   Ingresos Semanales (Último Mes)
               </h2>
               <div className="h-[250px] w-full">
                   <ResponsiveContainer width="100%" height="100%">
                       <BarChart data={financialData}>
                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                           <XAxis dataKey="name" tick={{fontSize: 12}} />
                           <YAxis tick={{fontSize: 12}} />
                           <Tooltip cursor={{fill: 'transparent'}} />
                           <Bar dataKey="ingreso" fill="#22c55e" radius={[4, 4, 0, 0]} name="Ingreso ($)" />
                       </BarChart>
                   </ResponsiveContainer>
               </div>
           </div>

           <div className="space-y-6">
                <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg relative overflow-hidden">
                    <DollarSign className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10" />
                    <p className="text-green-100 text-sm font-medium">Ingreso Acumulado (Total)</p>
                    <p className="text-4xl font-bold mt-2">${totalEarnings.toLocaleString()}</p>
                    <p className="text-xs text-green-200 mt-4 opacity-80">Suma de todos los reportes históricos</p>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium">Máquinas Activas</p>
                        <p className="text-2xl font-bold text-slate-900">{machines.length}</p>
                    </div>
                    <div className="bg-indigo-100 p-3 rounded-full text-indigo-600">
                        <Settings className="h-6 w-6" />
                    </div>
                </div>
           </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 border-l-4 border-amber-400">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Reportes Pendientes</p>
            <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
          </div>
        </div>
        
        <div 
            onClick={() => navigate('/owner/users')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 cursor-pointer hover:shadow-md transition"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Gestión de Usuarios</p>
            <p className="text-xs text-slate-400">Ver técnicos y clientes</p>
          </div>
        </div>
      </div>

      {/* Reports & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Bitácora Reciente</h2>
            <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border">{reports.length} total</span>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {reports.map(report => (
              <div key={report.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">{report.machineId}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                      report.status === ReportStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                      report.status === ReportStatus.APPROVED ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {report.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                     {format(new Date(report.createdAt), 'dd/MM/yy HH:mm')} • {report.technicianName}
                  </p>
                </div>
                <Link 
                  to={`/owner/review/${report.id}`}
                  className="px-3 py-1.5 text-xs font-bold rounded border bg-white text-slate-600 hover:text-indigo-600 hover:border-indigo-300"
                >
                  Ver
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
           <h2 className="font-semibold text-slate-800 mb-6">Estado de Cumplimiento</h2>
           <div className="flex-1 min-h-[250px] flex items-center justify-center">
             {hasData ? (
                 <ResponsiveContainer width="100%" height="100%">
                   <PieChart>
                     <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5} dataKey="value">
                       {pieData.map((entry, index) => (
                         <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                       ))}
                     </Pie>
                     <Tooltip />
                   </PieChart>
                 </ResponsiveContainer>
             ) : (
                 <p className="text-slate-400 text-sm">Sin datos</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};