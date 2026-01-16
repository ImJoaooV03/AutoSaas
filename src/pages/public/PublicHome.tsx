import { useEffect, useState } from "react";
import { useOutletContext, useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatKM } from "../../lib/utils";
import { Car, Fuel, Calendar, Gauge } from "lucide-react";

export function PublicHome() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (tenantId) loadStock();
  }, [tenantId]);

  async function loadStock() {
    // Only fetch AVAILABLE vehicles (Policy enforced by RLS too)
    const { data } = await supabase
      .from('vehicles')
      .select('*, vehicle_media(*)')
      .eq('tenant_id', tenantId)
      .eq('status', 'available') 
      .order('price', { ascending: true });
    
    if (data) setVehicles(data);
    setLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Banner (Simple) */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-8 md:p-12 mb-12 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <h2 className="text-3xl md:text-5xl font-bold mb-4">Encontre seu próximo carro hoje.</h2>
          <p className="text-slate-300 text-lg mb-8">As melhores ofertas com garantia e financiamento facilitado.</p>
          <button className="bg-white text-slate-900 px-6 py-3 rounded-lg font-bold hover:bg-slate-100 transition-colors">
            Ver Ofertas
          </button>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/2 bg-white/5 skew-x-12 transform translate-x-20"></div>
      </div>

      {/* Filters & Title */}
      <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4">
        <div>
          <h3 className="text-2xl font-bold text-slate-800">Nosso Estoque</h3>
          <p className="text-slate-500">{vehicles.length} veículos disponíveis</p>
        </div>
        <div className="flex gap-2">
           <select className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500">
             <option>Mais recentes</option>
             <option>Menor preço</option>
             <option>Maior preço</option>
           </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-80 bg-slate-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {vehicles.map(vehicle => (
            <Link to={`/site/${tenantId}/${vehicle.id}`} key={vehicle.id} className="group bg-white rounded-xl border border-slate-200 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="aspect-[4/3] bg-slate-200 relative overflow-hidden">
                {vehicle.vehicle_media?.[0]?.url ? (
                  <img src={vehicle.vehicle_media[0].url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400"><Car size={32} /></div>
                )}
                <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-black/60 to-transparent p-4">
                    <p className="text-white font-bold text-lg">{formatCurrency(vehicle.price)}</p>
                </div>
              </div>
              <div className="p-4">
                <h4 className="font-bold text-slate-800 truncate">{vehicle.brand} {vehicle.model}</h4>
                <p className="text-sm text-slate-500 mb-4">{vehicle.version}</p>
                
                <div className="grid grid-cols-2 gap-y-2 text-xs text-slate-500">
                  <div className="flex items-center gap-1.5"><Calendar size={14} /> {vehicle.year_manufacture}/{vehicle.year_model}</div>
                  <div className="flex items-center gap-1.5"><Gauge size={14} /> {formatKM(vehicle.km)}</div>
                  <div className="flex items-center gap-1.5"><Fuel size={14} /> {vehicle.fuel}</div>
                  <div className="flex items-center gap-1.5 capitalize"><Car size={14} /> {vehicle.transmission}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
