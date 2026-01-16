-- SCRIPT DE CORREÇÃO TOTAL (FINAL FIX)
-- Este script recria os tipos e tabelas na ordem correta para evitar erros de dependência.

-- 1. Limpeza segura (Drop types se existirem para recriar)
DROP TYPE IF EXISTS public.user_role CASCADE;
DROP TYPE IF EXISTS public.vehicle_status CASCADE;
DROP TYPE IF EXISTS public.lead_status CASCADE;
DROP TYPE IF EXISTS public.job_status CASCADE;
DROP TYPE IF EXISTS public.portal_code CASCADE;

-- 2. Criação de ENUMS (Tipos)
CREATE TYPE public.user_role AS ENUM ('owner', 'admin', 'manager', 'sales', 'finance', 'operator', 'support');
CREATE TYPE public.vehicle_status AS ENUM ('draft', 'available', 'reserved', 'sold', 'hidden');
CREATE TYPE public.lead_status AS ENUM ('new', 'contacted', 'proposal', 'negotiation', 'won', 'lost');
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE public.portal_code AS ENUM ('olx', 'webmotors', 'facebook');

-- 3. Tabelas Base (Sem dependências externas além de Tenant)

-- Tenants (Revendas)
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE,
    document TEXT, -- CNPJ
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Users (Usuários do Sistema)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    email TEXT,
    full_name TEXT,
    role user_role DEFAULT 'sales',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Vehicles (Estoque)
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    
    -- Dados Básicos
    brand TEXT NOT NULL,
    model TEXT NOT NULL,
    version TEXT,
    year_manufacture INTEGER,
    year_model INTEGER,
    km INTEGER DEFAULT 0,
    price DECIMAL(12,2),
    
    -- Detalhes
    fuel TEXT, -- flex, gasoline, etc
    transmission TEXT, -- manual, auto
    color TEXT,
    plate_end INTEGER,
    
    -- Marketing
    title TEXT,
    description TEXT,
    
    status vehicle_status DEFAULT 'draft',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Vehicle Media (Fotos)
CREATE TABLE IF NOT EXISTS public.vehicle_media (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    position INTEGER DEFAULT 0,
    is_cover BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Leads (CRM) - AQUI ESTAVA O ERRO ANTES
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    assigned_to UUID REFERENCES public.users(id) ON DELETE SET NULL,
    
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    message TEXT,
    origin TEXT DEFAULT 'organic', -- site, olx, webmotors, manual
    
    status lead_status DEFAULT 'new',
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Integrações: Jobs
CREATE TABLE IF NOT EXISTS public.integration_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    
    portal_code TEXT NOT NULL, -- olx, webmotors (usando text para flexibilidade ou enum)
    job_type TEXT NOT NULL, -- publish, update, pause
    
    status job_status DEFAULT 'pending',
    
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    next_attempt_at TIMESTAMPTZ DEFAULT now(),
    
    error_message TEXT,
    idempotency_key TEXT,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Integrações: Listings (Anúncios publicados)
CREATE TABLE IF NOT EXISTS public.portal_listings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES public.vehicles(id) ON DELETE CASCADE,
    
    portal_code TEXT NOT NULL,
    external_id TEXT,
    external_url TEXT,
    
    status TEXT DEFAULT 'active',
    last_sync_at TIMESTAMPTZ,
    
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(vehicle_id, portal_code)
);

-- Integrações: Logs
CREATE TABLE IF NOT EXISTS public.integration_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.integration_jobs(id) ON DELETE SET NULL,
    vehicle_id UUID,
    portal_code TEXT,
    
    level TEXT, -- info, error, warning
    message_human TEXT,
    payload JSONB,
    
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Habilitar RLS em TUDO
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_logs ENABLE ROW LEVEL SECURITY;

-- 5. Políticas de Segurança (RLS)
-- A regra de ouro: Usuário só vê dados onde tenant_id bate com o seu tenant_id na tabela users.

-- Helper function para pegar tenant_id do usuário logado
CREATE OR REPLACE FUNCTION get_auth_tenant_id()
RETURNS UUID AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Policy Genérica para Tenants (Users can read their own tenant)
DROP POLICY IF EXISTS "Users can view own tenant" ON public.tenants;
CREATE POLICY "Users can view own tenant" ON public.tenants
    FOR SELECT USING (id = get_auth_tenant_id());

-- Policy Genérica para TODAS as outras tabelas
-- (Aplicando loop ou manualmente para clareza)

-- Users
DROP POLICY IF EXISTS "Users view same tenant members" ON public.users;
CREATE POLICY "Users view same tenant members" ON public.users
    FOR ALL USING (tenant_id = get_auth_tenant_id());

-- Vehicles
DROP POLICY IF EXISTS "Tenant isolation for vehicles" ON public.vehicles;
CREATE POLICY "Tenant isolation for vehicles" ON public.vehicles
    FOR ALL USING (tenant_id = get_auth_tenant_id());

-- Leads
DROP POLICY IF EXISTS "Tenant isolation for leads" ON public.leads;
CREATE POLICY "Tenant isolation for leads" ON public.leads
    FOR ALL USING (tenant_id = get_auth_tenant_id());

-- Jobs
DROP POLICY IF EXISTS "Tenant isolation for jobs" ON public.integration_jobs;
CREATE POLICY "Tenant isolation for jobs" ON public.integration_jobs
    FOR ALL USING (tenant_id = get_auth_tenant_id());

-- 6. Trigger de Auto-Onboarding (Cria Tenant ao criar User no Auth)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_tenant_id UUID;
  company_name TEXT;
BEGIN
  -- 1. Pega nome da empresa do metadata ou usa default
  company_name := new.raw_user_meta_data->>'company_name';
  IF company_name IS NULL THEN company_name := 'Minha Revenda'; END IF;

  -- 2. Cria Tenant
  INSERT INTO public.tenants (name) VALUES (company_name)
  RETURNING id INTO new_tenant_id;

  -- 3. Cria User Profile linkado
  INSERT INTO public.users (id, tenant_id, email, full_name, role)
  VALUES (new.id, new_tenant_id, new.email, new.raw_user_meta_data->>'full_name', 'owner');

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recria o trigger no auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
