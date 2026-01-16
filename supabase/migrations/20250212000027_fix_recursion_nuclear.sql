/*
  # NUCLEAR FIX: Infinite Recursion on Users Table
  
  Este script usa uma abordagem dinâmica para remover TODAS as políticas
  da tabela 'users', independente do nome. Isso garante que nenhuma regra
  antiga ou duplicada permaneça ativa causando loops.
*/

DO $$
DECLARE
  pol record;
BEGIN
  -- 1. Remover TODAS as políticas da tabela 'users' iterando pelo catálogo do sistema
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'users' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users', pol.policyname);
  END LOOP;

  -- 2. Remover TODAS as políticas da tabela 'integration_jobs' (para garantir consistência)
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'integration_jobs' AND schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.integration_jobs', pol.policyname);
  END LOOP;
END $$;

-- 3. Recriar (ou garantir) a Função de Bypass (Security Definer)
-- Esta função lê a tabela users com privilégios de sistema, ignorando o RLS
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT tenant_id FROM public.users WHERE id = auth.uid();
$$;

-- 4. Recriar Políticas da Tabela USERS (100% baseadas na função segura)
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (
  auth.uid() = id 
  OR 
  tenant_id = public.get_auth_tenant_id() -- Usa a função bypass, não consulta a tabela diretamente
);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
ON public.users FOR INSERT
WITH CHECK (auth.uid() = id);

-- 5. Recriar Políticas da Tabela INTEGRATION_JOBS
CREATE POLICY "Users can view tenant jobs"
ON public.integration_jobs FOR SELECT
USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can insert tenant jobs"
ON public.integration_jobs FOR INSERT
WITH CHECK (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can update tenant jobs"
ON public.integration_jobs FOR UPDATE
USING (tenant_id = public.get_auth_tenant_id());
