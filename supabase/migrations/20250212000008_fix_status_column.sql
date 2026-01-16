-- Script de Auto-Reparo para Colunas Faltantes e Políticas Públicas

DO $$ 
BEGIN
    -- 1. Garantir que o TYPE vehicle_status existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'vehicle_status') THEN
        CREATE TYPE vehicle_status AS ENUM ('draft', 'available', 'reserved', 'sold', 'inactive');
    END IF;

    -- 2. Adicionar status à tabela vehicles se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'vehicles' AND column_name = 'status') THEN
        ALTER TABLE vehicles ADD COLUMN status vehicle_status DEFAULT 'draft';
    END IF;

    -- 3. Garantir que o TYPE lead_status existe
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'lead_status') THEN
        CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost');
    END IF;

    -- 4. Adicionar status à tabela leads se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'leads' AND column_name = 'status') THEN
        ALTER TABLE leads ADD COLUMN status lead_status DEFAULT 'new';
    END IF;

    -- 5. Adicionar status à tabela integration_jobs se não existir
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_jobs' AND column_name = 'status') THEN
        ALTER TABLE integration_jobs ADD COLUMN status text DEFAULT 'pending';
    END IF;
END $$;

-- Recriar Políticas Públicas (Agora seguro pois as colunas existem)

-- 1. Vehicles: Público só vê 'available'
DROP POLICY IF EXISTS "Public read available vehicles" ON vehicles;
CREATE POLICY "Public read available vehicles"
ON vehicles FOR SELECT
TO anon
USING (status = 'available');

-- 2. Media: Público só vê mídia de veículos 'available'
DROP POLICY IF EXISTS "Public read vehicle media" ON vehicle_media;
CREATE POLICY "Public read vehicle media"
ON vehicle_media FOR SELECT
TO anon
USING (
    EXISTS (
        SELECT 1 FROM vehicles 
        WHERE vehicles.id = vehicle_media.vehicle_id 
        AND vehicles.status = 'available'
    )
);

-- 3. Tenants: Público pode ler dados da loja (nome, logo, etc)
DROP POLICY IF EXISTS "Public read tenant info" ON tenants;
CREATE POLICY "Public read tenant info"
ON tenants FOR SELECT
TO anon
USING (true);

-- 4. Grant usage on schema public to anon (Garantia extra)
GRANT USAGE ON SCHEMA public TO anon;
GRANT SELECT ON TABLE tenants TO anon;
GRANT SELECT ON TABLE vehicles TO anon;
GRANT SELECT ON TABLE vehicle_media TO anon;
