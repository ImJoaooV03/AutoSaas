import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/utils";
import { 
  Save, ArrowLeft, Share2, Trash2, 
  Image as ImageIcon, FileText, Settings, Loader2, CheckCircle2 
} from "lucide-react";
import { workerInstance } from "../modules/integrator/worker";
import { VehicleCostsTab } from "../modules/finance/components/VehicleCostsTab";
import { VehicleMediaManager } from "../modules/vehicles/components/VehicleMediaManager";

type Tab = 'data' | 'media' | 'integrations' | 'costs';

export function VehicleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('data'); 
  const [listings, setListings] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form Setup
  const { register, handleSubmit, reset, setValue } = useForm();

  useEffect(() => {
    if (id) loadVehicle();
  }, [id]);

  async function loadVehicle() {
    setLoading(true);
    const { data: vData, error } = await supabase
      .from('vehicles')
      .select('*, vehicle_media(*)')
      .eq('id', id)
      .single();
    
    if (error) {
      alert("Erro ao carregar veículo");
      navigate('/vehicles');
      return;
    }

    // Sort media by position
    if (vData.vehicle_media) {
        vData.vehicle_media.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
    }

    setVehicle(vData);
    reset(vData); // Populate form

    const { data: lData } = await supabase
      .from('portal_listings')
      .select('*')
      .eq('vehicle_id', id);
    
    if (lData) setListings(lData);
    
    setLoading(false);
  }

  const onSubmit = async (data: any) => {
    setSaving(true);
    try {
        const { error } = await supabase
            .from('vehicles')
            .update({
                brand: data.brand,
                model: data.model,
                version: data.version,
                price: data.price,
                km: data.km,
                year_manufacture: data.year_manufacture,
                year_model: data.year_model,
                color: data.color,
                fuel: data.fuel,
                transmission: data.transmission,
                description: data.description,
                status: data.status // Update status from form too
            })
            .eq('id', id);

        if (error) throw error;
        alert("Veículo atualizado com sucesso!");
        loadVehicle(); // Refresh data
    } catch (err: any) {
        alert("Erro ao salvar: " + err.message);
    } finally {
        setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Tem certeza absoluta? Isso apagará o veículo e todos os dados relacionados.")) return;
    const { error } = await supabase.from('vehicles').delete().eq('id', id);
    if (!error) navigate('/vehicles');
  };

  const handlePublish = async (portalCode: string) => {
    setPublishing(true);
    try {
        const { error } = await supabase.from('integration_jobs').insert({
            tenant_id: vehicle.tenant_id,
            vehicle_id: vehicle.id,
            portal_code: portalCode,
            job_type: 'publish',
            status: 'pending',
            idempotency_key: `${vehicle.id}-${portalCode}-publish-${Date.now()}`
        });

        if (error) throw error;
        workerInstance.start();
        alert(`Solicitação enviada para ${portalCode.toUpperCase()}`);
        setTimeout(loadVehicle, 2000);
    } catch (err: any) {
        alert(`Erro: ${err.message}`);
    } finally {
        setPublishing(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!vehicle) return null;

  return (
    <div className="space-y-6 h-full flex flex-col max-w-6xl mx-auto w-full">
      
      {/* Header Actions */}
      <div className="flex justify-between items-start flex-shrink-0 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/vehicles')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                <ArrowLeft size={20} />
            </button>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold text-slate-800">{vehicle.brand} {vehicle.model}</h2>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase border
                        ${vehicle.status === 'available' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                          vehicle.status === 'sold' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                          'bg-slate-100 text-slate-600 border-slate-200'}
                    `}>
                        {vehicle.status === 'draft' ? 'Rascunho' : vehicle.status === 'available' ? 'Disponível' : vehicle.status}
                    </span>
                </div>
                <p className="text-sm text-slate-500">{vehicle.version} • {formatCurrency(vehicle.price)}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={handleSubmit(onSubmit)}
                disabled={saving}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm shadow-blue-200 disabled:opacity-70"
            >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Salvar Alterações
            </button>
            <button 
                onClick={handleDelete}
                className="px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                title="Excluir Veículo"
            >
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-8 flex-shrink-0 px-2">
        {[
            { id: 'data', label: 'Dados do Veículo', icon: FileText },
            { id: 'media', label: 'Fotos & Vídeo', icon: ImageIcon },
            { id: 'integrations', label: 'Integrações', icon: Share2 },
            { id: 'costs', label: 'Financeiro', icon: Settings },
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`pb-3 flex items-center gap-2 text-sm font-medium transition-all relative
                    ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}
                `}
            >
                <tab.icon size={16} />
                {tab.label}
                {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />
                )}
            </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        
        {/* TAB 1: EDIT FORM */}
        {activeTab === 'data' && (
            <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm space-y-8 animate-in fade-in duration-300">
                
                {/* Status & Price Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Status do Veículo</label>
                        <select {...register('status')} className="w-full px-3 py-2 border rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500">
                            <option value="draft">Rascunho (Não visível)</option>
                            <option value="available">Disponível (Site)</option>
                            <option value="reserved">Reservado</option>
                            <option value="sold">Vendido</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Preço de Venda (R$)</label>
                        <input type="number" {...register('price')} className="w-full px-3 py-2 border rounded-lg font-bold text-slate-900 outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Quilometragem</label>
                        <input type="number" {...register('km')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase mb-4">Dados Técnicos</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Marca</label>
                            <input {...register('brand')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Modelo</label>
                            <input {...register('model')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Versão</label>
                            <input {...register('version')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Ano Fab.</label>
                            <input type="number" {...register('year_manufacture')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Ano Mod.</label>
                            <input type="number" {...register('year_model')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Cor</label>
                            <input {...register('color')} className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Combustível</label>
                            <select {...register('fuel')} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                <option value="flex">Flex</option>
                                <option value="gasoline">Gasolina</option>
                                <option value="ethanol">Etanol</option>
                                <option value="diesel">Diesel</option>
                                <option value="hybrid">Híbrido</option>
                                <option value="electric">Elétrico</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700">Câmbio</label>
                            <select {...register('transmission')} className="w-full px-3 py-2 border rounded-lg bg-white outline-none">
                                <option value="automatic">Automático</option>
                                <option value="manual">Manual</option>
                                <option value="cvt">CVT</option>
                                <option value="automated">Automatizado</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-6">
                    <h3 className="text-sm font-bold text-slate-900 uppercase mb-4">Descrição do Anúncio</h3>
                    <textarea 
                        {...register('description')} 
                        rows={6}
                        className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none text-slate-700 leading-relaxed"
                    />
                </div>
            </form>
        )}

        {/* TAB 2: MEDIA MANAGER */}
        {activeTab === 'media' && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
                <VehicleMediaManager 
                    vehicleId={vehicle.id} 
                    tenantId={vehicle.tenant_id} 
                    initialMedia={vehicle.vehicle_media || []}
                    onUpdate={loadVehicle}
                />
            </div>
        )}

        {/* TAB 3: INTEGRATIONS */}
        {activeTab === 'integrations' && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
                <h3 className="text-lg font-semibold text-slate-800 mb-6">Publicação em Portais</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* OLX */}
                    <div className="border border-slate-200 rounded-xl p-6 flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">O</div>
                            <div>
                                <h4 className="font-bold text-slate-800">OLX Brasil</h4>
                                {listings.find(l => l.portal_code === 'olx') ? (
                                    <span className="text-emerald-600 text-sm font-medium flex items-center gap-1 mt-1">
                                        <CheckCircle2 size={14} /> Publicado
                                    </span>
                                ) : (
                                    <span className="text-slate-400 text-sm mt-1">Não publicado</span>
                                )}
                            </div>
                        </div>
                        <button 
                            onClick={() => handlePublish('olx')}
                            disabled={publishing || !!listings.find(l => l.portal_code === 'olx')}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {listings.find(l => l.portal_code === 'olx') ? 'Gerenciar' : (publishing ? 'Enviando...' : 'Publicar')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* TAB 4: FINANCE */}
        {activeTab === 'costs' && (
            <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm animate-in fade-in duration-300">
                <VehicleCostsTab vehicleId={vehicle.id} vehiclePrice={vehicle.price} />
            </div>
        )}

      </div>
    </div>
  );
}
