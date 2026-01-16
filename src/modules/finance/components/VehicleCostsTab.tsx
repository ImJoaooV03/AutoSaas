import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { formatCurrency } from "../../../lib/utils";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { format } from "date-fns";

interface Cost {
  id: string;
  description: string;
  amount: number;
  date: string;
  category: string;
}

interface VehicleCostsTabProps {
  vehicleId: string;
  vehiclePrice: number; // Preço de venda para cálculo de margem
}

export function VehicleCostsTab({ vehicleId, vehiclePrice }: VehicleCostsTabProps) {
  const [costs, setCosts] = useState<Cost[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const { user } = useAuth();

  // Form State
  const [newCost, setNewCost] = useState({
    description: '',
    amount: '',
    category: 'maintenance',
    date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    loadCosts();
  }, [vehicleId]);

  async function loadCosts() {
    const { data } = await supabase
      .from('vehicle_costs')
      .select('*')
      .eq('vehicle_id', vehicleId)
      .order('date', { ascending: false });
    
    if (data) setCosts(data);
    setLoading(false);
  }

  async function handleAddCost(e: React.FormEvent) {
    e.preventDefault();
    if (!newCost.description || !newCost.amount) return;

    const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
    if (!userData) return;

    const { error } = await supabase.from('vehicle_costs').insert({
      tenant_id: userData.tenant_id,
      vehicle_id: vehicleId,
      description: newCost.description,
      amount: parseFloat(newCost.amount),
      category: newCost.category,
      date: newCost.date,
      created_by: user?.id
    });

    if (error) {
      alert("Erro ao adicionar custo");
    } else {
      setNewCost({ description: '', amount: '', category: 'maintenance', date: new Date().toISOString().split('T')[0] });
      setIsAdding(false);
      loadCosts();
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja excluir este custo?")) return;
    await supabase.from('vehicle_costs').delete().eq('id', id);
    loadCosts();
  }

  const totalCosts = costs.reduce((acc, curr) => acc + curr.amount, 0);
  const margin = vehiclePrice - totalCosts;
  const marginPercentage = vehiclePrice > 0 ? (margin / vehiclePrice) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Preço de Venda</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{formatCurrency(vehiclePrice)}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Total de Custos</p>
          <p className="text-2xl font-bold text-red-600 mt-1 flex items-center gap-2">
            {formatCurrency(totalCosts)}
            <TrendingDown size={16} />
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <p className="text-xs font-medium text-slate-500 uppercase">Margem Estimada</p>
          <div className="flex items-baseline gap-2 mt-1">
            <p className={`text-2xl font-bold ${margin > 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {formatCurrency(margin)}
            </p>
            <span className={`text-sm font-medium px-2 py-0.5 rounded-full ${margin > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
              {marginPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-slate-800">Lançamentos</h3>
        <button 
          onClick={() => setIsAdding(!isAdding)}
          className="text-sm bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <Plus size={16} />
          Adicionar Custo
        </button>
      </div>

      {/* Add Form */}
      {isAdding && (
        <form onSubmit={handleAddCost} className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-in fade-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Descrição</label>
              <input 
                required
                value={newCost.description}
                onChange={e => setNewCost({...newCost, description: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ex: Troca de óleo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Valor (R$)</label>
              <input 
                required
                type="number"
                step="0.01"
                value={newCost.amount}
                onChange={e => setNewCost({...newCost, amount: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Categoria</label>
              <select 
                value={newCost.category}
                onChange={e => setNewCost({...newCost, category: e.target.value})}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="maintenance">Manutenção</option>
                <option value="marketing">Marketing/Anúncios</option>
                <option value="tax">Impostos/Doc</option>
                <option value="preparation">Preparação/Estética</option>
                <option value="other">Outros</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" onClick={() => setIsAdding(false)} className="px-3 py-1.5 text-sm text-slate-500 hover:text-slate-700">Cancelar</button>
            <button type="submit" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Salvar Lançamento</button>
          </div>
        </form>
      )}

      {/* List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
            <tr>
              <th className="px-6 py-3">Data</th>
              <th className="px-6 py-3">Descrição</th>
              <th className="px-6 py-3">Categoria</th>
              <th className="px-6 py-3 text-right">Valor</th>
              <th className="px-6 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr><td colSpan={5} className="p-6 text-center text-slate-400">Carregando...</td></tr>
            ) : costs.length === 0 ? (
              <tr><td colSpan={5} className="p-8 text-center text-slate-400">Nenhum custo lançado para este veículo.</td></tr>
            ) : (
              costs.map(cost => (
                <tr key={cost.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-3 text-slate-500">
                    {format(new Date(cost.date), 'dd/MM/yyyy')}
                  </td>
                  <td className="px-6 py-3 font-medium text-slate-800">{cost.description}</td>
                  <td className="px-6 py-3">
                    <span className="px-2 py-1 rounded-full text-xs bg-slate-100 text-slate-600 border border-slate-200 capitalize">
                      {cost.category === 'tax' ? 'Documentação' : cost.category === 'maintenance' ? 'Manutenção' : cost.category}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right font-medium text-slate-800">{formatCurrency(cost.amount)}</td>
                  <td className="px-6 py-3 text-right">
                    <button onClick={() => handleDelete(cost.id)} className="text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
