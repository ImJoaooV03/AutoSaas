/*
  # CORREÇÃO CRÍTICA DE RECURSÃO (RLS)
  
  Este script resolve o erro 42P17 (infinite recursion) na tabela 'users'.
  
  Estratégia:
  1. Cria uma função segura (SECURITY DEFINER) para buscar o tenant_id.
     Isso permite ler o dado sem disparar as políticas da tabela users novamente.
  2. Remove todas as políticas antigas da tabela users para evitar conflitos.
  3. Recria as políticas usando a nova função segura.
*/

-- 1. Função Helper Segura (Quebra o ciclo de recursão)
CREATE OR REPLACE FUNCTION public.get_auth_tenant_id()
RETURNS UUID
SECURITY DEFINER -- Roda com permissões de admin (bypassing RLS)
SET search_path = public -- Segurança contra search_path injection
STABLE
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- 2. Limpeza de Políticas Antigas (Reset total na tabela users)
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view members of same tenant" ON public.users;
DROP POLICY IF EXISTS "Owner can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can see their own tenant members" ON public.users;

-- 3. Novas Políticas Seguras (Non-recursive)

-- Leitura: Usuário vê a si mesmo OU outros membros do mesmo tenant (usando a função segura)
CREATE POLICY "Users can view tenant members"
ON public.users
FOR SELECT
USING (
  id = auth.uid() 
  OR 
  tenant_id = public.get_auth_tenant_id()
);

-- Atualização: Usuário atualiza a si mesmo
CREATE POLICY "Users can update own profile"
ON public.users
FOR UPDATE
USING (id = auth.uid());

-- Inserção: Tratada via Trigger (handle_new_user), mas permitimos que o Auth insira
CREATE POLICY "System can insert users"
ON public.users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- 4. Garantir RLS nas outras tabelas principais usando a função segura para performance
-- (Opcional, mas recomendado para consistência)

-- Leads
DROP POLICY IF EXISTS "Users can view leads of own tenant" ON public.leads;
CREATE POLICY "Users can view leads of own tenant"
ON public.leads FOR ALL
USING (tenant_id = public.get_auth_tenant_id());

-- Vehicles
DROP POLICY IF EXISTS "Users can manage vehicles of own tenant" ON public.vehicles;
CREATE POLICY "Users can manage vehicles of own tenant"
ON public.vehicles FOR ALL
USING (tenant_id = public.get_auth_tenant_id());
