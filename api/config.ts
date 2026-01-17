import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  // Na Vercel, o APP_URL deve ser a URL de produção
  APP_URL: process.env.APP_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:5173',
  // A API_URL na Vercel é a mesma do APP_URL + /api
  API_URL: process.env.API_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}/api` : 'http://localhost:3001',
  
  SUPABASE_URL: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'uma-chave-secreta-de-32-caracteres!!',
  
  OLX_CLIENT_ID: process.env.OLX_CLIENT_ID || '',
  OLX_CLIENT_SECRET: process.env.OLX_CLIENT_SECRET || '',
  OLX_AUTH_URL: 'https://auth.olx.com.br/oauth',
};
