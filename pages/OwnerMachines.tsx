import React, { useEffect, useState } from 'react';
import { api } from '../services/db';
import { Machine } from '../types';
import { ArrowLeft, Plus, Trash2, MapPin, Server, QrCode, X, Download, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import QRCode from 'react-qr-code';

export const OwnerMachines: React.FC = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState<Machine[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [qrModalMachine, setQrModalMachine] = useState<Machine | null>(null);
  
  // Edit State
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);

  // Form State
  const [newId, setNewId] = useState('');
  const [newLocation, setNewLocation] = useState('');

  const fetchMachines = async () => {
    setLoading(true);
    const data = await api.getMachines();
    setMachines(data);
    setLoading(false);
  };

  useEffect(() => {
    fetchMachines();
  }, []);

  const handleSaveMachine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newLocation) return;
    
    try {
      if (editingMachine) {
         // Update Logic
         await api.updateMachine(editingMachine.id, { location: newLocation });
      } else {
         // Create Logic
         await api.addMachine({
            id: newId,
            location: newLocation,
            lastMaintenance: 'Nuevo'
         });
      }
      
      resetForm();
      fetchMachines();
    } catch (error: any) {
      alert(error.message || "Error al guardar máquina");
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(`¿Estás seguro de eliminar la máquina ${id}? Esto no borra sus reportes históricos.`)) {
      await api.deleteMachine(id);
      fetchMachines();
    }
  };

  // Función para imprimir el QR
  const handlePrintQR = () => {
      const printContent = document.getElementById('qr-print-area');
      if(printContent) {
          const win = window.open('', '', 'height=600,width=800');
          if (win) {
              win.document.write('<html><head><title>Imprimir QR</title>');
              win.document.write('</head><body style="text-align:center; font-family: sans-serif;">');
              win.document.write(printContent.innerHTML);
              win.document.write('</body></html>');
              win.document.close();
              win.print();
          }
      }
  };

  const openAdd = () => {
      setEditingMachine(null);
      setNewId('');
      setNewLocation('');
      setIsAdding(true);
  };

  const openEdit = (m: Machine) => {
      setIsAdding(false);
      setEditingMachine(m);
      setNewId(m.id);
      setNewLocation(m.location);
  };

  const resetForm = () => {
      setIsAdding(false);
      setEditingMachine(null);
      setNewId('');
      setNewLocation('');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-20">
      <button onClick={() => navigate('/owner/dashboard')} className="flex items-center text-slate-500 hover:text-indigo-600 mb-4 transition">
        <ArrowLeft className="h-4 w-4 mr-1" /> Volver al Dashboard
      </button>

      <div className="flex flex-col md:flex-row justify-between items-end md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Gestión de Máquinas</h1>
          <p className="text-slate-500 mt-1">Administra el inventario de purificadoras activas.</p>
        </div>
        <button 
          onClick={openAdd}
          className="mt-4 md:mt-0 bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center font-bold shadow hover:bg-indigo-700 transition"
        >
          <Plus className="h-5 w-5 mr-1" />
          Nueva Máquina
        </button>
      </div>

      {/* Add/Edit Modal / Inline Form */}
      {(isAdding || editingMachine) && (
        <div className="bg-white p-6 rounded-xl shadow-lg border border-indigo-100 animate-in fade-in slide-in-from-top-4">
          <h3 className="font-bold text-lg mb-4 text-indigo-900">
              {editingMachine ? 'Editar Máquina' : 'Registrar Nueva Unidad'}
          </h3>
          <form onSubmit={handleSaveMachine} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">ID Único (QR)</label>
              <input 
                type="text" 
                value={newId}
                onChange={e => setNewId(e.target.value)}
                placeholder="Ej: M-005"
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                disabled={!!editingMachine} // No editar ID una vez creado
                autoFocus={!editingMachine}
              />
            </div>
            <div className="flex-[2] w-full">
              <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Ubicación / Dirección</label>
              <input 
                type="text" 
                value={newLocation}
                onChange={e => setNewLocation(e.target.value)}
                placeholder="Ej: Condominio Las Palmas - Lobby"
                className="w-full border border-slate-300 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                autoFocus={!!editingMachine}
              />
            </div>
            <div className="flex space-x-2 w-full md:w-auto">
              <button 
                type="button" 
                onClick={resetForm}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700"
              >
                {editingMachine ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Machines List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-3 text-center py-10 text-slate-400">Cargando inventario...</div>
        ) : machines.length === 0 ? (
          <div className="col-span-3 text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-300">
            <Server className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No hay máquinas registradas.</p>
            <p className="text-sm text-slate-400">Agrega una para comenzar.</p>
          </div>
        ) : (
          machines.map(machine => (
            <div key={machine.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between hover:shadow-md transition group">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className="bg-indigo-50 p-3 rounded-lg">
                    <Server className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div className="flex space-x-1">
                      <button 
                        onClick={() => openEdit(machine)}
                        className="text-slate-300 hover:text-indigo-500 transition p-1"
                        title="Editar máquina"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(machine.id)}
                        className="text-slate-300 hover:text-red-500 transition p-1"
                        title="Eliminar máquina"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-slate-800 mb-1">{machine.id}</h3>
                <div className="flex items-start text-slate-500 text-sm mb-4">
                  <MapPin className="h-4 w-4 mr-1 mt-0.5 flex-shrink-0" />
                  <span>{machine.location}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <div className="text-xs text-slate-400">
                  <span className="block uppercase font-bold text-[10px]">Último Servicio</span>
                  {machine.lastMaintenance || 'Sin registro'}
                </div>
                <button 
                   onClick={() => setQrModalMachine(machine)}
                   className="text-indigo-600 text-xs font-bold flex items-center hover:underline bg-indigo-50 px-2 py-1 rounded"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  Ver QR
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL VISUALIZAR QR */}
      {qrModalMachine && (
        <div className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
           <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
              <button 
                  onClick={() => setQrModalMachine(null)}
                  className="absolute top-4 right-4 bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition"
              >
                  <X className="h-5 w-5 text-slate-500" />
              </button>

              <div id="qr-print-area" className="flex flex-col items-center justify-center py-6">
                   <h3 className="text-xl font-bold text-slate-900 mb-1">Agua/24</h3>
                   <p className="text-sm text-slate-500 mb-6 uppercase tracking-widest font-bold">Escaneo de Servicio</p>
                   
                   <div className="p-4 bg-white border-4 border-slate-900 rounded-xl">
                       <QRCode 
                          value={qrModalMachine.id} 
                          size={180}
                       />
                   </div>

                   <div className="mt-4 text-center">
                       <p className="text-2xl font-black text-slate-900">{qrModalMachine.id}</p>
                       <p className="text-sm text-slate-500">{qrModalMachine.location}</p>
                   </div>
              </div>

              <button 
                  onClick={handlePrintQR}
                  className="w-full bg-slate-900 text-white py-3 rounded-xl font-bold flex items-center justify-center hover:bg-slate-800 transition"
              >
                  <Download className="mr-2 h-5 w-5" />
                  Imprimir Etiqueta
              </button>
           </div>
        </div>
      )}
    </div>
  );
};