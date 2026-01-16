/*
  # FIX INFINITE RECURSION - FINAL SOLUTION
  
  1. Dropa políticas problemáticas que causam loops.
  2. Cria função segura (SECURITY DEFINER) para ler tenant_id sem disparar RLS.
  3. Reaplica políticas usando a função segura.
*/

-- 1. Função Segura para obter Tenant ID (Bypassing RLS)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
SECURITY DEFINER -- Roda com permissões de admin, ignorando RLS
SET search_path = public
AS $$
DECLARE
  tid UUID;
BEGIN
  SELECT tenant_id INTO tid FROM public.users WHERE id = auth.uid();
  RETURN tid;
END;
$$ LANGUAGE plpgsql;

-- 2. Limpar políticas antigas da tabela USERS (Fonte do loop)
DROP POLICY IF EXISTS "Users can view own user data" ON public.users;
DROP POLICY IF EXISTS "Users can update own user data" ON public.users;
DROP POLICY IF EXISTS "Users can view users in same tenant" ON public.users;
DROP POLICY IF EXISTS "Admin can manage users" ON public.users;

-- 3. Criar Novas Políticas na tabela USERS (Sem subqueries diretas)
CREATE POLICY "Users can view own profile"
ON public.users FOR SELECT
USING (
  id = auth.uid() -- Regra simples: Eu posso ver meu próprio ID
  OR 
  tenant_id = public.get_auth_tenant_id() -- Ou usuários do meu tenant (via função segura)
);

CREATE POLICY "Users can update own profile"
ON public.users FOR UPDATE
USING (id = auth.uid());

-- 4. Garantir que LEADS use a função segura também
DROP POLICY IF EXISTS "Users can view leads" ON public.leads;
DROP POLICY IF EXISTS "Users can manage leads" ON public.leads;

CREATE POLICY "Users can view leads"
ON public.leads FOR SELECT
USING (tenant_id = public.get_auth_tenant_id());

CREATE POLICY "Users can manage leads"
ON public.leads FOR ALL
USING (tenant_id = public.get_auth_tenant_id());

-- 5. Garantir que VEHICLES use a função segura
DROP POLICY IF EXISTS "Users can view vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "Users can manage vehicles" ON public.vehicles;

CREATE POLICY "Users can view vehicles"
ON public.vehicles FOR SELECT
USING (
  tenant_id = public.get_auth_tenant_id() 
  OR 
  status = 'available' -- Permitir site público ver disponíveis
);

CREATE POLICY "Users can manage vehicles"
ON public.vehicles FOR ALL
USING (tenant_id = public.get_auth_tenant_id());

-- Confirmação
DO $$
BEGIN
    RAISE NOTICE 'Recursão corrigida. Função get_auth_tenant_id aplicada.';
END $$;
