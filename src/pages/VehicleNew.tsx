import { VehicleWizard } from "../modules/vehicles/components/VehicleWizard";

export function VehicleNew() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Novo Veículo</h2>
        <p className="text-sm text-slate-500">Cadastre um veículo para começar a vender</p>
      </div>
      
      <VehicleWizard />
    </div>
  );
}
