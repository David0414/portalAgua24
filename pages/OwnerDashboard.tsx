import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus, Machine, User } from '../types';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, ReferenceLine, Brush } from 'recharts';
import { Clock, Settings, Users, Activity, DollarSign, RefreshCw, Loader2, TrendingUp, Filter, Droplets, TestTube, Shield, AlertTriangle, ArrowRight, Wallet, Maximize2, X, ClipboardCheck, Calendar } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isWithinInterval, subWeeks, subMonths, getWeek, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import { PRODUCTION_URL } from '../services/whatsapp';

type TimeRange = 'latest' | '1m' | '3m' | '6m';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [reports, setReports] = useState<Report[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // --- STATE FOR ANALYSIS ---
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [timeRange, setTimeRange] = useState<TimeRange>('1m');

  // --- STATE FOR FULL SCREEN CHART ---
  const [expandedChart, setExpandedChart] = useState<any | null>(null);

  // Load Data
  const loadDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const reportData = await api.getAllReports();
      const machineData = await api.getMachines();
      const userData = await api.getUsers();
      
      setReports(reportData);
      setMachines(machineData);
      setUsers(userData);

      // Default to first machine if available and none selected
      if (machineData.length > 0 && !selectedMachineId) {
          setSelectedMachineId(machineData[0].id);
      } else if (machineData.length > 0 && selectedMachineId) {
          // Verify selected machine still exists
          if (!machineData.find(m => m.id === selectedMachineId)) {
             setSelectedMachineId(machineData[0].id);
          }
      }

    } catch (error) {
      console.error("Error cargando dashboard:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMachineId]);

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

  // --- STATS CALCULATIONS (Memoized) ---
  const { totalEarnings, pieData, pendingReports } = useMemo(() => {
      let sum = 0;
      reports.forEach(r => {
        const earningsItem = r.data.find(item => item.itemId === 'w13');
        if (earningsItem && earningsItem.value) {
            const rawVal = earningsItem.value.toString().replace(/[^0-9.]/g, '');
            sum += Number(rawVal) || 0;
        }
      });

      const pending = reports.filter(r => r.status === ReportStatus.PENDING);
      const approved = reports.filter(r => r.status === ReportStatus.APPROVED).length;
      const rejected = reports.length - pending.length - approved;

      const pData = [
        { name: 'Pendientes', value: pending.length },
        { name: 'Aprobados', value: approved },
        { name: 'Rechazados', value: rejected },
      ];

      return {
          totalEarnings: sum,
          pieData: pData,
          pendingReports: pending
      };
  }, [reports]);

  // --- TRENDS & SALES CALCULATION (Per Machine) ---
  const trendData = useMemo(() => {
      if (!selectedMachineId) return [];

      // 1. Filter by Machine
      let filteredReports = reports.filter(r => 
          r.machineId === selectedMachineId && 
          r.status === ReportStatus.APPROVED && 
          r.type === 'weekly'
      );

      // 2. Filter by Time Range
      const now = new Date();
      if (timeRange === 'latest') {
          // Just take the single most recent one
          filteredReports = filteredReports.slice(0, 1);
      } else {
          let cutoffDate = new Date();
          if (timeRange === '1m') cutoffDate = subMonths(now, 1);
          if (timeRange === '3m') cutoffDate = subMonths(now, 3);
          if (timeRange === '6m') cutoffDate = subMonths(now, 6);
          
          filteredReports = filteredReports.filter(r => isAfter(new Date(r.createdAt), cutoffDate));
      }

      // 3. Transform to Chart Format
      return filteredReports.reverse().map(r => {
          const getVal = (id: string) => {
             const item = r.data.find(d => d.itemId === id);
             if (!item || item.value === undefined) return null;
             const num = parseFloat(item.value.toString().replace(/[^0-9.]/g, ''));
             return isNaN(num) ? null : num;
          };

          return {
              date: format(new Date(r.createdAt), 'dd/MM'),
              fullDate: format(new Date(r.createdAt), 'dd MMM yyyy HH:mm', { locale: es }),
              ph: getVal('w_ph'),
              tds: getVal('w_tds'),
              cl: getVal('w_cl'),
              hard: getVal('w_hardness'),
              sales: getVal('w13') // Added Sales Data
          };
      });

  }, [reports, selectedMachineId, timeRange]);

  const COLORS = ['#fbbf24', '#22c55e', '#ef4444'];
  const hasPieData = pieData.some(d => d.value > 0);
  const visibleReports = reports.slice(0, 50);

  // Helper definitions for Charts (Added Sales)
  const chartConfig = [
      { key: 'sales', name: 'Ventas ($)', color: '#10b981', icon: <Wallet className="w-4 h-4 mr-1 text-emerald-500" />, isCurrency: true },
      { key: 'tds', name: 'TDS (Sólidos Disueltos Totales)', color: '#d946ef', icon: <Activity className="w-4 h-4 mr-1 text-fuchsia-500" />, min: 50, max: 300 },
      { key: 'ph', name: 'pH (Potencial de Hidrógeno)', color: '#6366f1', icon: <TestTube className="w-4 h-4 mr-1 text-indigo-500" />, min: 6.5, max: 8.5 },
      { key: 'cl', name: 'Cloro (Cloro Libre)', color: '#06b6d4', icon: <Droplets className="w-4 h-4 mr-1 text-cyan-500" />, min: 0.2, max: 1.5 },
  ];

  if (loading && !refreshing && reports.length === 0) {
      return (
          <div className="min-h-[60vh] flex flex-col items-center justify-center space-y-4">
              <Loader2 className="h-10 w-10 text-indigo-600 animate-spin" />
              <p className="text-slate-500">Cargando Panel...</p>
          </div>
      );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center">
            Panel de Propietario
          </h1>
          <p className="text-slate-500">Gestión de activos, validación y finanzas.</p>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
             <button 
                onClick={() => navigate('/owner/schedule')}
                className="flex-1 md:flex-none bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold flex items-center justify-center hover:bg-indigo-700 transition shadow-sm"
            >
                <Calendar className="h-4 w-4 mr-2" />
                Programar Visitas
            </button>
            <button 
                onClick={() => loadDashboardData(true)}
                disabled={refreshing}
                className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold flex items-center justify-center hover:bg-slate-50 transition"
            >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
        </div>
      </header>

      {/* --- PENDING ITEMS SECTION (ACTION BANNER) --- */}
      {pendingReports.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 shadow-sm animate-pulse-slow">
              <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                      <div className="bg-amber-100 p-2 rounded-full mr-3">
                          <AlertTriangle className="h-6 w-6 text-amber-600" />
                      </div>
                      <div>
                          <h3 className="text-lg font-bold text-amber-900">Requiere Atención</h3>
                          <p className="text-amber-700 text-sm">Tienes {pendingReports.length} reportes esperando validación.</p>
                      </div>
                  </div>
              </div>
              <div className="space-y-2">
                  {pendingReports.slice(0, 3).map(r => (
                      <Link 
                        key={r.id} 
                        to={`/owner/review/${r.id}`}
                        className="block bg-white border border-amber-100 p-3 rounded-lg hover:shadow-md transition flex justify-between items-center group"
                      >
                          <div>
                              <span className="font-bold text-slate-800 mr-2">{r.machineId}</span>
                              <span className="text-sm text-slate-500">{format(new Date(r.createdAt), "dd MMM - HH:mm", {locale: es})}</span>
                          </div>
                          <div className="flex items-center text-amber-600 font-bold text-sm">
                              Validar <ArrowRight className="ml-1 h-4 w-4 group-hover:translate-x-1 transition" />
                          </div>
                      </Link>
                  ))}
                  {pendingReports.length > 3 && (
                      <p className="text-center text-xs text-amber-600 font-bold mt-2">
                          + {pendingReports.length - 3} más pendientes...
                      </p>
                  )}
              </div>
          </div>
      )}

      {/* --- QUICK STATS CARDS (Updated Grid to include Pending Card) --- */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          
          {/* Card 1: Earnings */}
          <div className="bg-green-600 text-white p-6 rounded-xl shadow-lg relative overflow-hidden lg:col-span-1">
              <DollarSign className="absolute -right-4 -bottom-4 h-32 w-32 text-white/10" />
              <p className="text-green-100 text-sm font-medium">Ingreso Acumulado</p>
              <p className="text-3xl font-bold mt-2">${totalEarnings.toLocaleString()}</p>
              <p className="text-xs text-green-200 mt-4 opacity-80">Total Histórico</p>
          </div>

          {/* Card 2: Pending Reports (PERMANENT) */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden group hover:shadow-md transition">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
                  <ClipboardCheck className={`h-16 w-16 ${pendingReports.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              </div>
              <div>
                  <p className="text-slate-500 text-sm font-medium">Validaciones Pendientes</p>
                  <p className={`text-3xl font-bold ${pendingReports.length > 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {pendingReports.length}
                  </p>
              </div>
              <div className={`mt-4 text-xs font-bold px-2 py-1 rounded w-fit ${pendingReports.length > 0 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                  {pendingReports.length > 0 ? 'Requiere Atención' : 'Todo al día'}
              </div>
          </div>
          
          {/* Card 3: Machines */}
          <div 
              onClick={() => navigate('/owner/machines')}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md transition group"
          >
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-sm font-medium group-hover:text-indigo-600 transition">Máquinas</p>
                      <p className="text-3xl font-bold text-slate-900">{machines.length}</p>
                  </div>
                  <div className="bg-indigo-50 p-2 rounded-full text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition">
                      <Settings className="h-6 w-6" />
                  </div>
              </div>
              <p className="text-xs text-slate-400 mt-4">Inventario Activo</p>
          </div>

          {/* Card 4: Users */}
          <div 
              onClick={() => navigate('/owner/users')}
              className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between cursor-pointer hover:shadow-md transition group"
          >
               <div className="flex justify-between items-start">
                  <div>
                      <p className="text-slate-500 text-sm font-medium group-hover:text-teal-600 transition">Usuarios</p>
                      <p className="text-3xl font-bold text-slate-900">{users.length}</p>
                  </div>
                  <div className="bg-teal-50 p-2 rounded-full text-teal-600 group-hover:bg-teal-600 group-hover:text-white transition">
                      <Users className="h-6 w-6" />
                  </div>
               </div>
               <p className="text-xs text-slate-400 mt-4">Cuentas Registradas</p>
          </div>
      </div>

      {/* --- SECTION 2: MACHINE ANALYSIS (Quality & Sales) --- */}
      <div className="space-y-4">
           <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-brand-600" /> 
                    Análisis por Máquina
                </h2>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Machine Selector */}
                    <div className="relative min-w-[220px]">
                        <select 
                           value={selectedMachineId}
                           onChange={(e) => setSelectedMachineId(e.target.value)}
                           className="w-full appearance-none bg-white border border-slate-300 text-slate-700 py-2 pl-4 pr-10 rounded-lg font-bold focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                        >
                           {machines.map(m => (
                               <option key={m.id} value={m.id}>{m.location} ({m.id})</option>
                           ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
                           <Settings className="h-4 w-4" />
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div className="flex bg-slate-200 p-1 rounded-lg">
                        {[
                            { id: 'latest', label: 'Último' },
                            { id: '1m', label: '1 Mes' },
                            { id: '3m', label: '3 Meses' },
                            { id: '6m', label: '6 Meses' }
                        ].map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setTimeRange(t.id as TimeRange)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-md transition ${
                                    timeRange === t.id 
                                    ? 'bg-white text-indigo-600 shadow-sm' 
                                    : 'text-slate-500 hover:text-indigo-600'
                                }`}
                            >
                                {t.label}
                            </button>
                        ))}
                    </div>
                </div>
           </div>
            
           {/* GRAPHS GRID (Includes Sales Graph now) */}
           {trendData.length > 0 ? (
               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                   {/* Special Highlight for Sales Chart first */}
                   {chartConfig.map((cfg) => (
                       <div key={cfg.key} className={`bg-white p-5 rounded-xl shadow-sm border border-slate-100 ${cfg.key === 'sales' ? 'lg:col-span-2 border-green-100 bg-green-50/30' : ''}`}>
                           <div className="flex justify-between items-center mb-4">
                               <div className="flex items-center text-sm font-bold text-slate-600">
                                   {cfg.icon} {cfg.name}
                               </div>
                               <div className="flex items-center gap-2">
                                  {/* Show current value if Latest is selected */}
                                  {timeRange === 'latest' && trendData[0] && (
                                      <div className={`text-xl font-black`} style={{ color: cfg.color }}>
                                          {cfg.isCurrency ? '$' : ''}{trendData[0][cfg.key] ?? '--'}
                                      </div>
                                  )}
                                  {/* EXPAND BUTTON */}
                                  <button 
                                      onClick={() => setExpandedChart({ ...cfg, data: trendData })}
                                      className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                                      title="Ampliar Gráfica"
                                  >
                                      <Maximize2 className="h-4 w-4" />
                                  </button>
                               </div>
                           </div>
                           
                           <div className="h-[200px]">
                               {timeRange === 'latest' ? (
                                   // BAR CHART VISUALIZATION FOR SNAPSHOT (LATEST)
                                   <ResponsiveContainer width="100%" height="100%">
                                       <BarChart data={trendData} layout="vertical" margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                                           <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                                           <XAxis type="number" domain={[0, (cfg.max ? cfg.max * 1.5 : 'auto')]} hide />
                                           <YAxis type="category" dataKey="date" hide />
                                           <Tooltip 
                                               cursor={{fill: 'transparent'}}
                                               content={({ payload }) => {
                                                   if (payload && payload.length) {
                                                       return (
                                                           <div className="bg-slate-800 text-white text-xs p-2 rounded shadow">
                                                               {cfg.isCurrency ? '$' : ''}{payload[0].value}
                                                           </div>
                                                       );
                                                   }
                                                   return null;
                                               }}
                                           />
                                           <Bar dataKey={cfg.key} fill={cfg.color} barSize={40} radius={[0, 4, 4, 0]} />
                                           {cfg.max && <ReferenceLine x={cfg.max} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Max', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />}
                                           {cfg.min && <ReferenceLine x={cfg.min} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min', fill: '#ef4444', fontSize: 10, position: 'insideTopRight' }} />}
                                       </BarChart>
                                   </ResponsiveContainer>
                               ) : (
                                   // LINE CHART FOR TRENDS
                                   <ResponsiveContainer width="100%" height="100%">
                                       <LineChart data={trendData}>
                                           <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                           <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                           <YAxis domain={['auto', 'auto']} axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#94a3b8'}} width={35} />
                                           <Tooltip 
                                               contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                               labelStyle={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}
                                               formatter={(value: any) => [cfg.isCurrency ? `$${value}` : value, cfg.name]}
                                           />
                                           {cfg.max && <ReferenceLine y={cfg.max} stroke="#ef4444" strokeDasharray="3 3" />}
                                           {cfg.min && <ReferenceLine y={cfg.min} stroke="#ef4444" strokeDasharray="3 3" />}
                                           <Line 
                                               type="monotone" 
                                               dataKey={cfg.key} 
                                               stroke={cfg.color} 
                                               strokeWidth={3} 
                                               dot={{ r: 3, fill: 'white', strokeWidth: 2 }}
                                               activeDot={{ r: 6 }}
                                           />
                                       </LineChart>
                                   </ResponsiveContainer>
                               )}
                           </div>
                       </div>
                   ))}
               </div>
           ) : (
               <div className="bg-white p-10 rounded-xl border border-dashed border-slate-300 text-center">
                   <p className="text-slate-500">No hay datos suficientes para el rango o máquina seleccionada.</p>
               </div>
           )}
      </div>

      <div className="border-t border-slate-200 my-8"></div>

      {/* Reports & Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden flex flex-col h-[400px]">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Bitácora Reciente (Global)</h2>
            <div className="flex space-x-2">
                 <span className="text-xs text-slate-400 bg-white px-2 py-1 rounded border">Mostrando 50 de {reports.length}</span>
            </div>
          </div>
          <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
            {visibleReports.map(report => (
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
             {hasPieData ? (
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

      {/* --- FULL SCREEN CHART MODAL --- */}
      {expandedChart && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col animate-in fade-in duration-300">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex justify-between items-center shadow-md">
                <div className="flex items-center">
                    <div className="p-2 bg-white/10 rounded-full mr-3">
                         {expandedChart.icon}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold">{expandedChart.name}</h2>
                        <p className="text-xs text-slate-400">Vista detallada e historial</p>
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
                        <LineChart data={expandedChart.data} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
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
                                formatter={(value: any) => [expandedChart.isCurrency ? `$${value}` : value, expandedChart.name]}
                            />
                            {expandedChart.max && (
                                <ReferenceLine y={expandedChart.max} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Máximo', fill: '#ef4444', position: 'insideTopRight' }} />
                            )}
                            {expandedChart.min && (
                                <ReferenceLine y={expandedChart.min} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Mínimo', fill: '#ef4444', position: 'insideBottomRight' }} />
                            )}
                            <Line 
                                type="monotone" 
                                dataKey={expandedChart.key} 
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
                                    tickFormatter={() => ''} // Hide ticks inside brush for cleaner look
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