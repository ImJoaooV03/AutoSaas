import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatKM } from "../lib/utils";
import { Plus, Search, Filter, MoreHorizontal, CheckCircle, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom"; // Import Link

export function VehicleList() {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    // Demo: Fetching from Supabase
    const { data, error } = await supabase
      .from('vehicles')
      .select('*, vehicle_media(url)')
      .order('created_at', { ascending: false });
    
    if (data) setVehicles(data);
    setLoading(false);
  }

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'available': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      case 'draft': return 'bg-slate-100 text-slate-700 border-slate-200';
      case 'sold': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Estoque</h2>
          <p className="text-sm text-slate-500">Gerencie seus veículos e publicações</p>
        </div>
        <Link to="/vehicles/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
          <Plus size={18} />
          Novo Veículo
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por marca, modelo ou placa..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button className="px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 text-slate-600 hover:bg-slate-50">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">Veículo</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Integradores</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan={5} className="p-8 text-center text-slate-500">Carregando estoque...</td></tr>
            ) : vehicles.map((vehicle) => (
              <tr key={vehicle.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-12 bg-slate-200 rounded-md overflow-hidden flex-shrink-0 relative">
                        {vehicle.vehicle_media?.[0]?.url ? (
                            <img src={vehicle.vehicle_media[0].url} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-slate-400 bg-slate-100"><Car size={16} /></div>
                        )}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{vehicle.brand} {vehicle.model}</p>
                      <p className="text-xs text-slate-500">{vehicle.version} • {vehicle.year_model}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-medium text-slate-900">{formatCurrency(vehicle.price)}</p>
                  <p className="text-xs text-slate-500">{formatKM(vehicle.km)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(vehicle.status)}`}>
                    {vehicle.status === 'available' ? 'Disponível' : vehicle.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold border border-slate-200" title="OLX: Não publicado">O</div>
                    <div className="w-6 h-6 rounded bg-slate-100 text-slate-400 flex items-center justify-center text-[10px] font-bold border border-slate-200" title="Webmotors: Inativo">W</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600">
                    <MoreHorizontal size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && vehicles.length === 0 && (
            <div className="p-12 text-center">
                <p className="text-slate-500 mb-2">Nenhum veículo encontrado.</p>
                <Link to="/vehicles/new" className="text-sm text-blue-600 hover:underline">Cadastrar o primeiro veículo</Link>
            </div>
        )}
      </div>
    </div>
  );
}
