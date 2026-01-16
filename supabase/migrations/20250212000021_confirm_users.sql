/*
  # Dev Helper: Confirmar Usuários Manualmente
  Este script confirma automaticamente todos os usuários que estão com email pendente.
  Útil para ambiente de desenvolvimento onde o envio de email não está configurado.
*/

-- Atualiza a tabela de usuários do Supabase Auth
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email_confirmed_at IS NULL;
