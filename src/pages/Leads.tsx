import { useState } from "react";
import { KanbanBoard } from "../modules/crm/components/KanbanBoard";
import { Plus, Filter, Search } from "lucide-react";
import { supabase } from "../lib/supabase";

export function Leads() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Função simples para criar lead de teste
  const createTestLead = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return alert("Faça login primeiro");

    // Pegar tenant_id do user (via query ou assumindo contexto)
    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
    if (!userData) return alert("Erro ao buscar tenant");

    await supabase.from('leads').insert({
        tenant_id: userData.tenant_id,
        name: `Lead Teste ${Math.floor(Math.random() * 100)}`,
        phone: '11999999999',
        email: 'cliente@teste.com',
        origin: 'manual',
        status: 'new',
        message: 'Tenho interesse no carro...'
    });
    
    // Forçar refresh (idealmente usaria React Query ou Context)
    window.location.reload(); 
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Leads</h2>
          <p className="text-sm text-slate-500">Acompanhe suas negociações em tempo real</p>
        </div>
        <button 
            onClick={createTestLead}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
        >
          <Plus size={18} />
          Novo Lead (Teste)
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex gap-4 flex-shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, telefone ou veículo..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        </div>
        <button className="px-4 py-2 border border-slate-200 rounded-lg flex items-center gap-2 text-slate-600 hover:bg-slate-50 text-sm">
          <Filter size={16} />
          Filtros Avançados
        </button>
      </div>

      {/* Kanban Area */}
      <div className="flex-1 min-h-0">
        <KanbanBoard />
      </div>
    </div>
  );
}
