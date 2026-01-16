import { createClient } from '@supabase/supabase-js';

// Fallback para evitar erro em tempo de build se as envs não existirem
// Usando credenciais reais do projeto conectado para garantir funcionamento imediato
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://iuycokuuirwqclejsduq.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1eWNva3V1aXJ3cWNsZWpzZHVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1ODc5NzksImV4cCI6MjA4NDE2Mzk3OX0.oFwpu3vTHjMuirCGsCpQ230W9GdqV-BvwMCVlX_vZWc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type DbResult<T> = T extends PromiseLike<infer U> ? U : never;
