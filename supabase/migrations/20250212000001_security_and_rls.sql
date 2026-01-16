/*
  # Security & RLS Policies
  
  ## Description
  Enables Row Level Security (RLS) on all public tables and sets up strict access policies.
  Implements the "Tenant Isolation" pattern where users can only access data belonging to their tenant.
  
  ## Metadata
  - Schema-Category: "Security"
  - Impact-Level: "High"
  - Requires-Backup: false
  
  ## Security Implications
  - All tables will deny access by default unless a policy grants it.
  - Policies rely on `public.users` table to map `auth.uid()` to a `tenant_id`.
*/

-- 1. Enable RLS on all tables
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- 2. Create Helper Function to get current user's tenant
-- This avoids repeating the subquery in every policy and improves readability
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER -- Runs with privileges of the creator (admin) to read public.users safely
STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Policies for 'tenants'
-- Users can view their own tenant
CREATE POLICY "Users can view own tenant" ON public.tenants
  FOR SELECT
  USING (id = public.get_auth_tenant_id());

-- Users can update their own tenant
CREATE POLICY "Users can update own tenant" ON public.tenants
  FOR UPDATE
  USING (id = public.get_auth_tenant_id());

-- 4. Policies for 'users'
-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT
  USING (id = auth.uid());

-- Users can update their own profile
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE
  USING (id = auth.uid());

-- 5. Policies for 'vehicles'
CREATE POLICY "Tenant isolation for vehicles" ON public.vehicles
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- 6. Policies for 'vehicle_media'
-- Media inherits access from vehicle, but for simplicity/perf we check tenant directly
CREATE POLICY "Tenant isolation for media" ON public.vehicle_media
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- 7. Policies for 'leads'
CREATE POLICY "Tenant isolation for leads" ON public.leads
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- 8. Policies for Integrations (Jobs, Listings, Logs)
CREATE POLICY "Tenant isolation for jobs" ON public.integration_jobs
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for listings" ON public.portal_listings
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Tenant isolation for logs" ON public.integration_logs
  FOR ALL
  USING (tenant_id = public.get_auth_tenant_id())
  WITH CHECK (tenant_id = public.get_auth_tenant_id());

-- 9. AUTOMATION: Trigger to create Tenant + User on Signup
-- This ensures that when a user signs up via Supabase Auth, they get a fresh SaaS account.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  -- 1. Create a new Tenant for this user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    COALESCE(new.raw_user_meta_data->>'company_slug', lower(regexp_replace(new.email, '[^a-zA-Z0-9]', '', 'g')))
  )
  RETURNING id INTO new_tenant_id;

  -- 2. Create the User profile linked to the Tenant
  INSERT INTO public.users (id, tenant_id, email, name, role)
  VALUES (
    new.id,
    new_tenant_id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Admin User'),
    'owner' -- First user is always owner
  );

  RETURN new;
END;
$$;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
