import { supabase } from "../../lib/supabase";
import { OLXAdapter } from "./adapters/olx.adapter";
import { IntegrationJob, NormalizedVehicle, PortalAdapter } from "./types";

// Factory de Adapters
const adapters: Record<string, PortalAdapter> = {
  'olx': new OLXAdapter(),
  // 'webmotors': new WebmotorsAdapter(),
};

/**
 * Worker Simulado (Client-side)
 * Na vida real, isso rodaria em um container Node.js separado com BullMQ.
 * Aqui, vamos usar um loop que verifica a tabela 'integration_jobs'.
 */
export class IntegrationWorker {
  private isRunning = false;

  // Getter público para monitoramento
  public get isActive(): boolean {
    return this.isRunning;
  }

  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log("🚀 Integration Worker Started");
    this.processQueue();
  }

  stop() {
    this.isRunning = false;
    console.log("🛑 Integration Worker Stopped");
  }

  private async processQueue() {
    if (!this.isRunning) return;

    try {
      // 1. Fetch next pending job
      // Nota: Em produção, usaríamos 'FOR UPDATE SKIP LOCKED' ou Redis
      const { data: jobs, error } = await supabase
        .from('integration_jobs')
        .select('*')
        .in('status', ['pending', 'processing']) // Pegar processing também se o worker caiu
        .lt('next_attempt_at', new Date().toISOString())
        .order('created_at', { ascending: true })
        .limit(1);

      if (error) throw error;

      if (jobs && jobs.length > 0) {
        const job = jobs[0];
        await this.executeJob(job);
      } else {
        // Nada na fila, esperar um pouco
      }
    } catch (err: any) {
      console.error("Worker Loop Error:", err);

      // CRITICAL FIX: Se detectar erro de recursão ou falha grave de banco, parar o worker
      // para evitar travamento do navegador e spam de rede.
      if (err.code === '42P17' || err.message?.includes('infinite recursion')) {
        console.error("🚨 CRITICAL DB ERROR: Infinite recursion detected. Stopping worker to prevent crash.");
        this.stop();
        return; // Não agendar próximo loop
      }
    }

    // Loop (polling)
    if (this.isRunning) {
        setTimeout(() => this.processQueue(), 3000);
    }
  }

  private async executeJob(job: any) {
    console.log(`⚙️ Processing Job: ${job.job_type} on ${job.portal_code} (ID: ${job.id})`);

    // Marcar como processando
    await supabase.from('integration_jobs').update({ status: 'processing' }).eq('id', job.id);

    try {
      const adapter = adapters[job.portal_code];
      if (!adapter) throw new Error(`Adapter not found for ${job.portal_code}`);

      // Carregar dados do veículo (Normalized)
      // Em um app real, faríamos um join complexo aqui
      const { data: vehicleData } = await supabase.from('vehicles').select('*').eq('id', job.vehicle_id).single();
      
      if (!vehicleData) throw new Error("Vehicle not found");

      // Mocking normalized vehicle structure for demo
      const vehicle: NormalizedVehicle = {
        id: vehicleData.id,
        tenantId: vehicleData.tenant_id,
        brand: vehicleData.brand,
        model: vehicleData.model,
        version: vehicleData.version,
        yearManufacture: vehicleData.year_manufacture,
        yearModel: vehicleData.year_model,
        price: vehicleData.price,
        km: vehicleData.km,
        fuel: vehicleData.fuel,
        transmission: vehicleData.transmission,
        title: vehicleData.title || `${vehicleData.brand} ${vehicleData.model}`,
        description: vehicleData.description || "Descrição padrão...",
        media: [{ url: "https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400", isCover: true }, { url: "https://img-wrapper.vercel.app/image?url=https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400", isCover: false }], // Mock
      };

      // Executar ação baseada no tipo
      let result;
      if (job.job_type === 'publish') {
        // Validação prévia
        const errors = await adapter.validate(vehicle);
        if (errors.length > 0) {
           throw new Error(`Validation Failed: ${errors.join(', ')}`);
        }
        result = await adapter.publish(vehicle);
        
        // Atualizar tabela de listings
        await supabase.from('portal_listings').upsert({
            tenant_id: job.tenant_id,
            vehicle_id: job.vehicle_id,
            portal_code: job.portal_code,
            external_id: result.externalId,
            external_url: result.externalUrl,
            status: 'published',
            last_sync_at: new Date().toISOString()
        }, { onConflict: 'vehicle_id, portal_code' });
      }

      // Sucesso
      await supabase.from('integration_jobs').update({ 
        status: 'completed',
        updated_at: new Date().toISOString()
      }).eq('id', job.id);

      // Log
      await this.log(job, 'info', `Job ${job.job_type} completed successfully.`);

    } catch (err: any) {
      console.error(`❌ Job Failed:`, err);
      
      const isRetryable = !err.message.includes("Validation Failed"); // Simplificação
      const nextAttempt = isRetryable && job.attempts < job.max_attempts;

      await supabase.from('integration_jobs').update({
        status: nextAttempt ? 'pending' : 'failed',
        attempts: job.attempts + 1,
        error_message: err.message,
        next_attempt_at: nextAttempt 
            ? new Date(Date.now() + (job.attempts + 1) * 10000).toISOString() // Backoff simples
            : null
      }).eq('id', job.id);

      await this.log(job, 'error', `Job failed: ${err.message}`);
    }
  }

  private async log(job: any, level: string, message: string) {
    await supabase.from('integration_logs').insert({
        tenant_id: job.tenant_id,
        job_id: job.id,
        vehicle_id: job.vehicle_id,
        portal_code: job.portal_code,
        level,
        message_human: message
    });
  }
}

export const workerInstance = new IntegrationWorker();
