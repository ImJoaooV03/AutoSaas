import { z } from 'zod';

export const TransactionSchema = z.object({
  id: z.string().optional(),
  description: z.string().min(3, "Descrição obrigatória"),
  amount: z.coerce.number().min(0.01, "Valor deve ser maior que zero"),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1, "Categoria obrigatória"),
  date: z.string(),
  status: z.enum(['paid', 'pending']),
});

export type TransactionFormValues = z.infer<typeof TransactionSchema>;

export interface FinancialTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  status: 'paid' | 'pending';
  source: 'manual' | 'vehicle_sale' | 'vehicle_cost'; // Para distinguir a origem
  reference_id?: string; // ID do veículo se aplicável
}
