/*
  # Ultimate Security Fix & SaaS Admin Setup
  
  1. Security:
     - Fix Function Search Path (Advisory)
     - Enable RLS on ALL tables explicitly
     - Ensure policies exist for critical tables
  
  2. SaaS Admin:
     - Add 'is_superadmin' to users table
     - Add Policy for Superadmins to view all tenants
*/

-- 1. Fix Function Search Path (Security Advisory)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- FIX: Explicit search path
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  -- 1. Create a Tenant for this user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'company_name', 'loja-' || substr(new.id::text, 1, 8)), '\s+', '-', 'g'))
  )
  RETURNING id INTO new_tenant_id;

  -- 2. Create the User Profile linked to Tenant
  INSERT INTO public.users (id, email, tenant_id, role, full_name, is_superadmin)
  VALUES (
    new.id,
    new.email,
    new_tenant_id,
    'owner',
    COALESCE(new.raw_user_meta_data->>'full_name', 'Admin'),
    false -- Default is false
  );

  RETURN new;
END;
$$;

-- 2. Add is_superadmin column if not exists
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_superadmin') THEN
        ALTER TABLE public.users ADD COLUMN is_superadmin boolean DEFAULT false;
    END IF;
END $$;

-- 3. Enable RLS on ALL tables (Brute force safety)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- 4. SaaS Admin Policies (Allow Superadmin to see everything in Tenants table)
DROP POLICY IF EXISTS "Superadmins can view all tenants" ON public.tenants;
CREATE POLICY "Superadmins can view all tenants"
ON public.tenants
FOR SELECT
USING (
  (SELECT is_superadmin FROM public.users WHERE id = auth.uid()) = true
);

-- 5. Make the first user a Superadmin (Optional: You can run this manually for specific email)
-- UPDATE public.users SET is_superadmin = true WHERE email = 'seu@email.com';
