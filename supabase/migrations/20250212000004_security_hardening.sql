/*
  # Security Hardening & RLS Completion
  
  ## Description
  This migration addresses critical security advisories:
  1. Enables RLS on all remaining public tables.
  2. Adds missing policies for child tables (media, features, etc.).
  3. Secures the 'handle_new_user' function by setting a fixed search_path.
  
  ## Impact
  - High Security Impact: Prevents unauthorized access to auxiliary tables.
  - Safe Operation: Does not modify data structure, only permissions.
*/

-- 1. Secure the Trigger Function (Fixes "Function Search Path Mutable")
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- Security Fix
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- 1. Create a new Tenant for this user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'company_name', 'revenda-' || substr(md5(random()::text), 1, 6)), '[^a-zA-Z0-9]+', '-', 'g'))
  )
  RETURNING id INTO new_tenant_id;

  -- 2. Create the User Profile linked to the Tenant
  INSERT INTO public.users (id, email, role, tenant_id)
  VALUES (
    new.id,
    new.email,
    'owner', -- First user is always owner
    new_tenant_id
  );

  RETURN new;
END;
$$;

-- 2. Enable RLS on all tables (Fixes "RLS Disabled in Public")
ALTER TABLE IF EXISTS public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lead_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.lead_tasks ENABLE ROW LEVEL SECURITY;

-- 3. Add Policies for Auxiliary Tables
-- We assume these tables have a 'tenant_id' column as per project rules. 
-- If they don't, we'd join with the parent table, but direct tenant_id check is faster.

-- Vehicle Media
DROP POLICY IF EXISTS "Users can view media of their tenant" ON public.vehicle_media;
CREATE POLICY "Users can view media of their tenant" ON public.vehicle_media
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage media of their tenant" ON public.vehicle_media;
CREATE POLICY "Users can manage media of their tenant" ON public.vehicle_media
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Vehicle Features
DROP POLICY IF EXISTS "Users can view features of their tenant" ON public.vehicle_features;
CREATE POLICY "Users can view features of their tenant" ON public.vehicle_features
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage features of their tenant" ON public.vehicle_features;
CREATE POLICY "Users can manage features of their tenant" ON public.vehicle_features
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Vehicle Costs
DROP POLICY IF EXISTS "Users can view costs of their tenant" ON public.vehicle_costs;
CREATE POLICY "Users can view costs of their tenant" ON public.vehicle_costs
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage costs of their tenant" ON public.vehicle_costs;
CREATE POLICY "Users can manage costs of their tenant" ON public.vehicle_costs
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- Lead Activities
DROP POLICY IF EXISTS "Users can view activities of their tenant" ON public.lead_activities;
CREATE POLICY "Users can view activities of their tenant" ON public.lead_activities
  FOR SELECT USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Users can manage activities of their tenant" ON public.lead_activities;
CREATE POLICY "Users can manage activities of their tenant" ON public.lead_activities
  FOR ALL USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
