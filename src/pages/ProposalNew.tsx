import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { supabase } from "../lib/supabase";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { Loader2, Save, Car, User, Calculator } from "lucide-react";

export function ProposalNew() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
        customer_name: '',
        vehicle_id: '',
        price_final: '',
        payment_method: 'financing',
        entry_value: '',
        installments: 48,
        trade_in_vehicle: '',
        trade_in_value: '',
        notes: ''
    }
  });

  const watchVehicleId = watch('vehicle_id');

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    if (watchVehicleId) {
        const v = vehicles.find(v => v.id === watchVehicleId);
        setSelectedVehicle(v);
        if (v) setValue('price_final', v.price);
    }
  }, [watchVehicleId, vehicles]);

  async function loadVehicles() {
    const { data } = await supabase.from('vehicles').select('*').eq('status', 'available');
    if (data) setVehicles(data);
  }

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
        const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
        if (!userData) throw new Error("Tenant not found");

        const { error } = await supabase.from('proposals').insert({
            tenant_id: userData.tenant_id,
            user_id: user?.id,
            vehicle_id: data.vehicle_id,
            customer_name: data.customer_name,
            price_vehicle: selectedVehicle?.price || 0,
            price_final: parseFloat(data.price_final),
            payment_method: data.payment_method,
            entry_value: data.entry_value ? parseFloat(data.entry_value) : 0,
            installments: data.installments,
            trade_in_vehicle: data.trade_in_vehicle,
            trade_in_value: data.trade_in_value ? parseFloat(data.trade_in_value) : 0,
            notes: data.notes,
            status: 'draft',
            valid_until: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days validity
        });

        if (error) throw error;
        navigate('/proposals');
    } catch (err: any) {
        alert("Erro ao criar proposta: " + err.message);
    } finally {
        setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Nova Proposta</h2>
        <p className="text-sm text-slate-500">Crie um orçamento personalizado para seu cliente</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 1. Seleção do Veículo */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Car size={20} className="text-blue-600" />
                Veículo de Interesse
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Selecione do Estoque</label>
                    <select 
                        {...register('vehicle_id', { required: true })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                        <option value="">Selecione...</option>
                        {vehicles.map(v => (
                            <option key={v.id} value={v.id}>{v.brand} {v.model} - {v.version} ({formatCurrency(v.price)})</option>
                        ))}
                    </select>
                </div>
                {selectedVehicle && (
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-sm">
                        <p className="font-bold text-slate-800">{selectedVehicle.brand} {selectedVehicle.model}</p>
                        <p className="text-slate-500">{selectedVehicle.version} • {selectedVehicle.year_model}</p>
                        <p className="text-emerald-600 font-bold mt-1">{formatCurrency(selectedVehicle.price)}</p>
                    </div>
                )}
            </div>
        </div>

        {/* 2. Dados do Cliente */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <User size={20} className="text-blue-600" />
                Dados do Cliente
            </h3>
            <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">Nome Completo</label>
                <input 
                    {...register('customer_name', { required: true })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: João da Silva"
                />
            </div>
        </div>

        {/* 3. Condições Comerciais */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Calculator size={20} className="text-blue-600" />
                Condições de Pagamento
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Preço Final Negociado (R$)</label>
                    <input 
                        type="number"
                        {...register('price_final', { required: true })}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-900"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Forma de Pagamento</label>
                    <select 
                        {...register('payment_method')}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                    >
                        <option value="financing">Financiamento</option>
                        <option value="cash">À Vista</option>
                        <option value="trade_in">Troca + Financiamento</option>
                    </select>
                </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Entrada (R$)</label>
                    <input type="number" {...register('entry_value')} className="w-full px-3 py-2 border rounded-lg" placeholder="0.00" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Veículo na Troca (Modelo/Ano)</label>
                    <input {...register('trade_in_vehicle')} className="w-full px-3 py-2 border rounded-lg" placeholder="Ex: Gol 2015" />
                </div>
                <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-500">Valor da Troca (R$)</label>
                    <input type="number" {...register('trade_in_value')} className="w-full px-3 py-2 border rounded-lg" placeholder="0.00" />
                </div>
            </div>

            <div className="mt-4 space-y-2">
                <label className="text-sm font-medium text-slate-700">Observações Internas</label>
                <textarea 
                    {...register('notes')}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                    placeholder="Detalhes da negociação..."
                />
            </div>
        </div>

        <div className="flex justify-end gap-3">
            <button 
                type="button" 
                onClick={() => navigate('/proposals')}
                className="px-6 py-2.5 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
            >
                Cancelar
            </button>
            <button 
                type="submit" 
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70"
            >
                {submitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                Gerar Proposta
            </button>
        </div>
      </form>
    </div>
  );
}
