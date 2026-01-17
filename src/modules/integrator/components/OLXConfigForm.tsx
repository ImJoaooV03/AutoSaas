import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { Loader2, ExternalLink, CheckCircle2, AlertTriangle, RefreshCw, Power } from "lucide-react";

// Configuração Dinâmica da API
// Em produção (Vercel), usa caminho relativo /api para bater na Serverless Function
// Em desenvolvimento, usa localhost:3001
const API_URL = import.meta.env.PROD ? '/api' : 'http://localhost:3001';

interface OLXConfigFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export function OLXConfigForm({ onSuccess, onCancel }: OLXConfigFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connection, setConnection] = useState<any>(null);
  const [testResult, setTestResult] = useState<any>(null);

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

      if (data) setConnection(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      if (!userData) throw new Error("Tenant não encontrado");

      // 1. Pedir URL de Auth para o Backend
      const response = await fetch(`${API_URL}/integrations/olx/auth-url?tenantId=${userData.tenant_id}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Falha na API (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      if (data.url) {
        // 2. Redirecionar usuário para OLX
        window.location.href = data.url;
      } else {
        alert("Erro ao gerar URL de autenticação");
      }
    } catch (err: any) {
      console.error("Erro de conexão:", err);
      alert("Erro ao conectar: " + err.message + "\n\nVerifique se as variáveis de ambiente (OLX_CLIENT_ID, etc) estão configuradas na Vercel.");
      setConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    setTestResult(null);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      
      const response = await fetch(`${API_URL}/integrations/olx/me?tenantId=${userData.tenant_id}`);
      const data = await response.json();

      if (response.ok) {
        setTestResult({ success: true, message: `Conectado como: ${data.user?.name || 'Usuário OLX'}` });
      } else {
        setTestResult({ success: false, message: 'Falha na validação. Token pode estar expirado.' });
      }
    } catch (err) {
      setTestResult({ success: false, message: 'Erro de rede ao testar conexão.' });
    }
  };

  const handleDisconnect = async () => {
    if (!confirm("Tem certeza? Isso impedirá novas publicações.")) return;
    try {
        await supabase.from('portal_connections').delete().eq('id', connection.id);
        setConnection(null);
        onSuccess();
    } catch (err) {
        alert("Erro ao desconectar");
    }
  };

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>;

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2 shadow-sm">
      <div className="flex justify-between items-start mb-6">
        <div>
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                Configurar OLX Brasil
                {connection?.is_active && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">Ativo</span>}
            </h3>
            <p className="text-sm text-slate-500 mt-1">Conecte sua conta profissional para publicar automaticamente.</p>
        </div>
      </div>

      {!connection ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Power size={32} />
            </div>
            <h4 className="font-bold text-slate-800 mb-2">Conectar Conta OLX</h4>
            <p className="text-sm text-slate-500 max-w-md mx-auto mb-6">
                Você será redirecionado para o site da OLX para autorizar o AutoSaaS a gerenciar seus anúncios.
            </p>
            <button 
                onClick={handleConnect}
                disabled={connecting}
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-3 rounded-lg font-bold shadow-lg shadow-purple-200 transition-transform hover:-translate-y-1 flex items-center gap-2 mx-auto"
            >
                {connecting ? <Loader2 className="animate-spin" /> : <ExternalLink size={18} />}
                Autorizar Integração
            </button>
            
            <div className="mt-6 p-3 bg-blue-50 border border-blue-100 rounded text-xs text-blue-700 max-w-sm mx-auto">
                <p><strong>Nota:</strong> Certifique-se de ter configurado as credenciais da OLX nas variáveis de ambiente da Vercel.</p>
            </div>
        </div>
      ) : (
        <div className="space-y-6">
            <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4 flex gap-3 items-start">
                <CheckCircle2 className="text-emerald-600 flex-shrink-0 mt-0.5" size={20} />
                <div>
                    <h4 className="font-bold text-emerald-800 text-sm">Integração Ativa</h4>
                    <p className="text-emerald-700 text-xs mt-1">
                        Sua conta está conectada e pronta para receber anúncios.
                        <br/>Conectado em: {new Date(connection.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {testResult && (
                <div className={`p-3 rounded-lg text-sm flex items-center gap-2 ${testResult.success ? 'bg-blue-50 text-blue-700' : 'bg-red-50 text-red-700'}`}>
                    {testResult.success ? <CheckCircle2 size={16}/> : <AlertTriangle size={16}/>}
                    {testResult.message}
                </div>
            )}

            <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button 
                    onClick={handleTestConnection}
                    className="px-4 py-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg font-medium text-sm flex items-center gap-2"
                >
                    <RefreshCw size={16} /> Testar Conexão
                </button>
                <button 
                    onClick={handleDisconnect}
                    className="px-4 py-2 bg-white border border-red-100 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm flex items-center gap-2"
                >
                    Desconectar
                </button>
            </div>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button onClick={onCancel} className="text-sm text-slate-500 hover:underline">Voltar</button>
      </div>
    </div>
  );
}
