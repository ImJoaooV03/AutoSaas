import { useState } from "react";
import { KanbanBoard } from "../modules/crm/components/KanbanBoard";
import { Plus, Filter, Search } from "lucide-react";
import { LeadModal } from "../modules/crm/components/LeadModal";

export function Leads() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Usado para forçar reload do Kanban

  const handleLeadCreated = () => {
    // Incrementa a chave para forçar o componente filho (Kanban) a recarregar
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Leads</h2>
          <p className="text-sm text-slate-500">Acompanhe suas negociações em tempo real</p>
        </div>
        <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-sm shadow-blue-200"
        >
          <Plus size={18} />
          Novo Lead
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
        {/* Passamos a key para forçar remontagem quando um lead é criado */}
        <KanbanBoard key={refreshKey} />
      </div>

      {/* Modal de Cadastro */}
      <LeadModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSuccess={handleLeadCreated}
      />
    </div>
  );
}
