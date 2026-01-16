/*
  # Public Access & Security Hardening
  
  1. Changes:
    - Add 'slug' to tenants for friendly URLs (optional, using ID for now as fallback)
    - Enable RLS on ALL remaining tables
    - Create "Public Read" policies for the Website (Anon access)
    - Fix function search paths (Security Warning)
*/

-- 1. Ensure Slug exists (for future friendly URLs)
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);

-- 2. Public Access Policies (CRITICAL FOR SITE)
-- Allow anon to read tenant branding info
CREATE POLICY "Public read tenants" ON tenants 
FOR SELECT TO anon 
USING (true); 

-- Allow anon to read AVAILABLE vehicles only
CREATE POLICY "Public read available vehicles" ON vehicles 
FOR SELECT TO anon 
USING (status = 'available');

-- Allow anon to read vehicle media
CREATE POLICY "Public read vehicle media" ON vehicle_media 
FOR SELECT TO anon 
USING (true);

-- Allow anon to read features
CREATE POLICY "Public read features" ON features 
FOR SELECT TO anon 
USING (true);

CREATE POLICY "Public read vehicle features" ON vehicle_features 
FOR SELECT TO anon 
USING (true);

-- 3. Fix Security Warnings (Mutable Search Path)
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path = public -- FIX: Explicit search path
AS $$
BEGIN
  INSERT INTO public.tenants (name, owner_id)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    new.id
  );
  
  INSERT INTO public.users (id, tenant_id, role, email, name)
  VALUES (
    new.id,
    (SELECT id FROM public.tenants WHERE owner_id = new.id LIMIT 1),
    'owner',
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Admin')
  );
  
  RETURN new;
END;
$$;

-- 4. Ensure RLS is enabled everywhere
ALTER TABLE vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE portal_listings ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Vehicle Costs (Admin only)
DROP POLICY IF EXISTS "Users can manage costs of their tenant" ON vehicle_costs;
CREATE POLICY "Users can manage costs of their tenant" ON vehicle_costs
FOR ALL TO authenticated
USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
