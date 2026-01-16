import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { formatCurrency, formatKM } from "../../lib/utils";
import { ArrowLeft, MessageCircle, CheckCircle2, Calendar, Gauge, Fuel, Settings2, Palette } from "lucide-react";

export function PublicVehicle() {
  const { tenantId, vehicleId } = useParams<{ tenantId: string, vehicleId: string }>();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (vehicleId) loadVehicle();
  }, [vehicleId]);

  async function loadVehicle() {
    const { data } = await supabase
      .from('vehicles')
      .select('*, vehicle_media(*)')
      .eq('id', vehicleId)
      .eq('status', 'available') // Security check
      .single();
    
    if (data) setVehicle(data);
    setLoading(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;
  if (!vehicle) return <div className="p-12 text-center">Veículo não encontrado ou vendido.</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Link to={`/site/${tenantId}`} className="inline-flex items-center gap-2 text-slate-500 hover:text-blue-600 mb-6 font-medium">
        <ArrowLeft size={18} /> Voltar para o estoque
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Gallery & Details */}
        <div className="lg:col-span-2 space-y-8">
          {/* Main Image */}
          <div className="aspect-video bg-slate-100 rounded-2xl overflow-hidden shadow-sm">
             {vehicle.vehicle_media?.[0] ? (
                <img src={vehicle.vehicle_media[0].url} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">Sem foto</div>
             )}
          </div>
          
          {/* Thumbnails */}
          <div className="grid grid-cols-4 gap-4">
             {vehicle.vehicle_media?.slice(1, 5).map((m: any) => (
                <div key={m.id} className="aspect-video bg-slate-100 rounded-lg overflow-hidden cursor-pointer hover:opacity-80">
                    <img src={m.url} className="w-full h-full object-cover" />
                </div>
             ))}
          </div>

          {/* Description */}
          <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-sm">
            <h3 className="text-xl font-bold text-slate-800 mb-4">Sobre o veículo</h3>
            <p className="text-slate-600 leading-relaxed whitespace-pre-wrap">{vehicle.description}</p>
          </div>
          
          {/* Specs Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
             <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <Calendar className="mx-auto text-blue-600 mb-2" size={20} />
                <p className="text-xs text-slate-500 uppercase font-bold">Ano</p>
                <p className="font-semibold text-slate-800">{vehicle.year_manufacture}/{vehicle.year_model}</p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <Gauge className="mx-auto text-blue-600 mb-2" size={20} />
                <p className="text-xs text-slate-500 uppercase font-bold">KM</p>
                <p className="font-semibold text-slate-800">{formatKM(vehicle.km)}</p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <Fuel className="mx-auto text-blue-600 mb-2" size={20} />
                <p className="text-xs text-slate-500 uppercase font-bold">Combustível</p>
                <p className="font-semibold text-slate-800 capitalize">{vehicle.fuel}</p>
             </div>
             <div className="bg-white p-4 rounded-xl border border-slate-200 text-center">
                <Settings2 className="mx-auto text-blue-600 mb-2" size={20} />
                <p className="text-xs text-slate-500 uppercase font-bold">Câmbio</p>
                <p className="font-semibold text-slate-800 capitalize">{vehicle.transmission}</p>
             </div>
          </div>
        </div>

        {/* Right: Sticky Sidebar */}
        <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-lg">
                    <h1 className="text-2xl font-bold text-slate-900">{vehicle.brand} {vehicle.model}</h1>
                    <p className="text-slate-500 mb-6">{vehicle.version}</p>
                    
                    <div className="mb-8">
                        <p className="text-sm text-slate-500">Preço à vista</p>
                        <p className="text-4xl font-bold text-blue-600">{formatCurrency(vehicle.price)}</p>
                    </div>

                    <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-lg shadow-emerald-200 mb-3">
                        <MessageCircle size={20} />
                        Enviar Mensagem no WhatsApp
                    </button>
                    <button className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-3 rounded-xl transition-colors">
                        Simular Financiamento
                    </button>
                </div>

                <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200">
                    <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-500" />
                        Garantia da Loja
                    </h4>
                    <ul className="space-y-2 text-sm text-slate-600">
                        <li>• Procedência verificada</li>
                        <li>• Revisado com garantia de 3 meses</li>
                        <li>• Documentação em dia</li>
                    </ul>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
