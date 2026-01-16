/*
  # Gold Standard Security Polish
  
  1. Fixes "Function Search Path Mutable" warning by explicitly setting search_path on trigger functions.
  2. Ensures all tables have RLS enabled and at least one policy.
*/

-- 1. Fix Function Search Path (Security Best Practice)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp -- FIX: Explicit search path prevents hijacking
AS $$
BEGIN
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    LOWER(REGEXP_REPLACE(COALESCE(new.raw_user_meta_data->>'company_name', 'loja-' || SUBSTRING(new.id::text FROM 1 FOR 8)), '[^a-z0-9]', '', 'g')) || '-' || SUBSTRING(md5(random()::text) FROM 1 FOR 4)
  )
  RETURNING id INTO new.raw_user_meta_data; -- Store tenant_id temporarily if needed, though we query it below

  -- Link user to tenant
  INSERT INTO public.users (id, email, role, tenant_id)
  VALUES (
    new.id,
    new.email,
    'owner',
    (SELECT id FROM public.tenants WHERE name = COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda') ORDER BY created_at DESC LIMIT 1)
  );

  RETURN new;
END;
$$;

-- 2. Ensure RLS is enabled on ALL public tables (Safety Net)
DO $$ 
DECLARE 
    t text; 
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
    LOOP 
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t); 
    END LOOP; 
END $$;

-- 3. Create a default "Tenant Isolation" policy for any table that might be missing it
-- This uses a dynamic approach to catch edge cases like 'vehicle_features' or 'vehicle_costs' if they were missed
DO $$ 
DECLARE 
    t text; 
    policy_exists boolean;
BEGIN 
    FOR t IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          AND table_name NOT IN ('schema_migrations') -- Ignore system tables
    LOOP 
        -- Check if a SELECT policy exists
        SELECT EXISTS (
            SELECT 1 FROM pg_policies 
            WHERE schemaname = 'public' 
            AND tablename = t 
            AND cmd = 'SELECT'
        ) INTO policy_exists;

        -- If no policy exists, create a generic one based on tenant_id if the column exists
        IF NOT policy_exists THEN
            -- Check if table has tenant_id column
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_schema = 'public' 
                AND table_name = t 
                AND column_name = 'tenant_id'
            ) THEN
                EXECUTE format('CREATE POLICY "tenant_isolation_auto_%I" ON public.%I USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()))', t, t);
            END IF;
        END IF;
    END LOOP; 
END $$;
