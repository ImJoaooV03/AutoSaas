import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useAuth } from "../../../context/AuthContext";
import { CheckCircle2, XCircle, Settings, ExternalLink, AlertTriangle } from "lucide-react";
import { OLXConfigForm } from "./OLXConfigForm";

interface ConnectionStatus {
  portal_code: string;
  is_active: boolean;
  updated_at: string;
}

export function ConnectionsTab() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<ConnectionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPortal, setEditingPortal] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadConnections();
  }, [user]);

  async function loadConnections() {
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      if (!userData) return;

      const { data } = await supabase
        .from('portal_connections')
        .select('portal_code, is_active, updated_at')
        .eq('tenant_id', userData.tenant_id);
      
      if (data) setConnections(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSuccess = () => {
    setEditingPortal(null);
    loadConnections();
    alert("Conexão salva com sucesso!");
  };

  const portals = [
    { 
      code: 'olx', 
      name: 'OLX Brasil', 
      color: 'bg-purple-600', 
      textColor: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      logo: 'O' 
    },
    { 
      code: 'webmotors', 
      name: 'Webmotors', 
      color: 'bg-red-600', 
      textColor: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      logo: 'W' 
    },
    { 
      code: 'facebook', 
      name: 'Facebook / Meta', 
      color: 'bg-blue-600', 
      textColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      logo: 'F' 
    },
  ];

  if (loading) return <div className="p-8 text-center text-slate-500">Carregando conexões...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="grid grid-cols-1 gap-4">
        {portals.map((portal) => {
          const connection = connections.find(c => c.portal_code === portal.code);
          const isConnected = connection?.is_active;
          const isEditing = editingPortal === portal.code;

          if (isEditing) {
             if (portal.code === 'olx') {
                 return (
                    <OLXConfigForm 
                        key={portal.code} 
                        onSuccess={handleSuccess} 
                        onCancel={() => setEditingPortal(null)} 
                    />
                 );
             }
             return (
                <div key={portal.code} className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center">
                    <p className="text-slate-500 mb-4">Configuração para {portal.name} em breve.</p>
                    <button onClick={() => setEditingPortal(null)} className="text-blue-600 hover:underline">Cancelar</button>
                </div>
             );
          }

          return (
            <div key={portal.code} className={`bg-white p-6 rounded-xl border shadow-sm transition-all ${isConnected ? 'border-emerald-200 shadow-emerald-50' : 'border-slate-200'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-sm ${portal.color}`}>
                    {portal.logo}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-lg">{portal.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        {isConnected ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium border border-emerald-200">
                                <CheckCircle2 size={12} /> Conectado
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 text-xs font-medium border border-slate-200">
                                <XCircle size={12} /> Não conectado
                            </span>
                        )}
                    </div>
                  </div>
                </div>

                <button 
                    onClick={() => setEditingPortal(portal.code)}
                    className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 border
                        ${isConnected 
                            ? 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50' 
                            : 'bg-blue-600 text-white border-transparent hover:bg-blue-700 shadow-sm shadow-blue-200'
                        }
                    `}
                >
                    <Settings size={16} />
                    {isConnected ? 'Gerenciar' : 'Conectar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
        <AlertTriangle className="text-amber-600 flex-shrink-0 mt-0.5" size={20} />
        <div>
            <h4 className="font-bold text-amber-800 text-sm">Nota sobre Credenciais</h4>
            <p className="text-amber-700 text-xs mt-1 leading-relaxed">
                Suas chaves de API são armazenadas de forma segura. 
                Certifique-se de usar as credenciais de produção fornecidas pelo portal.
                Em caso de erro de autenticação, o worker irá pausar as publicações automaticamente.
            </p>
        </div>
      </div>
    </div>
  );
}
