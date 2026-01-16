import { useEffect, useState, useMemo } from "react";
import { supabase } from "../../../lib/supabase";
import { Lead } from "../types";
import { Loader2, AlertCircle, RefreshCw } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCorners,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import { sortableKeyboardCoordinates, arrayMove } from "@dnd-kit/sortable";
import { KanbanColumn } from "./KanbanColumn";
import { KanbanCard } from "./KanbanCard";
import { createPortal } from "react-dom";

const COLUMNS: Lead['status'][] = ['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost'];

export function KanbanBoard() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);

  // Sensors (Mouse/Touch/Keyboard)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Prevent accidental drags when clicking buttons
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
      
      if (apiError) throw apiError;
      if (data) setLeads(data as any);
    } catch (err: any) {
      console.error("Erro ao buscar leads:", err);
      setError("Não foi possível carregar os leads. Verifique sua conexão.");
    } finally {
      setLoading(false);
    }
  }

  // --- Drag Handlers ---

  function onDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "Lead") {
      setActiveLead(event.active.data.current.lead);
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveALead = active.data.current?.type === "Lead";
    const isOverALead = over.data.current?.type === "Lead";
    const isOverAColumn = over.data.current?.type === "Column";

    if (!isActiveALead) return;

    // Cenário 1: Arrastando sobre outro Lead
    if (isActiveALead && isOverALead) {
      setLeads((leads) => {
        const activeIndex = leads.findIndex((l) => l.id === activeId);
        const overIndex = leads.findIndex((l) => l.id === overId);

        // Se estiverem em colunas diferentes, atualiza o status visualmente
        if (leads[activeIndex].status !== leads[overIndex].status) {
            const updatedLeads = [...leads];
            updatedLeads[activeIndex].status = leads[overIndex].status;
            return arrayMove(updatedLeads, activeIndex, overIndex - 1); // Insert before
        }

        // Mesma coluna, apenas reordena
        return arrayMove(leads, activeIndex, overIndex);
      });
    }

    // Cenário 2: Arrastando sobre uma Coluna vazia (ou área da coluna)
    if (isActiveALead && isOverAColumn) {
      setLeads((leads) => {
        const activeIndex = leads.findIndex((l) => l.id === activeId);
        const newStatus = over.id as Lead['status'];

        if (leads[activeIndex].status !== newStatus) {
            const updatedLeads = [...leads];
            updatedLeads[activeIndex].status = newStatus;
            return arrayMove(updatedLeads, activeIndex, activeIndex); // Update status only
        }
        return leads;
      });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const { active, over } = event;
    if (!over) return;

    const activeLeadId = active.id as string;
    const activeLead = leads.find(l => l.id === activeLeadId);
    
    // O status já foi atualizado no estado local pelo onDragOver (Optimistic UI)
    // Agora precisamos persistir no banco se houve mudança
    if (activeLead) {
        // Encontrar o status atual baseado na coluna onde ele "caiu" ou no estado atualizado
        // Nota: Como onDragOver já atualizou o 'status' no array 'leads', podemos apenas salvar.
        // Mas para garantir, verificamos se o 'over' é uma coluna ou um card de outra coluna.
        
        // A maneira mais segura é confiar no estado 'leads' que foi atualizado visualmente
        // e disparar o update para o banco.
        persistMove(activeLead.id, activeLead.status);
    }
  }

  // --- Persistence ---

  const persistMove = async (leadId: string, newStatus: Lead['status']) => {
    try {
      const { error } = await supabase.from('leads').update({ status: newStatus }).eq('id', leadId);
      if (error) throw error;
    } catch (err) {
      console.error("Erro ao persistir movimento:", err);
      alert("Erro ao salvar alteração. Recarregando...");
      fetchLeads(); // Revert on error
    }
  };

  // Função auxiliar para botões manuais (sem drag)
  const manualMoveCard = (leadId: string, newStatus: Lead['status']) => {
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
    persistMove(leadId, newStatus);
  };

  // --- Render ---

  if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-blue-600" /></div>;

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[400px] bg-white rounded-xl border border-red-100 p-8 text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
          <AlertCircle size={24} />
        </div>
        <h3 className="text-lg font-semibold text-slate-800 mb-2">Ops! Algo deu errado</h3>
        <p className="text-slate-500 max-w-md mb-6">{error}</p>
        <button onClick={fetchLeads} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors">
          <RefreshCw size={16} /> Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <div className="flex h-[calc(100vh-12rem)] overflow-x-auto gap-4 pb-4">
        {COLUMNS.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            leads={leads.filter((l) => l.status === status)}
            moveCard={manualMoveCard}
          />
        ))}
      </div>

      {createPortal(
        <DragOverlay>
          {activeLead && (
            <div className="opacity-90 rotate-2 scale-105 cursor-grabbing">
                <KanbanCard lead={activeLead} moveCard={() => {}} />
            </div>
          )}
        </DragOverlay>,
        document.body
      )}
    </DndContext>
  );
}
