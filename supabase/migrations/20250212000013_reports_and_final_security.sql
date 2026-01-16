/*
  # SECURITY FIXES & BI REPORTS
  
  1. Security: Explicitly enable RLS on ALL tables (No dynamic SQL, just hardcoded safety).
  2. Security: Fix function search_path.
  3. BI: Create views for reporting.
*/

-- 1. FIX FUNCTION SEARCH PATH (Critical for Security Advisory)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public -- FIX: Explicitly set search path
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, role, tenant_id)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', 'Usuário'),
    'owner',
    uuid_generate_v4() -- Temporary tenant ID, will be updated below
  );

  -- Create Tenant
  WITH new_tenant AS (
    INSERT INTO public.tenants (name, slug, owner_id)
    VALUES (
      COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
      lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'company_name', 'loja-' || substr(md5(random()::text), 1, 6)), '\s+', '-', 'g')),
      new.id
    )
    RETURNING id
  )
  UPDATE public.users 
  SET tenant_id = (SELECT id FROM new_tenant) 
  WHERE id = new.id;

  RETURN new;
END;
$$;

-- 2. EXPLICIT RLS ENFORCEMENT (List every single table)
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_costs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proposals ENABLE ROW LEVEL SECURITY;

-- 3. BI VIEW: Monthly Sales & Margins
-- Drop if exists to avoid conflicts
DROP VIEW IF EXISTS public.analytics_monthly_sales;

CREATE VIEW public.analytics_monthly_sales AS
SELECT 
  v.tenant_id,
  to_char(v.updated_at, 'YYYY-MM') as month_year,
  COUNT(v.id) as total_sales,
  SUM(v.price) as total_revenue,
  SUM(COALESCE((SELECT SUM(amount) FROM vehicle_costs vc WHERE vc.vehicle_id = v.id), 0)) as total_costs
FROM 
  vehicles v
WHERE 
  v.status = 'sold'
GROUP BY 
  v.tenant_id, to_char(v.updated_at, 'YYYY-MM');

-- Grant access to the view
GRANT SELECT ON public.analytics_monthly_sales TO authenticated;
GRANT SELECT ON public.analytics_monthly_sales TO service_role;
