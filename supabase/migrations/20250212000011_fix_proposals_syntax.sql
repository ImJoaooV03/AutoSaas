-- 1. Drop table to ensure clean state (since previous migration failed)
DROP TABLE IF EXISTS public.proposals;

-- 2. Create proposals table
CREATE TABLE public.proposals (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tenant_id UUID REFERENCES public.tenants(id) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    vehicle_id UUID REFERENCES public.vehicles(id),
    customer_name TEXT NOT NULL,
    price_vehicle NUMERIC,
    price_final NUMERIC NOT NULL,
    payment_method TEXT,
    entry_value NUMERIC DEFAULT 0,
    installments INTEGER,
    trade_in_vehicle TEXT,
    trade_in_value NUMERIC DEFAULT 0,
    notes TEXT,
    status TEXT DEFAULT 'draft', -- draft, sent, accepted, rejected
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Fixed Syntax)

-- Policy for SELECT
CREATE POLICY "Users can view proposals from their tenant"
ON public.proposals
FOR SELECT
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Policy for INSERT
CREATE POLICY "Users can insert proposals for their tenant"
ON public.proposals
FOR INSERT
TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Policy for UPDATE
CREATE POLICY "Users can update proposals from their tenant"
ON public.proposals
FOR UPDATE
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Policy for DELETE
CREATE POLICY "Users can delete proposals from their tenant"
ON public.proposals
FOR DELETE
TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- 5. Fix Function Search Path (Security Advisory Fix)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a new Tenant for this user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'company_name', 'loja-' || substr(md5(random()::text), 1, 6)), '\s+', '-', 'g'))
  )
  RETURNING id INTO new_tenant_id;

  -- Create the User Profile linked to the Tenant
  INSERT INTO public.users (id, email, role, tenant_id, full_name)
  VALUES (
    new.id,
    new.email,
    'owner',
    new_tenant_id,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Admin')
  );

  RETURN new;
END;
$$;
