import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus, Machine } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Settings, Users, Activity, DollarSign, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Función de carga de datos robusta
  const loadDashboardData = useCallback(async () => {
    setRefreshing(true);
    try {
      const reportData = await api.getAllReports();
      const machineData = await api.getMachines();
      
      setReports(reportData);
      setMachines(machineData);
      
      let sum = 0;
      reportData.forEach(r => {
        const earningsItem = r.data.find(item => item.itemId === 'w13');
        if (earningsItem && earningsItem.value) {
          sum += Number(earningsItem.value) || 0;
        }
      });
      setTotalEarnings(sum);
    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    // 1. Carga inicial
    loadDashboardData();

    // 2. Auto-recarga al volver a la pestaña (Evita datos viejos)
    const handleFocus = () => {
      console.log("🔄 Ventana enfocada: Actualizando datos...");
      loadDashboardData();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [loadDashboardData]);

  // Stats
  const pendingCount = reports.filter(r => r.status === ReportStatus.PENDING).length;
  const approvedCount = reports.filter(r => r.status === ReportStatus.APPROVED).length;

  const pieData = [
    { name: 'Pendientes', value: pendingCount },
    { name: 'Aprobados', value: approvedCount },
    { name: 'Rechazados', value: reports.length - pendingCount - approvedCount },
  ];
  const COLORS = ['#fbbf24', '#22c55e', '#ef4444'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            Panel de Propietario
            {refreshing && <RefreshCw className="ml-3 h-5 w-5 text-slate-400 animate-spin" />}
          </h1>
          <p className="text-slate-500">Gestión de activos, validación y finanzas.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <button 
              onClick={loadDashboardData}
              disabled={refreshing}
              className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm"
            >
              <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>

            <div className="bg-green-100 text-green-800 px-6 py-2 rounded-xl flex items-center border border-green-200 shadow-sm">
                <div className="bg-green-200 p-2 rounded-full mr-3">
                    <DollarSign className="h-5 w-5 text-green-700" />
                </div>
                <div>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-80">Ganancias</p>
                    <p className="text-xl font-bold">${totalEarnings.toLocaleString()}</p>
                </div>
            </div>
        </div>
      </header>

      {/* KPI / Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 relative overflow-hidden">
          <div className={`absolute top-0 right-0 w-16 h-16 bg-amber-400 opacity-10 rounded-bl-full`}></div>
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full z-10">
            <Clock className="h-8 w-8" />
          </div>
          <div className="z-10">
            <p className="text-sm text-slate-500 font-medium">Validación</p>
            <p className="text-2xl font-bold text-slate-900">{pendingCount} <span className="text-xs text-slate-400 font-normal">Pendientes</span></p>
          </div>
        </div>
        
        <div 
            onClick={() => navigate('/owner/machines')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition group relative"
        >
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full group-hover:bg-indigo-600 group-hover:text-white transition">
            <Settings className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-indigo-600 transition">Máquinas</p>
            <p className="text-2xl font-bold text-slate-900">{machines.length}</p>
          </div>
        </div>

        <div 
            onClick={() => navigate('/owner/users')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 cursor-pointer hover:border-blue-300 hover:shadow-md transition group relative"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full group-hover:bg-blue-600 group-hover:text-white transition">
            <Users className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-blue-600 transition">Usuarios</p>
            <p className="text-xs text-slate-400">Condominios y Técnicos</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-teal-100 text-teal-600 rounded-full">
            <Activity className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Reportes</p>
            <p className="text-2xl font-bold text-slate-900">{reports.length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reports List */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Bitácora de Visitas Recientes</h2>
            <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border">{reports.length} total</span>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {loading ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <RefreshCw className="h-8 w-8 animate-spin mb-2" />
                    <p>Cargando datos...</p>
                </div>
            ) : reports.map(report => (
              <div key={report.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">{report.machineId}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wide uppercase ${
                      report.status === ReportStatus.PENDING ? 'bg-amber-100 text-amber-700' :
                      report.status === ReportStatus.APPROVED ? 'bg-green-100 text-green-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {report.status === ReportStatus.PENDING ? 'Pendiente' : 
                       report.status === ReportStatus.APPROVED ? 'Aprobado' : 'Rechazado'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center">
                     <span className="font-medium text-slate-600 mr-1">{report.technicianName}</span> 
                     • {format(new Date(report.createdAt), 'dd/MM/yy HH:mm')}
                  </p>
                </div>
                <Link 
                  to={`/owner/review/${report.id}`}
                  className={`px-3 py-1.5 text-xs font-bold rounded border transition ${
                      report.status === ReportStatus.PENDING 
                      ? 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 shadow-md transform hover:scale-105' 
                      : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300 hover:text-indigo-600'
                  }`}
                >
                  {report.status === ReportStatus.PENDING ? 'Validar Ahora' : 'Ver Detalle'}
                </Link>
              </div>
            ))}
            {reports.length === 0 && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p>No hay reportes registrados.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
           <h2 className="font-semibold text-slate-800 mb-6">Estado de Cumplimiento</h2>
           <div className="flex-1 min-h-[250px]">
             <ResponsiveContainer width="100%" height="100%">
               <PieChart>
                 <Pie
                   data={pieData}
                   cx="50%"
                   cy="50%"
                   innerRadius={60}
                   outerRadius={80}
                   fill="#8884d8"
                   paddingAngle={5}
                   dataKey="value"
                 >
                   {pieData.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                   ))}
                 </Pie>
                 <Tooltip />
               </PieChart>
             </ResponsiveContainer>
           </div>
           <div className="flex justify-center space-x-4 mt-4 text-xs font-medium text-slate-600">
              <div className="flex items-center"><div className="w-2 h-2 bg-amber-400 rounded-full mr-2"></div> Pendientes</div>
              <div className="flex items-center"><div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div> Aprobados</div>
              <div className="flex items-center"><div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div> Rechazados</div>
           </div>
        </div>
      </div>
    </div>
  );
};