import { NormalizedVehicle, PortalAdapter } from "../types";

// Simulação de um Adapter Real
export class OLXAdapter implements PortalAdapter {
  code = 'olx' as const;
  name = 'OLX Brasil';

  async validate(vehicle: NormalizedVehicle): Promise<string[]> {
    const errors: string[] = [];
    
    // Regras fictícias da OLX (Ajustadas para ser compatível com o Wizard)
    if (vehicle.description.length < 20) {
      errors.push("OLX exige descrição com no mínimo 20 caracteres.");
    }
    if (!vehicle.price || vehicle.price < 1000) {
      errors.push("Preço inválido para OLX.");
    }
    if (vehicle.media.length < 1) {
      errors.push("OLX exige pelo menos 1 foto.");
    }

    return errors;
  }

  async publish(vehicle: NormalizedVehicle): Promise<{ externalId: string; externalUrl: string }> {
    console.log(`[OLX API] Publishing vehicle ${vehicle.id}...`);
    
    // Simular delay de rede
    await new Promise(resolve => setTimeout(resolve, 1500));

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
