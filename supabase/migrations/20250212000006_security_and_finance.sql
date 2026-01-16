-- 1. BLINDAGEM DE SEGURANÇA (Resolver Advisories)

-- Habilitar RLS em tabelas que podem ter ficado sem
ALTER TABLE IF EXISTS public.vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.integration_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para vehicle_features (Ligado ao veículo e tenant)
DROP POLICY IF EXISTS "Tenant Isolation Select" ON public.vehicle_features;
DROP POLICY IF EXISTS "Tenant Isolation Insert" ON public.vehicle_features;
DROP POLICY IF EXISTS "Tenant Isolation Delete" ON public.vehicle_features;

CREATE POLICY "Tenant Isolation Select" ON public.vehicle_features
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v 
            WHERE v.id = vehicle_features.vehicle_id 
            AND v.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Tenant Isolation Insert" ON public.vehicle_features
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.vehicles v 
            WHERE v.id = vehicle_features.vehicle_id 
            AND v.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Tenant Isolation Delete" ON public.vehicle_features
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.vehicles v 
            WHERE v.id = vehicle_features.vehicle_id 
            AND v.tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
        )
    );

-- Políticas para Features (Assumindo que são globais/compartilhadas para leitura)
DROP POLICY IF EXISTS "Public Read Features" ON public.features;
CREATE POLICY "Public Read Features" ON public.features FOR SELECT TO authenticated USING (true);

-- 2. MÓDULO FINANCEIRO (Custos por Veículo)

CREATE TABLE IF NOT EXISTS public.vehicle_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    category TEXT DEFAULT 'general', -- maintenance, marketing, tax, other
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id)
);

-- RLS para Custos
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select Costs" ON public.vehicle_costs
    FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenant Insert Costs" ON public.vehicle_costs
    FOR INSERT WITH CHECK (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenant Update Costs" ON public.vehicle_costs
    FOR UPDATE USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

CREATE POLICY "Tenant Delete Costs" ON public.vehicle_costs
    FOR DELETE USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- 3. CORREÇÃO DE FUNÇÕES (Security Definer Search Path)
-- Isso remove os avisos de "Function Search Path Mutable"
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- 1. Create Tenant
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'company_name', 'revenda-' || substr(md5(random()::text), 1, 6)), '[^a-zA-Z0-9]', '-', 'g'))
  )
  RETURNING id INTO new_tenant_id;

  -- 2. Create Profile linked to Tenant
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
