import { NormalizedVehicle, PortalAdapter } from "../types";

// Simulação de um Adapter Real
export class OLXAdapter implements PortalAdapter {
  code = 'olx' as const;
  name = 'OLX Brasil';

  async validate(vehicle: NormalizedVehicle): Promise<string[]> {
    const errors: string[] = [];
    
    // Regras fictícias da OLX
    if (vehicle.description.length < 50) {
      errors.push("OLX exige descrição com no mínimo 50 caracteres.");
    }
    if (!vehicle.price || vehicle.price < 1000) {
      errors.push("Preço inválido para OLX.");
    }
    if (vehicle.media.length < 2) {
      errors.push("OLX recomenda no mínimo 2 fotos.");
    }

    return errors;
  }

  async publish(vehicle: NormalizedVehicle): Promise<{ externalId: string; externalUrl: string }> {
    console.log(`[OLX API] Publishing vehicle ${vehicle.id}...`);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1500));

    // NOTA: Removemos a simulação de erro aleatório para garantir estabilidade na demo final
    // if (Math.random() > 0.8) throw new Error("OLX API Gateway Timeout");

    return {
      externalId: `olx-${Math.floor(Math.random() * 100000)}`,
      externalUrl: `https://olx.com.br/autos/${vehicle.id}`
    };
  }

  async update(externalId: string, vehicle: NormalizedVehicle): Promise<void> {
    console.log(`[OLX API] Updating listing ${externalId}...`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  async pause(externalId: string): Promise<void> {
    console.log(`[OLX API] Pausing listing ${externalId}...`);
  }

  async remove(externalId: string): Promise<void> {
    console.log(`[OLX API] Removing listing ${externalId}...`);
  }

  async syncStatus(externalId: string): Promise<{ status: string; isActive: boolean }> {
    return { status: 'active', isActive: true };
  }
}
