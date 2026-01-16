-- 1. Drop the problematic view if it exists
DROP VIEW IF EXISTS public.analytics_monthly_sales;

-- 2. Re-create the view with CORRECT aggregation logic
-- Strategy: Aggregate costs per vehicle first (Derived Table), then join with vehicles
CREATE OR REPLACE VIEW public.analytics_monthly_sales WITH (security_invoker = true) AS
SELECT
    to_char(date_trunc('month', v.updated_at), 'YYYY-MM') AS month_year,
    v.tenant_id,
    COUNT(v.id) AS total_sales,
    COALESCE(SUM(v.price), 0) AS total_revenue,
    COALESCE(SUM(vc_agg.total_cost), 0) AS total_costs
FROM 
    public.vehicles v
LEFT JOIN (
    -- Subquery to aggregate costs by vehicle first (Avoids grouping errors)
    SELECT 
        vehicle_id, 
        SUM(amount) as total_cost
    FROM 
        public.vehicle_costs
    GROUP BY 
        vehicle_id
) vc_agg ON v.id = vc_agg.vehicle_id
WHERE 
    v.status = 'sold'
GROUP BY 
    1, 2;

-- Grant access to authenticated users
GRANT SELECT ON public.analytics_monthly_sales TO authenticated;

-- 3. Re-apply Security Hardening (Ensure Search Path is set)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_tenant_id uuid;
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'company_name', 'loja-' || substr(md5(random()::text), 1, 6)), '[^a-zA-Z0-9]', '-', 'g'))
  )
  RETURNING id INTO new_tenant_id;

  INSERT INTO public.users (id, email, role, tenant_id, is_superadmin)
  VALUES (
    new.id,
    new.email,
    'owner',
    new_tenant_id,
    false
  );

  RETURN new;
END;
$$;

-- 4. Final Sweep: Ensure RLS is enabled on ALL public tables
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
    END LOOP;
END $$;
