import { z } from 'zod';

// --- Domain Models ---

export const NormalizedVehicleSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  brand: z.string(),
  model: z.string(),
  version: z.string(),
  yearModel: z.number(),
  yearManufacture: z.number(),
  price: z.number(),
  km: z.number(),
  fuel: z.enum(['flex', 'gasoline', 'ethanol', 'diesel', 'electric', 'hybrid']),
  transmission: z.enum(['manual', 'automatic', 'cvt', 'automated']),
  color: z.string().optional(),
  title: z.string().min(10),
  description: z.string().min(20),
  media: z.array(z.object({
    url: z.string().url(),
    isCover: z.boolean()
  })).min(1, "Pelo menos uma foto é obrigatória"),
  features: z.array(z.string()).optional(),
});

export type NormalizedVehicle = z.infer<typeof NormalizedVehicleSchema>;

export type PortalCode = 'olx' | 'webmotors' | 'facebook';
export type JobType = 'publish' | 'update' | 'pause' | 'delete' | 'sync_status';
export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface IntegrationJob {
  id: string;
  portalCode: PortalCode;
  jobType: JobType;
  vehicleId: string;
  status: JobStatus;
  attempts: number;
  message?: string;
}

// --- Adapter Interface ---

export interface PortalAdapter {
  code: PortalCode;
  name: string;
  
  validate(vehicle: NormalizedVehicle): Promise<string[]>; // Retorna lista de erros
  publish(vehicle: NormalizedVehicle): Promise<{ externalId: string; externalUrl: string }>;
  update(externalId: string, vehicle: NormalizedVehicle): Promise<void>;
  pause(externalId: string): Promise<void>;
  remove(externalId: string): Promise<void>;
  syncStatus(externalId: string): Promise<{ status: string; isActive: boolean }>;
}
