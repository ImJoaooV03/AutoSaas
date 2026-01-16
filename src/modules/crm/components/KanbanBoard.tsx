import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "../types";
import { Loader2, Phone, Mail, User, AlertCircle, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const COLUMNS: Lead['status'][] = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchLeads();
  }, []);

  async function fetchLeads() {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: apiError } = await supabase
        .from('leads')
        .select('*, vehicles(brand, model)')
        .order('created_at', { ascending: false });
      
      if (apiError) {
        // Throw full error object to access Postgres codes (like 42P17)
        throw apiError;
      }
      
      if (data) {
        setLeads(data as any);
      }
    } catch (err: any) {
      console.error("Erro ao buscar leads:", err);
      
      let message = "Não foi possível carregar os leads.";
      
      // Tratamento amigável de erros comuns
      if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
        message = "Erro de conexão. Verifique sua internet ou se o banco de dados está acessível.";
      } else if (err.code === "42P17" || err.message?.includes("infinite recursion")) {
        message = "Erro crítico de configuração no banco de dados (Recursão). Contate o suporte.";
      } else {
        message = err.message || "Ocorreu um erro desconhecido.";
      }
      
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  const moveCard = async (leadId: string, newStatus: Lead['status']) => {
    // Optimistic update
    const previousLeads = [...leads];
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    
    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao mover card:", err);
      // Revert on error
      setLeads(previousLeads);
      alert("Não foi possível atualizar o status do lead.");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;
  }

  // Error State UI
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-xl border border-red-100 p-8 text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ops! Algo deu errado</h3>
        <p className="text-slate-500 max-w-md mb-6">{error}</p>
        <button 
          onClick={fetchLeads}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <RefreshCw size={16} />
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-12rem)] overflow-x-auto gap-4 pb-4">
      {COLUMNS.map(status => (
        <div key={status} className="min-w-[300px] w-[300px] flex flex-col bg-slate-50 rounded-xl border border-slate-200">
          {/* Header */}
          <div className={`p-3 border-b border-slate-200 font-semibold text-sm flex justify-between items-center ${LEAD_STATUS_COLORS[status].replace('bg-', 'bg-opacity-20 ')}`}>
            <span>{LEAD_STATUS_LABELS[status]}</span>
            <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 border border-slate-200">
              {leads.filter(l => l.status === status).length}
            </span>
          </div>

          {/* Cards Container */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {leads.filter(l => l.status === status).map(lead => (
              <div 
                key={lead.id} 
                className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium text-slate-800 text-sm">{lead.name}</h4>
                  <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
                    {format(new Date(lead.created_at), 'dd/MM', { locale: ptBR })}
                  </span>
                </div>
                
                {/* Vehicle Info */}
                {(lead as any).vehicles && (
                    <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1">
                        <User size={10} />
                        {(lead as any).vehicles.brand} {(lead as any).vehicles.model}
                    </div>
                )}

                <div className="space-y-1">
                    {lead.phone && (
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                            <Phone size={12} /> {lead.phone}
                        </div>
                    )}
                    {lead.email && (
                        <div className="flex items-center gap-2 text-xs text-slate-500 truncate">
                            <Mail size={12} /> {lead.email}
                        </div>
                    )}
                </div>

                {/* Quick Actions (Hover) */}
                <div className="mt-3 pt-2 border-t border-slate-50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                    {status !== 'won' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); moveCard(lead.id, 'won'); }}
                            className="text-[10px] text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded"
                        >
                            Marcar Vendido
                        </button>
                    )}
                     {status !== 'contacted' && status !== 'won' && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); moveCard(lead.id, 'contacted'); }}
                            className="text-[10px] text-blue-600 hover:bg-blue-50 px-2 py-1 rounded"
                        >
                            Mover Contato
                        </button>
                    )}
                </div>
              </div>
            ))}
            
            {leads.filter(l => l.status === status).length === 0 && (
                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
                    <p className="text-xs text-slate-400">Vazio</p>
                </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
