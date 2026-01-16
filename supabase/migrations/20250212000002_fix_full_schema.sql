-- ==============================================================================
-- MASTER SCHEMA FIX - AUTOSAAS
-- Executar este script resolverá a falta de tabelas e aplicará segurança (RLS).
-- ==============================================================================

-- 1. Habilitar extensões necessárias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. ENUMS (Tipos fixos)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'sales', 'finance', 'support');
    CREATE TYPE vehicle_status AS ENUM ('draft', 'available', 'reserved', 'sold', 'hidden');
    CREATE TYPE fuel_type AS ENUM ('flex', 'gasoline', 'ethanol', 'diesel', 'electric', 'hybrid');
    CREATE TYPE transmission_type AS ENUM ('manual', 'automatic', 'cvt', 'automated');
    CREATE TYPE lead_status AS ENUM ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost');
    CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. TABELAS BASE (Ordem de dependência é crítica)

-- Tabela: Tenants (Lojas)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    document VARCHAR(20), -- CNPJ
    plan VARCHAR(50) DEFAULT 'basic',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Users (Vincula auth.users do Supabase com public.tenants)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    role user_role DEFAULT 'sales',
    full_name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Vehicles (Estoque)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    version VARCHAR(100),
    year_manufacture INTEGER NOT NULL,
    year_model INTEGER NOT NULL,
    price DECIMAL(12,2) NOT NULL,
    km INTEGER DEFAULT 0,
    fuel fuel_type DEFAULT 'flex',
    transmission transmission_type DEFAULT 'manual',
    color VARCHAR(50),
    plate_end VARCHAR(1),
    status vehicle_status DEFAULT 'draft',
    title VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Vehicle Media (Fotos)
CREATE TABLE IF NOT EXISTS public.vehicle_media (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Leads (CRM)
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(id),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    message TEXT,
    origin VARCHAR(50) DEFAULT 'site',
    status lead_status DEFAULT 'new',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Integration Jobs (Fila)
CREATE TABLE IF NOT EXISTS public.integration_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    portal_code VARCHAR(50) NOT NULL,
    job_type VARCHAR(50) NOT NULL,
    status job_status DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    error_message TEXT,
    next_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    idempotency_key VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela: Portal Listings (Estado atual nos portais)
CREATE TABLE IF NOT EXISTS public.portal_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    portal_code VARCHAR(50) NOT NULL,
    external_id VARCHAR(255),
    external_url TEXT,
    status VARCHAR(50),
    last_sync_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(vehicle_id, portal_code)
);

-- Tabela: Integration Logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.integration_jobs(id),
    vehicle_id UUID,
    portal_code VARCHAR(50),
    level VARCHAR(20), -- info, error, warn
    message_human TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SEGURANÇA (RLS - Row Level Security)
-- Habilitar RLS em todas as tabelas
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para pegar o tenant_id do usuário logado
CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- POLICIES (Regras de Acesso)

-- Tenants: Usuários podem ver seu próprio tenant
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
CREATE POLICY "Users can view own tenant" ON public.tenants
    FOR SELECT USING (id = get_auth_tenant_id());

-- Users: Usuários podem ver membros do mesmo tenant
DROP POLICY IF EXISTS "Users can view members of same tenant" ON public.users;
CREATE POLICY "Users can view members of same tenant" ON public.users
    FOR SELECT USING (tenant_id = get_auth_tenant_id());

-- Users: Usuário pode editar seu próprio perfil
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Vehicles: Acesso total para membros do tenant
DROP POLICY IF EXISTS "Tenant isolation for vehicles" ON public.vehicles;
CREATE POLICY "Tenant isolation for vehicles" ON public.vehicles
    FOR ALL USING (tenant_id = get_auth_tenant_id());

-- Leads: Acesso total para membros do tenant
DROP POLICY IF EXISTS "Tenant isolation for leads" ON public.leads;
CREATE POLICY "Tenant isolation for leads" ON public.leads
    FOR ALL USING (tenant_id = get_auth_tenant_id());

-- Integration Jobs: Acesso total para membros do tenant
DROP POLICY IF EXISTS "Tenant isolation for jobs" ON public.integration_jobs;
CREATE POLICY "Tenant isolation for jobs" ON public.integration_jobs
    FOR ALL USING (tenant_id = get_auth_tenant_id());

-- 5. AUTOMATION (Triggers)
-- Função para criar Tenant e User automaticamente ao registrar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    new_tenant_id UUID;
    company_name TEXT;
BEGIN
    -- Pegar nome da empresa do metadata ou usar default
    company_name := COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda');

    -- 1. Criar Tenant
    INSERT INTO public.tenants (name, slug)
    VALUES (company_name, lower(regexp_replace(company_name, '\s+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 4))
    RETURNING id INTO new_tenant_id;

    -- 2. Criar User Profile vinculado
    INSERT INTO public.users (id, tenant_id, email, full_name, role)
    VALUES (new.id, new_tenant_id, new.email, new.raw_user_meta_data->>'full_name', 'owner');

    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
