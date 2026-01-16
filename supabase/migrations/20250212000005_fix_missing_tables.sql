/*
  # Fix Missing Tables
  Creates features and vehicle_features tables if they don't exist.
*/

-- 1. Create Features Catalog (Ar condicionado, Vidro elétrico, etc)
CREATE TABLE IF NOT EXISTS public.features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create Join Table (Vehicle <-> Features)
CREATE TABLE IF NOT EXISTS public.vehicle_features (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    feature_id UUID NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(vehicle_id, feature_id)
);

-- 3. Enable RLS
ALTER TABLE public.features ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_features ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies (Robust check against users table)
DO $$ 
BEGIN
    -- Features Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'features' AND policyname = 'Tenant Access Features') THEN
        CREATE POLICY "Tenant Access Features" ON public.features
            FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
    END IF;

    -- Vehicle Features Policies
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_features' AND policyname = 'Tenant Access Vehicle Features') THEN
        CREATE POLICY "Tenant Access Vehicle Features" ON public.vehicle_features
            FOR ALL USING (tenant_id IN (SELECT tenant_id FROM public.users WHERE id = auth.uid()));
    END IF;
END $$;
