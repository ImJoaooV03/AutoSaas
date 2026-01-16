import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { Loader2, Save, Building2, Globe, Activity, CheckCircle2, XCircle, Server, Database, Play } from "lucide-react";
import { seedDatabase } from "../lib/seeder";
import { workerInstance } from "../modules/integrator/worker";

interface TenantForm {
  name: string;
  slug: string;
  phone: string;
  address: string;
}

export function Settings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [tenantId, setTenantId] = useState<string>("");
  const [health, setHealth] = useState({
    db: 'checking',
    auth: 'checking',
    worker: 'checking'
  });

  const { register, handleSubmit, setValue } = useForm<TenantForm>();

  useEffect(() => {
    if (user) {
        loadSettings();
        checkSystemHealth();
    }
  }, [user]);

  async function loadSettings() {
    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
    if (!userData) return;
    
    setTenantId(userData.tenant_id);

    const { data: tenant } = await supabase.from('tenants').select('*').eq('id', userData.tenant_id).single();
    if (tenant) {
        setValue('name', tenant.name);
        setValue('slug', tenant.slug);
        setValue('phone', tenant.phone || '');
        setValue('address', tenant.address || '');
    }
    setLoading(false);
  }

  async function checkSystemHealth() {
    // 1. Check DB
    const start = performance.now();
    const { error: dbError } = await supabase.from('tenants').select('count').limit(1).single();
    const dbLatency = Math.round(performance.now() - start);
    
    // 2. Check Auth
    const { data: { session } } = await supabase.auth.getSession();

    // 3. Check Worker (Real status check)
    const workerActive = workerInstance.isActive;

    setHealth({
        db: !dbError ? `Online (${dbLatency}ms)` : 'Offline',
        auth: session ? 'Online' : 'Offline',
        worker: workerActive ? 'Active' : 'Stopped'
    });
  }

  const handleSeed = async () => {
    if (!confirm("Isso irá adicionar dados fictícios à sua conta. Deseja continuar?")) return;
    setSeeding(true);
    try {
        await seedDatabase(user!.id, tenantId);
        alert("Dados gerados com sucesso! Confira o Dashboard.");
        window.location.reload();
    } catch (err: any) {
        alert("Erro ao gerar dados: " + err.message);
    } finally {
        setSeeding(false);
    }
  };

  const onSubmit = async (data: TenantForm) => {
    setSaving(true);
    try {
        const { error } = await supabase
            .from('tenants')
            .update({
                name: data.name,
                slug: data.slug,
                phone: data.phone,
                address: data.address,
                updated_at: new Date().toISOString()
            })
            .eq('id', tenantId);

        if (error) throw error;
        alert("Configurações salvas com sucesso!");
    } catch (err: any) {
        alert("Erro ao salvar: " + err.message);
    } finally {
        setSaving(false);
    }
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Configurações da Loja</h2>
        <p className="text-sm text-slate-500">Gerencie os dados da sua revenda e monitore o sistema</p>
      </div>

      {/* System Health Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                    <Activity size={20} />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800">Status do Sistema</h3>
                    <p className="text-xs text-slate-500">Monitoramento em tempo real</p>
                </div>
            </div>
            <button onClick={checkSystemHealth} className="text-xs text-blue-600 hover:underline">Atualizar</button>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                <Server size={20} className="text-slate-400" />
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Banco de Dados</p>
                    <div className="flex items-center gap-1.5">
                        {health.db.includes('Online') ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
                        <span className="text-sm font-bold text-slate-800">{health.db}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                <div className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-500">ID</div>
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Autenticação</p>
                    <div className="flex items-center gap-1.5">
                        {health.auth === 'Online' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
                        <span className="text-sm font-bold text-slate-800">{health.auth}</span>
                    </div>
                </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50">
                <Activity size={20} className="text-slate-400" />
                <div>
                    <p className="text-xs font-medium text-slate-500 uppercase">Worker de Integração</p>
                    <div className="flex items-center gap-1.5">
                        {health.worker === 'Active' ? <CheckCircle2 size={14} className="text-emerald-500" /> : <XCircle size={14} className="text-red-500" />}
                        <span className="text-sm font-bold text-slate-800">{health.worker}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* General Settings */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center gap-3">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={20} />
            </div>
            <div>
                <h3 className="font-semibold text-slate-800">Dados Gerais</h3>
                <p className="text-xs text-slate-500">Informações visíveis no site público</p>
            </div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Nome da Revenda</label>
                    <input 
                        {...register('name', { required: true })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">URL do Site (Slug)</label>
                    <div className="flex">
                        <span className="inline-flex items-center px-3 rounded-l-lg border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                            autos.com/site/
                        </span>
                        <input 
                            {...register('slug', { required: true })}
                            className="flex-1 px-3 py-2 border border-slate-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Telefone / WhatsApp</label>
                    <input 
                        {...register('phone')}
                        placeholder="(00) 00000-0000"
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Endereço Completo</label>
                    <input 
                        {...register('address')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                </div>
            </div>

            <div className="pt-4 flex justify-end">
                <button 
                    type="submit" 
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-70"
                >
                    {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Salvar Alterações
                </button>
            </div>
        </form>
      </div>

      {/* Developer Zone */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 shadow-sm overflow-hidden border-dashed">
         <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="p-2 bg-slate-200 text-slate-600 rounded-lg">
                <Database size={20} />
            </div>
            <div>
                <h3 className="font-semibold text-slate-800">Zona do Desenvolvedor</h3>
                <p className="text-xs text-slate-500">Ferramentas de teste e debug</p>
            </div>
        </div>
        <div className="p-6 flex items-center justify-between">
            <div>
                <h4 className="font-medium text-slate-800">Gerar Dados de Teste</h4>
                <p className="text-sm text-slate-500 mt-1">Popula o banco com veículos, leads e propostas fictícias.</p>
            </div>
            <button 
                onClick={handleSeed}
                disabled={seeding}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-900 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
                {seeding ? <Loader2 className="animate-spin" size={16} /> : <Play size={16} />}
                Rodar Seeder
            </button>
        </div>
      </div>

    </div>
  );
}
