/*
  # Create Transactions Table for General Finance
  
  1. New Tables
    - `transactions`
      - `id` (uuid, primary key)
      - `tenant_id` (uuid, foreign key)
      - `description` (text)
      - `amount` (numeric)
      - `type` (text: 'income' | 'expense')
      - `category` (text)
      - `date` (date)
      - `status` (text: 'paid' | 'pending')
      - `created_at` (timestamp)
      
  2. Security
    - Enable RLS
    - Add policies for tenant isolation
*/

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  type TEXT CHECK (type IN ('income', 'expense')) NOT NULL,
  category TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT CHECK (status IN ('paid', 'pending')) DEFAULT 'paid',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view transactions from their tenant"
  ON public.transactions FOR SELECT
  USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can insert transactions for their tenant"
  ON public.transactions FOR INSERT
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can update transactions from their tenant"
  ON public.transactions FOR UPDATE
  USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can delete transactions from their tenant"
  ON public.transactions FOR DELETE
  USING (tenant_id = public.get_auth_tenant_id());

-- Create index for performance
CREATE INDEX idx_transactions_tenant_date ON public.transactions(tenant_id, date);
