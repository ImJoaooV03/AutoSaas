/*
  # Security Polish & Proposals Module
  
  1. Security Fixes:
     - Fix 'search_path' warning on handle_new_user function.
     - Ensure RLS is enabled on ALL public tables dynamically.
  
  2. New Module: Proposals
     - Create 'proposals' table.
     - Add RLS policies.
*/

-- 1. FIX FUNCTION SEARCH PATH (Security Advisory)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Explicitly set search_path
AS $$
DECLARE
  new_tenant_id UUID;
  company_name TEXT;
BEGIN
  -- Get company name from metadata or default
  company_name := new.raw_user_meta_data->>'company_name';
  IF company_name IS NULL OR company_name = '' THEN
    company_name := 'Minha Revenda';
  END IF;

  -- 1. Create Tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (company_name, lower(regexp_replace(company_name, '\s+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 4))
  RETURNING id INTO new_tenant_id;

  -- 2. Create User Profile linked to Tenant
  INSERT INTO public.users (id, email, role, tenant_id)
  VALUES (new.id, new.email, 'owner', new_tenant_id);

  RETURN new;
END;
$$;

-- 2. DYNAMIC RLS ENFORCEMENT (Fix "RLS Disabled" Advisory)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP;
END;
$$;

-- 3. CREATE PROPOSALS TABLE
CREATE TABLE IF NOT EXISTS public.proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id),
    lead_id UUID REFERENCES public.leads(id), -- Optional link to lead
    user_id UUID REFERENCES auth.users(id), -- Creator
    
    customer_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', -- draft, sent, accepted, rejected
    
    price_vehicle NUMERIC NOT NULL, -- Original price
    price_final NUMERIC NOT NULL, -- Negotiated price
    
    payment_method TEXT, -- financing, cash, trade_in
    entry_value NUMERIC DEFAULT 0,
    installments INTEGER DEFAULT 0,
    installment_value NUMERIC DEFAULT 0,
    
    trade_in_vehicle TEXT,
    trade_in_value NUMERIC DEFAULT 0,
    
    notes TEXT,
    valid_until DATE,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. RLS FOR PROPOSALS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view proposals from their tenant" ON public.proposals;
CREATE POLICY "Users can view proposals from their tenant" ON public.proposals
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can insert proposals for their tenant" ON public.proposals
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can update proposals from their tenant" ON public.proposals
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete proposals from their tenant" ON public.proposals
    FOR DELETE USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
