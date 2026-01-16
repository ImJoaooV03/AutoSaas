import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "../types";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Phone, Mail, User, GripVertical } from "lucide-react";

interface KanbanCardProps {
  lead: Lead;
  moveCard: (leadId: string, newStatus: Lead['status']) => void;
}

export function KanbanCard({ lead, moveCard }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    data: {
      type: "Lead",
      lead,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="bg-blue-50 opacity-40 border-2 border-dashed border-blue-300 p-3 rounded-lg h-[120px]"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        bg-white p-3 rounded-lg border border-slate-200 shadow-sm 
        hover:shadow-md transition-all group relative
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
      {...attributes}
      {...listeners}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
            <GripVertical size={14} className="text-slate-300" />
            <h4 className="font-medium text-slate-800 text-sm">{lead.name}</h4>
        </div>
        <span className="text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded">
          {format(new Date(lead.created_at), 'dd/MM', { locale: ptBR })}
        </span>
      </div>

      {/* Vehicle Info */}
      {(lead as any).vehicles && (
        <div className="text-xs text-blue-600 font-medium mb-2 flex items-center gap-1 pl-5">
          <User size={10} />
          {(lead as any).vehicles.brand} {(lead as any).vehicles.model}
        </div>
      )}

      <div className="space-y-1 pl-5">
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

      {/* Quick Actions (Hover) - Prevent Drag on Click */}
      <div 
        className="mt-3 pt-2 border-t border-slate-50 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity"
        onPointerDown={(e) => e.stopPropagation()} // Stop drag propagation
      >
        {lead.status !== 'won' && (
          <button
            onClick={() => moveCard(lead.id, 'won')}
            className="text-[10px] text-emerald-600 hover:bg-emerald-50 px-2 py-1 rounded font-medium"
          >
            Marcar Vendido
          </button>
        )}
        {lead.status !== 'contacted' && lead.status !== 'won' && (
          <button
            onClick={() => moveCard(lead.id, 'contacted')}
            className="text-[10px] text-blue-600 hover:bg-blue-50 px-2 py-1 rounded font-medium"
          >
            Mover Contato
          </button>
        )}
      </div>
    </div>
  );
}
