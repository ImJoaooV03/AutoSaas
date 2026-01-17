import { createClient } from '@supabase/supabase-js';
import { CONFIG } from './config';

// Cliente com privilégios de admin (Service Role) para escrever no banco
// durante o callback, onde não temos a sessão do usuário logado no browser.
export const supabaseAdmin = createClient(
  CONFIG.SUPABASE_URL,
  CONFIG.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

export const DbService = {
  async upsertPortalConnection(tenantId: string, portalCode: string, configData: any) {
    const { error } = await supabaseAdmin
      .from('portal_connections')
      .upsert({
        tenant_id: tenantId,
        portal_code: portalCode,
        config_json: configData,
        is_active: true,
        updated_at: new Date().toISOString()
      }, { onConflict: 'tenant_id, portal_code' });

    if (error) throw error;
  },

  async logIntegration(tenantId: string, portalCode: string, level: 'info' | 'error', message: string) {
    await supabaseAdmin
      .from('integration_logs')
      .insert({
        tenant_id: tenantId,
        portal_code: portalCode,
        level,
        message_human: message,
        job_id: 'auth-flow' // ID fictício para logs de auth
      });
  },
  
  async getPortalConnection(tenantId: string, portalCode: string) {
    const { data, error } = await supabaseAdmin
      .from('portal_connections')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('portal_code', portalCode)
      .single();
      
    if (error) return null;
    return data;
  }
};
