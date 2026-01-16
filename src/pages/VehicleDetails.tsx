import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency, formatKM } from "../lib/utils";
import { 
  Save, ArrowLeft, Share2, AlertTriangle, CheckCircle2, 
  Trash2, Image as ImageIcon, FileText, Settings, ExternalLink, Loader2 
} from "lucide-react";
import { workerInstance } from "../modules/integrator/worker";
import { VehicleCostsTab } from "../modules/finance/components/VehicleCostsTab";

type Tab = 'data' | 'media' | 'integrations' | 'costs';

export function VehicleDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [vehicle, setVehicle] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('integrations'); 
  const [listings, setListings] = useState<any[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) loadVehicle();
  }, [id]);

  async function loadVehicle() {
    setLoading(true);
    // 1. Load Vehicle Data
    const { data: vData, error } = await supabase
      .from('vehicles')
      .select('*, vehicle_media(*)')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error(error);
      alert("Erro ao carregar veículo");
      navigate('/vehicles');
      return;
    }
    setVehicle(vData);

    // 2. Load Listings (Integrations)
    const { data: lData } = await supabase
      .from('portal_listings')
      .select('*')
      .eq('vehicle_id', id);
    
    if (lData) setListings(lData);
    
    setLoading(false);
  }

  const handleStatusChange = async (newStatus: string) => {
      setSaving(true);
      const { error } = await supabase
        .from('vehicles')
        .update({ status: newStatus })
        .eq('id', id);
      
      if (error) {
          alert("Erro ao atualizar status");
      } else {
          setVehicle({ ...vehicle, status: newStatus });
      }
      setSaving(false);
  };

  // Action: Publish to OLX (Simulation)
  const handlePublish = async (portalCode: string) => {
    setPublishing(true);
    try {
        // Create Job
        const { error } = await supabase.from('integration_jobs').insert({
            tenant_id: vehicle.tenant_id,
            vehicle_id: vehicle.id,
            portal_code: portalCode,
            job_type: 'publish',
            status: 'pending',
            idempotency_key: `${vehicle.id}-${portalCode}-publish-${Date.now()}`
        });

        if (error) throw error;

        // Trigger worker immediately (client-side sim)
        workerInstance.start();

        alert(`Job de publicação enviado para ${portalCode.toUpperCase()}! Acompanhe o status.`);
        
        // Refresh listings shortly
        setTimeout(loadVehicle, 2000);

    } catch (err: any) {
        alert(`Erro: ${err.message}`);
    } finally {
        setPublishing(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin" /></div>;
  if (!vehicle) return null;

  return (
    <div className="space-y-6 h-full flex flex-col">
      {/* Header */}
      <div className="flex justify-between items-start flex-shrink-0">
        <div className="flex items-center gap-4">
            <button onClick={() => navigate('/vehicles')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
                <ArrowLeft size={20} />
            </button>
            <div>
                <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold text-slate-800">{vehicle.brand} {vehicle.model}</h2>
                    {/* Status Dropdown */}
                    <select 
                        value={vehicle.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={saving}
                        className={`px-2 py-0.5 rounded text-xs font-bold border uppercase outline-none cursor-pointer transition-colors
                            ${vehicle.status === 'available' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
                              vehicle.status === 'sold' ? 'bg-blue-100 text-blue-700 border-blue-200' : 
                              'bg-slate-100 text-slate-600 border-slate-200'}
                        `}
                    >
                        <option value="draft">Rascunho</option>
                        <option value="available">Disponível (Site)</option>
                        <option value="reserved">Reservado</option>
                        <option value="sold">Vendido</option>
                    </select>
                </div>
                <p className="text-sm text-slate-500">{vehicle.version} • {vehicle.year_model} • {formatCurrency(vehicle.price)}</p>
            </div>
        </div>
        <div className="flex gap-2">
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 flex items-center gap-2 font-medium">
                <Save size={18} />
                {saving ? 'Salvando...' : 'Salvar'}
            </button>
            <button className="px-4 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg hover:bg-red-100 flex items-center gap-2 font-medium">
                <Trash2 size={18} />
            </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200 flex gap-6 flex-shrink-0">
        {[
            { id: 'data', label: 'Dados Básicos', icon: FileText },
            { id: 'media', label: 'Fotos & Vídeo', icon: ImageIcon },
            { id: 'integrations', label: 'Integrações', icon: Share2 },
            { id: 'costs', label: 'Custos & Margem', icon: Settings },
        ].map(tab => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`pb-3 flex items-center gap-2 text-sm font-medium transition-colors relative
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
      <div className="flex-1 overflow-y-auto min-h-0 py-4">
        
        {/* TAB: INTEGRAÇÕES (CORE) */}
        {activeTab === 'integrations' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Status Cards */}
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="font-semibold text-slate-800">Portais Conectados</h3>
                    
                    {/* OLX Card */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start justify-between">
                        <div className="flex gap-4">
                            <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                O
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">OLX Brasil</h4>
                                {listings.find(l => l.portal_code === 'olx') ? (
                                    <div className="flex flex-col gap-1 mt-1">
                                        <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium">
                                            <CheckCircle2 size={14} /> Publicado
                                        </div>
                                        <a href="#" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                            Ver anúncio <ExternalLink size={10} />
                                        </a>
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-500 mt-1">Não publicado</p>
                                )}
                            </div>
                        </div>
                        <div>
                            {listings.find(l => l.portal_code === 'olx') ? (
                                <button className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50">
                                    Gerenciar
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handlePublish('olx')}
                                    disabled={publishing}
                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 shadow-sm shadow-purple-200 disabled:opacity-50"
                                >
                                    {publishing ? 'Enviando...' : 'Publicar Agora'}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Webmotors Card (Disabled/Mock) */}
                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-start justify-between opacity-75">
                         <div className="flex gap-4">
                            <div className="w-12 h-12 bg-red-600 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-sm">
                                W
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800">Webmotors</h4>
                                <p className="text-sm text-slate-500 mt-1">Requer plano Elite</p>
                            </div>
                        </div>
                        <button disabled className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg text-sm font-medium cursor-not-allowed">
                            Bloqueado
                        </button>
                    </div>
                </div>

                {/* Validation Sidebar */}
                <div className="bg-slate-50 rounded-xl p-5 border border-slate-200 h-fit">
                    <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" />
                        Checklist de Qualidade
                    </h3>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />
                            <span>Dados básicos completos</span>
                        </li>
                        <li className="flex items-start gap-2 text-sm text-slate-600">
                            <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" />
                            <span>Preço definido</span>
                        </li>
                        <li className={`flex items-start gap-2 text-sm ${vehicle.vehicle_media?.length >= 2 ? 'text-slate-600' : 'text-red-500 font-medium'}`}>
                            {vehicle.vehicle_media?.length >= 2 ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
                            <span>Mínimo 2 fotos (Atual: {vehicle.vehicle_media?.length || 0})</span>
                        </li>
                         <li className={`flex items-start gap-2 text-sm ${vehicle.description?.length >= 50 ? 'text-slate-600' : 'text-red-500 font-medium'}`}>
                            {vehicle.description?.length >= 50 ? <CheckCircle2 size={16} className="text-emerald-500 mt-0.5" /> : <AlertTriangle size={16} className="mt-0.5" />}
                            <span>Descrição detalhada ({vehicle.description?.length || 0}/50 chars)</span>
                        </li>
                    </ul>
                </div>
            </div>
        )}

        {/* TAB: DADOS (Read-only view for now) */}
        {activeTab === 'data' && (
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg mb-4">Ficha Técnica</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Marca/Modelo</p>
                        <p className="text-slate-800">{vehicle.brand} {vehicle.model}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Versão</p>
                        <p className="text-slate-800">{vehicle.version}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">Ano</p>
                        <p className="text-slate-800">{vehicle.year_manufacture}/{vehicle.year_model}</p>
                    </div>
                    <div>
                        <p className="text-xs text-slate-500 uppercase font-bold">KM</p>
                        <p className="text-slate-800">{formatKM(vehicle.km)}</p>
                    </div>
                    <div className="col-span-2">
                        <p className="text-xs text-slate-500 uppercase font-bold">Descrição</p>
                        <p className="text-slate-600 text-sm mt-1">{vehicle.description}</p>
                    </div>
                </div>
            </div>
        )}

        {/* TAB: MÍDIA */}
        {activeTab === 'media' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {vehicle.vehicle_media?.map((media: any) => (
                    <div key={media.id} className="aspect-video bg-slate-100 rounded-lg border border-slate-200 overflow-hidden relative group">
                        <img src={media.url} alt="" className="w-full h-full object-cover" />
                        {media.is_cover && (
                            <div className="absolute top-2 left-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded">CAPA</div>
                        )}
                    </div>
                ))}
                <div className="aspect-video bg-slate-50 rounded-lg border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 cursor-pointer transition-colors">
                    <ImageIcon size={24} />
                    <span className="text-xs font-medium mt-2">Adicionar Foto</span>
                </div>
            </div>
        )}

        {/* TAB: CUSTOS (NOVO) */}
        {activeTab === 'costs' && (
            <VehicleCostsTab vehicleId={vehicle.id} vehiclePrice={vehicle.price} />
        )}

      </div>
    </div>
  );
}
