import { z } from 'zod';

export const LeadSchema = z.object({
  id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  vehicle_id: z.string().uuid().nullable(),
  assigned_to: z.string().uuid().nullable(),
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().min(1, "Telefone é obrigatório"),
  message: z.string().optional(),
  origin: z.string(),
  status: z.enum(['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost']),
  created_at: z.string(),
});

export type Lead = z.infer<typeof LeadSchema>;

export const LEAD_STATUS_LABELS: Record<Lead['status'], string> = {
  new: 'Novo',
  contacted: 'Em Contato',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  won: 'Vendido',
  lost: 'Perdido'
};

export const LEAD_STATUS_COLORS: Record<Lead['status'], string> = {
  new: 'bg-blue-100 text-blue-700 border-blue-200',
  contacted: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  proposal: 'bg-amber-100 text-amber-700 border-amber-200',
  negotiation: 'bg-purple-100 text-purple-700 border-purple-200',
  won: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  lost: 'bg-slate-100 text-slate-500 border-slate-200'
};
