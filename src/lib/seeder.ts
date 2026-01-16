import { supabase } from "./supabase";
import { faker } from '@faker-js/faker/locale/pt_BR';

export async function seedDatabase(userId: string, tenantId: string) {
  console.log("🌱 Starting Seeder...");
  
  try {
    // 1. Create Vehicles
    const vehicles = [];
    for (let i = 0; i < 5; i++) {
      const isSold = Math.random() > 0.7;
      const price = parseFloat(faker.commerce.price({ min: 30000, max: 150000 }));
      
      const { data: vehicle } = await supabase.from('vehicles').insert({
        tenant_id: tenantId,
        brand: faker.vehicle.manufacturer(),
        model: faker.vehicle.model(),
        version: faker.vehicle.type(),
        year_manufacture: 2020 + Math.floor(Math.random() * 4),
        year_model: 2021 + Math.floor(Math.random() * 4),
        fuel: faker.helpers.arrayElement(['flex', 'gasoline', 'diesel']),
        transmission: faker.helpers.arrayElement(['automatic', 'manual']),
        km: faker.number.int({ min: 0, max: 80000 }),
        color: faker.vehicle.color(),
        price: price,
        description: faker.lorem.paragraph(),
        status: isSold ? 'sold' : 'available'
      }).select().single();

      if (vehicle) {
        vehicles.push(vehicle);
        
        // Add Media
        await supabase.from('vehicle_media').insert([
          { 
            tenant_id: tenantId, 
            vehicle_id: vehicle.id, 
            url: `https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/2563eb/white?text=${vehicle.model}`, 
            is_cover: true, 
            position: 1 
          },
          { 
            tenant_id: tenantId, 
            vehicle_id: vehicle.id, 
            url: `https://img-wrapper.vercel.app/image?url=https://placehold.co/600x400/e2e8f0/gray?text=Interior`, 
            is_cover: false, 
            position: 2 
          }
        ]);

        // Add Costs (Finance)
        await supabase.from('vehicle_costs').insert({
            tenant_id: tenantId,
            vehicle_id: vehicle.id,
            description: 'Preparação e Lavagem',
            amount: 250.00,
            category: 'preparation',
            date: new Date().toISOString(),
            created_by: userId
        });
      }
    }

    // 2. Create Leads
    for (let i = 0; i < 10; i++) {
      await supabase.from('leads').insert({
        tenant_id: tenantId,
        vehicle_id: faker.helpers.arrayElement(vehicles)?.id,
        name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number(),
        status: faker.helpers.arrayElement(['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost']),
        origin: faker.helpers.arrayElement(['site', 'olx', 'webmotors', 'instagram']),
        message: "Tenho interesse neste carro, aceita troca?"
      });
    }

    // 3. Create Proposals
    if (vehicles.length > 0) {
        const v = vehicles[0];
        await supabase.from('proposals').insert({
            tenant_id: tenantId,
            user_id: userId,
            vehicle_id: v.id,
            customer_name: faker.person.fullName(),
            price_vehicle: v.price,
            price_final: v.price - 1000,
            payment_method: 'financing',
            installments: 48,
            status: 'sent',
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
        });
    }

    return { success: true };
  } catch (err) {
    console.error("Seeder Error:", err);
    throw err;
  }
}
