/*
  # AutoSaaS Schema Migration - Initial V1
  
  ## Estrutura
  - Multi-tenant nativo (tenant_id em tudo)
  - RBAC (Roles)
  - Veículos e Mídias
  - Integrador (Jobs, Logs, Listings)
  
  ## Segurança
  - RLS deve ser habilitado em produção (aqui simplificado para estrutura)
*/

-- ENUMS
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'manager', 'sales', 'finance', 'support');
CREATE TYPE vehicle_status AS ENUM ('draft', 'available', 'reserved', 'sold', 'inactive');
CREATE TYPE fuel_type AS ENUM ('flex', 'gasoline', 'ethanol', 'diesel', 'electric', 'hybrid');
CREATE TYPE transmission_type AS ENUM ('manual', 'automatic', 'cvt', 'automated');
CREATE TYPE listing_status AS ENUM ('draft', 'queued', 'publishing', 'published', 'needs_attention', 'rejected', 'paused', 'deleted', 'error');
CREATE TYPE job_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
CREATE TYPE job_type AS ENUM ('publish', 'update', 'pause', 'delete', 'sync_status');

-- TENANTS (Lojas)
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  cnpj TEXT,
  phone TEXT,
  whatsapp TEXT,
  website TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- USERS (Perfil estendido do Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  role user_role DEFAULT 'sales',
  full_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- VEHICLES (Core)
CREATE TABLE vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  
  -- Dados Básicos
  plate_last_digits TEXT, -- Apenas final para segurança/privacidade inicial
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  version TEXT NOT NULL,
  year_manufacture INTEGER NOT NULL,
  year_model INTEGER NOT NULL,
  fuel fuel_type NOT NULL,
  transmission transmission_type NOT NULL,
  color TEXT,
  km INTEGER NOT NULL DEFAULT 0,
  doors INTEGER DEFAULT 4,
  
  -- Preços
  price DECIMAL(12,2) NOT NULL,
  price_promo DECIMAL(12,2),
  fipe_price DECIMAL(12,2),
  
  -- Descrição
  title TEXT,
  description TEXT,
  
  -- Controle
  status vehicle_status DEFAULT 'draft',
  is_featured BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- VEHICLE MEDIA
CREATE TABLE vehicle_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_cover BOOLEAN DEFAULT FALSE,
  type TEXT DEFAULT 'image', -- image, video
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTEGRATIONS: CONNECTIONS (Credenciais)
CREATE TABLE portal_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  portal_code TEXT NOT NULL, -- 'olx', 'webmotors', 'facebook'
  is_active BOOLEAN DEFAULT TRUE,
  credentials_encrypted JSONB, -- Armazenar tokens criptografados
  settings JSONB, -- Configurações específicas (ex: plano contratado no portal)
  last_health_check TIMESTAMPTZ,
  health_status TEXT DEFAULT 'ok',
  UNIQUE(tenant_id, portal_code)
);

-- INTEGRATIONS: LISTINGS (Estado do anúncio no portal)
CREATE TABLE portal_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id) NOT NULL,
  portal_code TEXT NOT NULL,
  
  external_id TEXT, -- ID no portal (ex: ad_id da OLX)
  external_url TEXT,
  
  status listing_status DEFAULT 'draft',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(vehicle_id, portal_code)
);

-- INTEGRATIONS: JOBS (Fila de processamento)
CREATE TABLE integration_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  
  -- Contexto
  portal_code TEXT NOT NULL,
  vehicle_id UUID REFERENCES vehicles(id),
  job_type job_type NOT NULL,
  
  -- Controle de Execução
  status job_status DEFAULT 'pending',
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_attempt_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Idempotência e Payload
  idempotency_key TEXT, -- hash(tenant+portal+type+vehicle+updated_at)
  payload JSONB,
  
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- INTEGRATIONS: LOGS (Auditoria detalhada)
CREATE TABLE integration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) NOT NULL,
  job_id UUID REFERENCES integration_jobs(id),
  vehicle_id UUID,
  portal_code TEXT,
  
  level TEXT NOT NULL, -- info, warn, error
  message_human TEXT NOT NULL, -- "Foto muito pequena", "Publicado com sucesso"
  details_json JSONB, -- Request/Response técnico
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- INDEXES
CREATE INDEX idx_vehicles_tenant ON vehicles(tenant_id);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_jobs_processing ON integration_jobs(status, next_attempt_at) WHERE status IN ('pending', 'processing');
CREATE INDEX idx_listings_vehicle ON portal_listings(vehicle_id);

-- SEED DATA (Demo)
INSERT INTO tenants (id, name, slug) VALUES 
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'AutoPrime Motors', 'autoprime');

INSERT INTO vehicles (id, tenant_id, brand, model, version, year_manufacture, year_model, fuel, transmission, price, km, status, title) VALUES
('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Toyota', 'Corolla', '2.0 XEi', 2023, 2024, 'flex', 'automatic', 145000.00, 12000, 'available', 'Toyota Corolla XEi 2.0 2024 - Impecável'),
('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380c33', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Honda', 'Civic', '1.5 Touring Turbo', 2021, 2021, 'gasoline', 'automatic', 159900.00, 45000, 'available', 'Honda Civic Touring Turbo - Teto Solar');

INSERT INTO portal_connections (tenant_id, portal_code, is_active) VALUES
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'olx', true),
('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'webmotors', false);
