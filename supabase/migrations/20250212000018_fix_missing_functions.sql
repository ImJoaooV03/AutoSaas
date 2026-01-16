/*
  # Fix Missing Functions & Security Hardening
  
  1. Recria a função update_updated_at_column (que estava faltando).
  2. Recria a função handle_new_user (garantindo que ela exista).
  3. Aplica o search_path = public em ambas para resolver o aviso de segurança.
*/

-- 1. Recriar função de timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Aplicar trava de segurança (search_path)
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;

-- 3. Garantir que a função de novos usuários também esteja correta e segura
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public -- Trava de segurança crítica
AS $$
DECLARE
  new_tenant_id UUID;
BEGIN
  -- Create a new tenant for the user
  INSERT INTO public.tenants (name, slug)
  VALUES (
    COALESCE(new.raw_user_meta_data->>'company_name', 'Minha Revenda'),
    lower(regexp_replace(COALESCE(new.raw_user_meta_data->>'company_name', 'revenda-' || substr(md5(random()::text), 1, 6)), '[^a-zA-Z0-9]', '-', 'g'))
  )
  RETURNING id INTO new_tenant_id;

  -- Create the user profile linked to the tenant
  INSERT INTO public.users (id, email, tenant_id, role, full_name)
  VALUES (
    new.id,
    new.email,
    new_tenant_id,
    'owner',
    COALESCE(new.raw_user_meta_data->>'full_name', 'Admin')
  );

  RETURN new;
END;
$$ language 'plpgsql';
