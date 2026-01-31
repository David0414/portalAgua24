import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Report, ReportStatus, Machine } from '../types';
import { Link, useNavigate } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Clock, CheckCircle, XCircle, DollarSign, Activity, Settings, ChevronRight, Users } from 'lucide-react';
import { format } from 'date-fns';

export const OwnerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    const fetch = async () => {
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
      setLoading(false);
    };
    fetch();
  }, []);

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
    <div className="space-y-8">
      <header className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Panel de Propietario</h1>
          <p className="text-slate-500">Gestión de activos, validación y finanzas.</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row md:items-center gap-4">
            
            <div className="bg-green-100 text-green-800 px-6 py-3 rounded-xl flex items-center border border-green-200">
                <div className="bg-green-200 p-2 rounded-full mr-3">
                    <DollarSign className="h-6 w-6 text-green-700" />
                </div>
                <div>
                    <p className="text-xs font-bold uppercase tracking-wide">Ganancias (Mes)</p>
                    <p className="text-2xl font-bold">${totalEarnings.toLocaleString()}</p>
                </div>
            </div>
        </div>
      </header>

      {/* KPI / Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full">
            <Clock className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Validación</p>
            <p className="text-2xl font-bold text-slate-900">{pendingCount} <span className="text-xs text-slate-400 font-normal">Pendientes</span></p>
          </div>
        </div>
        
        <div 
            onClick={() => navigate('/owner/machines')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 cursor-pointer hover:border-indigo-300 transition group relative"
        >
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full">
            <Settings className="h-8 w-8" />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium group-hover:text-indigo-600 transition">Máquinas</p>
            <p className="text-2xl font-bold text-slate-900">{machines.length}</p>
          </div>
        </div>

        <div 
            onClick={() => navigate('/owner/users')}
            className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 cursor-pointer hover:border-blue-300 transition group relative"
        >
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
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
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
            <h2 className="font-semibold text-slate-800">Bitácora de Visitas Recientes</h2>
          </div>
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
            {loading ? <p className="p-6 text-center">Cargando...</p> : reports.map(report => (
              <div key={report.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">{report.machineId}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      report.status === ReportStatus.PENDING ? 'bg-amber-100 text-amber-800' :
                      report.status === ReportStatus.APPROVED ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {report.status}
                    </span>
                    <span className="text-xs text-slate-400 border border-slate-200 px-1 rounded uppercase">{report.type}</span>
                  </div>
                  <p className="text-sm text-slate-500">{report.technicianName} - {format(new Date(report.createdAt), 'dd/MM/yyyy HH:mm')}</p>
                </div>
                <Link 
                  to={`/owner/review/${report.id}`}
                  className="px-3 py-1 bg-white border border-slate-300 text-slate-600 text-sm rounded hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition"
                >
                  {report.status === ReportStatus.PENDING ? 'Validar' : 'Ver'}
                </Link>
              </div>
            ))}
            {reports.length === 0 && !loading && (
              <p className="p-6 text-center text-slate-500">No hay reportes recientes.</p>
            )}
          </div>
        </div>

        {/* Chart */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
           <h2 className="font-semibold text-slate-800 mb-6">Estado de Cumplimiento</h2>
           <div className="h-[300px] w-full">
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
           <div className="flex justify-center space-x-4 mt-4 text-sm">
              <div className="flex items-center"><div className="w-3 h-3 bg-amber-400 rounded-full mr-2"></div> Pendientes</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div> Aprobados</div>
              <div className="flex items-center"><div className="w-3 h-3 bg-red-500 rounded-full mr-2"></div> Rechazados</div>
           </div>
        </div>
      </div>
    </div>
  );
};