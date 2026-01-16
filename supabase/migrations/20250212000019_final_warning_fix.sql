/*
  # Final Security Polish (Warning Fix)
  
  1. Ajusta o search_path das funções críticas para incluir pg_catalog explicitamente.
  2. Isso garante que funções nativas (random, md5) sejam encontradas sem ambiguidade.
*/

-- Forçar search_path seguro na função de trigger de usuário
ALTER FUNCTION public.handle_new_user() SET search_path = public, pg_catalog;

-- Forçar search_path seguro na função de timestamp
ALTER FUNCTION public.update_updated_at_column() SET search_path = public, pg_catalog;

-- Confirmação
DO $$
BEGIN
    RAISE NOTICE 'Configurações de segurança finais aplicadas.';
END $$;
