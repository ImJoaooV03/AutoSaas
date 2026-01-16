import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatKM } from "../lib/utils";
import { 
  Plus, Search, Filter, MoreHorizontal, Car, 
  Edit, Trash2, Globe, Loader2 
} from "lucide-react";
import { Link } from "react-router-dom";

interface Vehicle {
  id: string;
  tenant_id: string;
  brand: string;
  model: string;
  version: string;
  year_model: number;
  price: number;
  km: number;
  status: 'draft' | 'available' | 'sold' | 'reserved';
  vehicle_media: { url: string; is_cover: boolean }[];
  portal_listings: { portal_code: string; status: string }[];
}

export function VehicleList() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  useEffect(() => {
    loadVehicles();
  }, []);

  async function loadVehicles() {
    setLoading(true);
    // Adicionado is_cover na seleção
    const { data } = await supabase
      .from('vehicles')
      .select('*, vehicle_media(url, is_cover), portal_listings(portal_code, status)')
      .order('created_at', { ascending: false });
    
    if (data) setVehicles(data as any);
    setLoading(false);
  }

  async function handleStatusChange(id: string, newStatus: string) {
    setUpdatingStatus(id);
    const { error } = await supabase.from('vehicles').update({ status: newStatus }).eq('id', id);
    
    if (!error) {
        setVehicles(prev => prev.map(v => v.id === id ? { ...v, status: newStatus as any } : v));
    } else {
        alert("Erro ao atualizar status");
    }
    setUpdatingStatus(null);
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este veículo? Essa ação não pode ser desfeita.")) return;

    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (error) {
      alert("Erro ao excluir: " + error.message);
    } else {
      setVehicles(prev => prev.filter(v => v.id !== id));
    }
  }

  const filteredVehicles = vehicles.filter(v => 
    v.model.toLowerCase().includes(searchTerm.toLowerCase()) ||
    v.brand.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Estoque</h2>
          <p className="text-sm text-slate-500">Gerencie seus veículos e publicações</p>
        </div>
        <Link to="/vehicles/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm shadow-blue-200">
          <Plus size={18} />
          Novo Veículo
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por marca, modelo ou versão..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>
        <button className="px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 text-slate-600 hover:bg-slate-50 transition-colors">
          <Filter size={18} />
          Filtros
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4 w-[40%]">Veículo</th>
              <th className="px-6 py-4">Preço</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Integrações</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
               <tr><td colSpan={5} className="p-12 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" /> Carregando estoque...</td></tr>
            ) : filteredVehicles.length === 0 ? (
                <tr>
                    <td colSpan={5} className="p-12 text-center">
                        <div className="flex flex-col items-center justify-center text-slate-400">
                            <Car size={48} className="mb-4 opacity-20" />
                            <p className="text-slate-500 font-medium">Nenhum veículo encontrado.</p>
                            <Link to="/vehicles/new" className="text-sm text-blue-600 hover:underline mt-2">Cadastrar veículo</Link>
                        </div>
                    </td>
                </tr>
            ) : (
              filteredVehicles.map((vehicle) => {
                const isOlx = vehicle.portal_listings?.some(p => p.portal_code === 'olx' && p.status === 'published');
                const isWebmotors = vehicle.portal_listings?.some(p => p.portal_code === 'webmotors' && p.status === 'published');

                // Encontrar a imagem de capa ou usar a primeira disponível
                const coverImage = vehicle.vehicle_media?.find(m => m.is_cover) || vehicle.vehicle_media?.[0];

                return (
                  <tr key={vehicle.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-16 bg-slate-100 rounded-lg overflow-hidden flex-shrink-0 border border-slate-200 relative">
                            {coverImage?.url ? (
                                <img src={coverImage.url} alt={`${vehicle.brand} ${vehicle.model}`} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300"><Car size={24} /></div>
                            )}
                        </div>
                        <div>
                          <Link to={`/vehicles/${vehicle.id}`} className="font-bold text-slate-800 hover:text-blue-600 transition-colors text-base">
                            {vehicle.brand} {vehicle.model}
                          </Link>
                          <p className="text-xs text-slate-500 mt-0.5">{vehicle.version}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{vehicle.year_model} • {formatKM(vehicle.km)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <p className="font-bold text-slate-900 text-base">{formatCurrency(vehicle.price)}</p>
                    </td>

                    <td className="px-6 py-4">
                      <div className="relative">
                        {updatingStatus === vehicle.id && (
                            <div className="absolute inset-0 flex items-center justify-center bg-white/80 z-10">
                                <Loader2 size={14} className="animate-spin text-blue-600" />
                            </div>
                        )}
                        <select 
                            value={vehicle.status}
                            onChange={(e) => handleStatusChange(vehicle.id, e.target.value)}
                            className={`
                                appearance-none pl-3 pr-8 py-1.5 rounded-full text-xs font-bold uppercase border cursor-pointer outline-none transition-all hover:shadow-sm
                                ${vehicle.status === 'available' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:border-emerald-300' : 
                                  vehicle.status === 'sold' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-300' : 
                                  vehicle.status === 'reserved' ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-300' :
                                  'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'}
                            `}
                            style={{ backgroundImage: 'none' }}
                        >
                            <option value="draft">Rascunho</option>
                            <option value="available">Disponível</option>
                            <option value="reserved">Reservado</option>
                            <option value="sold">Vendido</option>
                        </select>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex gap-2 items-center">
                        {isOlx && (
                            <span className="w-6 h-6 rounded flex items-center justify-center bg-purple-100 text-purple-700 border border-purple-200 font-bold text-[10px]" title="OLX">O</span>
                        )}
                        {isWebmotors && (
                            <span className="w-6 h-6 rounded flex items-center justify-center bg-red-100 text-red-700 border border-red-200 font-bold text-[10px]" title="Webmotors">W</span>
                        )}
                        {!isOlx && !isWebmotors && <span className="text-slate-400 text-xs">-</span>}
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right relative">
                      <div className="relative inline-block text-left" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => setActiveMenuId(activeMenuId === vehicle.id ? null : vehicle.id)}
                          className={`p-2 rounded-lg transition-colors ${activeMenuId === vehicle.id ? 'bg-slate-200 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'}`}
                        >
                          <MoreHorizontal size={18} />
                        </button>

                        {activeMenuId === vehicle.id && (
                          <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right overflow-hidden">
                            <div className="py-1">
                              <Link 
                                to={`/vehicles/${vehicle.id}`}
                                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-blue-600 transition-colors"
                              >
                                <Edit size={16} /> Editar Completo
                              </Link>
                              
                              {vehicle.status === 'available' && (
                                <Link 
                                    to={`/site/${vehicle.tenant_id}/${vehicle.id}`}
                                    target="_blank"
                                    className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-emerald-600 transition-colors"
                                >
                                    <Globe size={16} /> Ver no Site
                                </Link>
                              )}

                              <button 
                                onClick={(e) => handleDelete(vehicle.id, e)}
                                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-slate-50"
                              >
                                <Trash2 size={16} /> Excluir
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
