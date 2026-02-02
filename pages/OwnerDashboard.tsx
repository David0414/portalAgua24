import React, { useEffect, useState, useCallback } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus, Machine } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, Settings, Users, Activity, DollarSign, RefreshCw, Loader2, Info } from 'lucide-react';
import { format } from 'date-fns';
import { PRODUCTION_URL } from '../services/whatsapp';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  // Función de carga de datos robusta
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const reportData = await api.getAllReports();
      const machineData = await api.getMachines();
      
      setReports(reportData);
      setMachines(machineData);
      
      // Calcular ganancias sumando el campo 'w13' de todos los reportes
      let sum = 0;
      reportData.forEach(r => {
        const earningsItem = r.data.find(item => item.itemId === 'w13');
        if (earningsItem && earningsItem.value) {
            // Asegurar que se convierta a número correctamente
            const rawVal = earningsItem.value.toString().replace(/[^0-9.]/g, '');
            sum += Number(rawVal) || 0;
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
    // PROTECCIÓN DE URL: Si estamos en un deploy viejo/preview de Vercel, forzar ir a producción
    // Evita que el usuario vea dashboards viejos o datos en cero.
    if (window.location.hostname.includes('-projects.vercel.app')) {
        console.log("⚠️ Detectada versión antigua/preview. Redirigiendo a Producción...");
        window.location.href = `${PRODUCTION_URL}/#/owner/dashboard`;
        return;
    }

    // Detectar si venimos de una acción que requiere recarga forzada
    const state = location.state as { forceRefresh?: boolean };
    const shouldForce = state?.forceRefresh || false;

    loadDashboardData(shouldForce);

    // Auto-recarga al volver a la pestaña (focus)
    const handleFocus = () => {
      console.log("🔄 Ventana enfocada: Sincronizando datos...");
      loadDashboardData(true);
    };

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

  // --- PANTALLA DE CARGA INICIAL ---
  if (loading && !refreshing && reports.length === 0) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4 animate-in fade-in duration-300">
              <div className="relative">
                  <div className="absolute inset-0 bg-indigo-200 rounded-full blur-xl opacity-50 animate-pulse"></div>
                  <div className="relative bg-white p-4 rounded-full shadow-lg">
                      <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
                  </div>
              </div>
              <h2 className="text-xl font-bold text-slate-700">Actualizando Panel...</h2>
              <p className="text-slate-400 text-sm">Sincronizando con base de datos en tiempo real</p>
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
          <p className="text-slate-500 flex items-center gap-2">
            Gestión de activos, validación y finanzas.
            <span className="text-[10px] bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-200 font-bold">Producción Oficial</span>
          </p>
        </div>
      </header>
      
      {/* ACTION BAR: Refresh & Ganancias */}
      <div className="flex flex-col gap-4">
          <button 
            onClick={() => loadDashboardData(true)}
            disabled={refreshing}
            className="w-full md:w-auto bg-white border border-slate-300 text-slate-700 px-6 py-3 rounded-xl font-bold flex items-center justify-center hover:bg-slate-50 hover:text-indigo-600 transition shadow-sm"
          >
            <RefreshCw className={`h-5 w-5 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Sincronizando...' : 'Actualizar Datos'}
          </button>

          <div className="bg-green-100 text-green-800 px-6 py-4 rounded-xl flex items-center border border-green-200 shadow-sm">
              <div className="bg-green-200 p-3 rounded-full mr-4">
                  <DollarSign className="h-6 w-6 text-green-700" />
              </div>
              <div>
                  <p className="text-xs font-bold uppercase tracking-wide opacity-70">GANANCIAS (MES)</p>
                  <p className="text-3xl font-bold tracking-tight">${totalEarnings.toLocaleString()}</p>
              </div>
          </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reports List */}
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
            {reports.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400">
                  <p>No hay reportes registrados.</p>
              </div>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 flex flex-col">
           <h2 className="font-semibold text-slate-800 mb-6">Estado de Cumplimiento</h2>
           <div className="flex-1 min-h-[250px] flex items-center justify-center">
             {hasData ? (
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
             ) : (
                 <div className="text-center text-slate-400">
                    <div className="bg-slate-50 p-4 rounded-full inline-block mb-2">
                        <Activity className="h-6 w-6 opacity-50" />
                    </div>
                    <p className="text-sm">Sin datos suficientes para graficar</p>
                 </div>
             )}
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