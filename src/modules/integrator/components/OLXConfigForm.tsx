import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { Loader2, Save, AlertCircle, Eye, EyeOff, Trash2, HelpCircle, ExternalLink } from "lucide-react";

const olxSchema = z.object({
  clientId: z.string().min(10, "Client ID inválido (mínimo 10 caracteres)"),
  clientSecret: z.string().min(10, "Client Secret inválido (mínimo 10 caracteres)"),
});

type OLXFormData = z.infer<typeof olxSchema>;

interface OLXConfigFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function OLXConfigForm({ onSuccess, onCancel }: OLXConfigFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSecret, setShowSecret] = useState(false);
  const [connectionId, setConnectionId] = useState<string | null>(null);
  
  const { register, handleSubmit, formState: { errors }, setValue } = useForm<OLXFormData>({
    resolver: zodResolver(olxSchema),
  });

  useEffect(() => {
    if (user) loadConnection();
  }, [user]);

  async function loadConnection() {
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      if (!userData) return;

      const { data } = await supabase
        .from('portal_connections')
        .select('*')
        .eq('tenant_id', userData.tenant_id)
        .eq('portal_code', 'olx')
        .single();

      if (data) {
        setConnectionId(data.id);
        const config = data.config_json || {};
        setValue('clientId', config.clientId || '');
        setValue('clientSecret', config.clientSecret || '');
      }
    } catch (err) {
      console.error("Erro ao carregar conexão", err);
    } finally {
      setLoading(false);
    }
  }

  const onSubmit = async (data: OLXFormData) => {
    setSaving(true);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      if (!userData) throw new Error("Tenant não encontrado");

      const payload = {
        tenant_id: userData.tenant_id,
        portal_code: 'olx',
        is_active: true,
        config_json: {
          clientId: data.clientId,
          clientSecret: data.clientSecret,
          updatedAt: new Date().toISOString()
        }
      };

      if (connectionId) {
        const { error } = await supabase
          .from('portal_connections')
          .update(payload)
          .eq('id', connectionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('portal_connections')
          .insert(payload);
        if (error) throw error;
      }

      onSuccess();
    } catch (err: any) {
      alert("Erro ao salvar conexão: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connectionId || !confirm("Tem certeza? Isso irá pausar todas as sincronizações com a OLX.")) return;
    
    setSaving(true);
    try {
       await supabase.from('portal_connections').delete().eq('id', connectionId);
       onSuccess();
    } catch (err: any) {
       alert("Erro ao desconectar: " + err.message);
    } finally {
       setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Configurar OLX Brasil
                {connectionId && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Ativo</span>}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Integração oficial via API para publicação automática.</p>
        </div>
        {connectionId && (
            <button 
                type="button" 
                onClick={handleDisconnect}
                className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"
            >
                <Trash2 size={16} /> Desconectar
            </button>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6 flex gap-3">
        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg h-fit">
            <ExternalLink size={18} />
        </div>
        <div>
            <h4 className="text-sm font-bold text-blue-800">Onde encontrar as credenciais?</h4>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                Acesse o <a href="#" className="underline hover:text-blue-900 font-medium">Portal do Desenvolvedor OLX</a>, vá em "Minhas Aplicações" e crie um novo App.
                Copie o <strong>Client ID</strong> e o <strong>Client Secret</strong> gerados lá e cole abaixo.
            </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client ID</label>
            <input 
                {...register('clientId')}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                placeholder="Ex: client_123456789"
            />
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-slate-500">
                <HelpCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>Identificador público da sua aplicação na OLX. Geralmente começa com "client_".</span>
            </div>
            {errors.clientId && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.clientId.message}</p>}
        </div>

        <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client Secret</label>
            <div className="relative">
                <input 
                    {...register('clientSecret')}
                    type={showSecret ? "text" : "password"}
                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none transition-all pr-10"
                    placeholder="••••••••••••••••"
                />
                <button 
                    type="button"
                    onClick={() => setShowSecret(!showSecret)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                    {showSecret ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </div>
            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-slate-500">
                <HelpCircle size={12} className="mt-0.5 flex-shrink-0" />
                <span>Chave secreta para autenticação. Nunca compartilhe este código.</span>
            </div>
            {errors.clientSecret && <p className="text-red-500 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12}/> {errors.clientSecret.message}</p>}
        </div>

        <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 mt-6">
            <button 
                type="button" 
                onClick={onCancel}
                className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium transition-colors"
            >
                Cancelar
            </button>
            <button 
                type="submit" 
                disabled={saving}
                className="px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-purple-200 disabled:opacity-70 transition-all"
            >
                {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Salvar Conexão
            </button>
        </div>
      </form>
    </div>
  );
}
