/*
  # Fix Duplicate Policy Error & Recursion
  1. Remove explicitamente as políticas conflitantes da tabela 'users'.
  2. Recria a função segura 'get_current_tenant_id' para evitar recursão.
  3. Recria as políticas da tabela 'users' de forma limpa.
*/

-- 1. Limpeza: Remover políticas antigas para evitar erro "already exists"
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can see own tenant users" ON public.users;
DROP POLICY IF EXISTS "Superadmins can see everyone" ON public.users;
DROP POLICY IF EXISTS "Users can see tenant colleagues" ON public.users;

-- 2. Função Segura (Bypass RLS) para buscar Tenant ID
CREATE OR REPLACE FUNCTION public.get_current_tenant_id()
RETURNS UUID
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN (SELECT tenant_id FROM public.users WHERE id = auth.uid());
END;
$$ LANGUAGE plpgsql;

-- 3. Recriar Políticas da tabela Users (Sem Recursão)

-- Permitir que o usuário veja seu próprio perfil
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

-- Permitir que o usuário atualize seu próprio perfil
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Permitir ver colegas do mesmo tenant (Usando a função segura para evitar loop)
CREATE POLICY "Users can see tenant colleagues" ON public.users
  FOR SELECT USING (tenant_id = public.get_current_tenant_id());

-- Superadmin vê tudo (Opcional, mas útil)
CREATE POLICY "Superadmins can see everyone" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() AND is_superadmin = true
    )
  );
