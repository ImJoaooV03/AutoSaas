import { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { formatCurrency } from "../lib/utils";
import { 
  TrendingUp, TrendingDown, Wallet, Plus, Search, Filter, 
  ArrowUpRight, ArrowDownRight, MoreHorizontal, Edit, Trash2, Calendar
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar 
} from 'recharts';
import { format, startOfMonth, endOfMonth, subMonths, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TransactionModal } from "../modules/finance/components/TransactionModal";
import { FinancialTransaction, TransactionFormValues } from "../modules/finance/types";

export function Finance() { // Changed component name to Finance (was FinanceDashboard)
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TransactionFormValues | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("this_month");

  useEffect(() => {
    if (user) loadFinancialData();
  }, [user]);

  async function loadFinancialData() {
    setLoading(true);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      if (!userData) return;

      // 1. Fetch Manual Transactions
      const { data: manualTx } = await supabase
        .from('transactions')
        .select('*')
        .eq('tenant_id', userData.tenant_id);

      // 2. Fetch Vehicle Sales (Revenue)
      const { data: soldVehicles } = await supabase
        .from('vehicles')
        .select('id, brand, model, price, updated_at')
        .eq('tenant_id', userData.tenant_id)
        .eq('status', 'sold');

      // 3. Fetch Vehicle Costs (Expenses)
      const { data: vehicleCosts } = await supabase
        .from('vehicle_costs')
        .select('id, description, amount, date, category, vehicle_id')
        .eq('tenant_id', userData.tenant_id);

      // Merge Data
      const merged: FinancialTransaction[] = [];

      // Add Manual
      if (manualTx) {
        manualTx.forEach(t => merged.push({ ...t, source: 'manual' }));
      }

      // Add Sales
      if (soldVehicles) {
        soldVehicles.forEach(v => merged.push({
          id: v.id,
          description: `Venda: ${v.brand} ${v.model}`,
          amount: v.price,
          type: 'income',
          category: 'venda_veiculo',
          date: v.updated_at.split('T')[0],
          status: 'paid',
          source: 'vehicle_sale',
          reference_id: v.id
        }));
      }

      // Add Vehicle Costs
      if (vehicleCosts) {
        vehicleCosts.forEach(c => merged.push({
          id: c.id,
          description: c.description,
          amount: c.amount,
          type: 'expense',
          category: c.category,
          date: c.date,
          status: 'paid',
          source: 'vehicle_cost',
          reference_id: c.vehicle_id
        }));
      }

      // Sort by date desc
      merged.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      setTransactions(merged);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleSaveTransaction = async (data: TransactionFormValues) => {
    setIsSubmitting(true);
    try {
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      
      const payload = {
        tenant_id: userData?.tenant_id,
        description: data.description,
        amount: data.amount,
        type: data.type,
        category: data.category,
        date: data.date,
        status: data.status
      };

      if (editingTransaction?.id) {
        await supabase.from('transactions').update(payload).eq('id', editingTransaction.id);
      } else {
        await supabase.from('transactions').insert(payload);
      }

      await loadFinancialData();
      setIsModalOpen(false);
      setEditingTransaction(null);
    } catch (err) {
      alert("Erro ao salvar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string, source: string) => {
    if (source !== 'manual') {
      alert("Apenas transações manuais podem ser excluídas aqui. Para veículos, edite o veículo.");
      return;
    }
    if (!confirm("Tem certeza?")) return;

    await supabase.from('transactions').delete().eq('id', id);
    loadFinancialData();
  };

  // --- Derived State (Metrics) ---

  const filteredTransactions = useMemo(() => {
    let data = transactions;

    // Date Filter
    const now = new Date();
    if (dateFilter === 'this_month') {
      data = data.filter(t => isSameMonth(parseISO(t.date), now));
    } else if (dateFilter === 'last_month') {
      const lastMonth = subMonths(now, 1);
      data = data.filter(t => isSameMonth(parseISO(t.date), lastMonth));
    }

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      data = data.filter(t => 
        t.description.toLowerCase().includes(lower) || 
        t.category.toLowerCase().includes(lower)
      );
    }

    return data;
  }, [transactions, searchTerm, dateFilter]);

  const metrics = useMemo(() => {
    const income = filteredTransactions.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = filteredTransactions.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0);
    return { income, expense, balance: income - expense };
  }, [filteredTransactions]);

  // Chart Data (Last 6 months)
  const chartData = useMemo(() => {
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = subMonths(new Date(), i);
      const monthKey = format(d, 'yyyy-MM');
      const label = format(d, 'MMM', { locale: ptBR });
      
      const monthTx = transactions.filter(t => t.date.startsWith(monthKey));
      const inc = monthTx.filter(t => t.type === 'income').reduce((acc, c) => acc + c.amount, 0);
      const exp = monthTx.filter(t => t.type === 'expense').reduce((acc, c) => acc + c.amount, 0);
      
      months.push({ name: label, Receitas: inc, Despesas: exp });
    }
    return months;
  }, [transactions]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão Financeira</h2>
          <p className="text-sm text-slate-500">Fluxo de caixa unificado (Veículos + Operacional)</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={dateFilter} 
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todo o Período</option>
            <option value="this_month">Este Mês</option>
            <option value="last_month">Mês Passado</option>
          </select>
          <button 
            onClick={() => { setEditingTransaction(null); setIsModalOpen(true); }}
            className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors shadow-lg shadow-slate-200"
          >
            <Plus size={18} />
            Nova Transação
          </button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wallet size={64} className="text-blue-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Saldo Atual</p>
          <h3 className={`text-3xl font-bold mt-2 ${metrics.balance >= 0 ? 'text-slate-900' : 'text-red-600'}`}>
            {formatCurrency(metrics.balance)}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-slate-400">
            <span className="bg-slate-100 px-2 py-1 rounded-full">Fluxo Líquido</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp size={64} className="text-emerald-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Receitas</p>
          <h3 className="text-3xl font-bold mt-2 text-emerald-600">
            {formatCurrency(metrics.income)}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-emerald-600 bg-emerald-50 w-fit px-2 py-1 rounded-full">
            <ArrowUpRight size={14} /> Entradas
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group">
          <div className="absolute right-0 top-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingDown size={64} className="text-red-600" />
          </div>
          <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Despesas</p>
          <h3 className="text-3xl font-bold mt-2 text-red-600">
            {formatCurrency(metrics.expense)}
          </h3>
          <div className="mt-4 flex items-center gap-2 text-xs font-medium text-red-600 bg-red-50 w-fit px-2 py-1 rounded-full">
            <ArrowDownRight size={14} /> Saídas
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="font-bold text-slate-800 mb-6">Fluxo de Caixa (6 Meses)</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `R$ ${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Area type="monotone" dataKey="Receitas" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                <Area type="monotone" dataKey="Despesas" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorExpense)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
           <h3 className="font-bold text-slate-800 mb-6">Balanço do Período</h3>
           <div className="h-[300px] flex flex-col justify-center items-center">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={[{ name: 'Atual', Receitas: metrics.income, Despesas: metrics.expense }]}>
                   <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                   <XAxis dataKey="name" hide />
                   <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => formatCurrency(value)} />
                   <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} barSize={60} />
                   <Bar dataKey="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={60} />
                </BarChart>
              </ResponsiveContainer>
              <div className="flex gap-6 mt-4">
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" /> Receitas
                 </div>
                 <div className="flex items-center gap-2 text-sm text-slate-600">
                    <div className="w-3 h-3 rounded-full bg-red-500" /> Despesas
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-bold text-slate-800">Histórico de Transações</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text" 
              placeholder="Buscar transação..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full md:w-64"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Descrição</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Data</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Valor</th>
                <th className="px-6 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-400">Carregando financeiro...</td></tr>
              ) : filteredTransactions.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-400">Nenhuma transação encontrada no período.</td></tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-900">{tx.description}</div>
                      <div className="text-xs text-slate-400 mt-0.5 capitalize flex items-center gap-1">
                        {tx.source === 'manual' ? 'Manual' : tx.source === 'vehicle_sale' ? 'Venda de Veículo' : 'Custo de Veículo'}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200 capitalize">
                        {tx.category.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {format(parseISO(tx.date), 'dd/MM/yyyy')}
                    </td>
                    <td className="px-6 py-4">
                      {tx.status === 'paid' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Pago
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 text-xs font-medium">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pendente
                        </span>
                      )}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold ${tx.type === 'income' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {tx.type === 'income' ? '+' : '-'} {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {tx.source === 'manual' && (
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => { setEditingTransaction(tx as any); setIsModalOpen(true); }}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(tx.id, tx.source)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <TransactionModal 
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setEditingTransaction(null); }}
        onSave={handleSaveTransaction}
        initialData={editingTransaction}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
