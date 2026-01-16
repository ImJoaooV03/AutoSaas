-- ==============================================================================
-- ULTIMATE SECURITY POLISH & VIEW FIX
-- ==============================================================================

-- 1. Corrigir a View para respeitar RLS (Security Invoker)
-- Views normais rodam com permissão do dono. Security Invoker usa a permissão de quem consulta.
DROP VIEW IF EXISTS public.analytics_monthly_sales;

CREATE VIEW public.analytics_monthly_sales 
WITH (security_invoker = true) -- CRUCIAL: Respeita as RLS das tabelas base
AS
SELECT 
    to_char(date_trunc('month', created_at), 'YYYY-MM') as month_year,
    tenant_id,
    COUNT(id) as total_sales,
    SUM(price) as total_revenue,
    (
      SELECT COALESCE(SUM(amount), 0)
      FROM vehicle_costs vc
      WHERE vc.tenant_id = vehicles.tenant_id
      AND to_char(date_trunc('month', vc.date), 'YYYY-MM') = to_char(date_trunc('month', vehicles.created_at), 'YYYY-MM')
    ) as total_costs
FROM vehicles
WHERE status = 'sold'
GROUP BY 1, 2;

-- 2. Blindar Função (Search Path Mutable Warning)
ALTER FUNCTION public.handle_new_user() SET search_path = public;

-- 3. Forçar RLS em TODAS as tabelas (Catch-all para os erros "RLS Disabled")
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP 
        EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' ENABLE ROW LEVEL SECURITY'; 
    END LOOP; 
END $$;

-- 4. Garantir permissões mínimas para Anon (Site Público) e Authenticated
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON public.vehicles TO anon, authenticated;
GRANT SELECT ON public.vehicle_media TO anon, authenticated;
GRANT SELECT ON public.tenants TO anon, authenticated;
GRANT SELECT ON public.features TO anon, authenticated;
GRANT SELECT ON public.vehicle_features TO anon, authenticated;

-- As demais tabelas (leads, proposals, finance) continuam restritas apenas a authenticated via RLS policies já criadas.
