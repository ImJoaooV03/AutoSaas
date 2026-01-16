/*
  # Fix de Segurança Absoluto (Dynamic Search Path)
  
  Este script varre dinamicamente TODAS as funções existentes no esquema 'public'
  e força a configuração segura do search_path.
  
  Isso resolve o aviso [WARN] Function Search Path Mutable para qualquer função
  que tenha escapado dos scripts anteriores (triggers ocultos, funções utilitárias, etc).
*/

DO $$
DECLARE
    func_record RECORD;
    func_signature TEXT;
BEGIN
    -- Loop por todas as funções do schema public
    FOR func_record IN 
        SELECT 
            n.nspname as schema_name, 
            p.proname as function_name, 
            pg_get_function_identity_arguments(p.oid) as args,
            p.prokind
        FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        -- Filtra apenas funções (f) e procedimentos (p)
        AND p.prokind IN ('f', 'p')
    LOOP
        -- Constrói a assinatura da função (ex: public.minha_funcao(text, int))
        func_signature := format('%I.%I(%s)', func_record.schema_name, func_record.function_name, func_record.args);
        
        -- Aplica a correção dependendo se é Função ou Procedimento
        IF func_record.prokind = 'f' THEN
            EXECUTE format('ALTER FUNCTION %s SET search_path = public, pg_catalog', func_signature);
        ELSIF func_record.prokind = 'p' THEN
            EXECUTE format('ALTER PROCEDURE %s SET search_path = public, pg_catalog', func_signature);
        END IF;
        
        RAISE NOTICE 'Segurança aplicada em: %', func_signature;
    END LOOP;
END $$;
