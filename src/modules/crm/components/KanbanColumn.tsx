import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Lead, LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from "../types";
import { KanbanCard } from "./KanbanCard";

interface KanbanColumnProps {
  status: Lead['status'];
  leads: Lead[];
  moveCard: (leadId: string, newStatus: Lead['status']) => void;
}

export function KanbanColumn({ status, leads, moveCard }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    data: {
        type: "Column",
        status
    }
  });

  return (
    <div className="min-w-[300px] w-[300px] flex flex-col h-full">
      {/* Header */}
      <div className={`p-3 rounded-t-xl border-t border-x border-slate-200 font-semibold text-sm flex justify-between items-center ${LEAD_STATUS_COLORS[status].replace('bg-', 'bg-opacity-20 ')}`}>
        <span>{LEAD_STATUS_LABELS[status]}</span>
        <span className="bg-white px-2 py-0.5 rounded-full text-xs text-slate-500 border border-slate-200">
          {leads.length}
        </span>
      </div>

      {/* Droppable Area */}
      <div
        ref={setNodeRef}
        className={`
            flex-1 p-2 space-y-2 rounded-b-xl border-x border-b border-slate-200 bg-slate-50 overflow-y-auto custom-scrollbar transition-colors
            ${isOver ? 'bg-blue-50 ring-2 ring-blue-200 ring-inset' : ''}
        `}
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <KanbanCard key={lead.id} lead={lead} moveCard={moveCard} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
            <div className="h-24 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center text-slate-400 text-xs">
                Arraste aqui
            </div>
        )}
      </div>
    </div>
  );
}
