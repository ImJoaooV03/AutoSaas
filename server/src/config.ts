import dotenv from 'dotenv';
dotenv.config();

export const CONFIG = {
  PORT: process.env.PORT || 3001,
  APP_URL: process.env.APP_URL || 'http://localhost:5173', // URL do Frontend
  API_URL: process.env.API_URL || 'http://localhost:3001', // URL deste Backend
  
  // Supabase (Service Role é necessário para escrever sem sessão de usuário no callback)
  SUPABASE_URL: process.env.SUPABASE_URL || '',
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  // Security
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'uma-chave-secreta-de-32-caracteres!!', // Deve ter 32 chars
  
  // OLX Credentials
  OLX_CLIENT_ID: process.env.OLX_CLIENT_ID || '',
  OLX_CLIENT_SECRET: process.env.OLX_CLIENT_SECRET || '',
  OLX_AUTH_URL: 'https://auth.olx.com.br/oauth', // URL base de auth (prod)
  // OLX_AUTH_URL: 'https://auth-sandbox.olx.com.br/oauth', // Se fosse sandbox
};

if (CONFIG.ENCRYPTION_KEY.length !== 32) {
  console.warn("⚠️ AVISO: ENCRYPTION_KEY deve ter 32 caracteres para AES-256. Usando fallback inseguro se não corrigido.");
}
