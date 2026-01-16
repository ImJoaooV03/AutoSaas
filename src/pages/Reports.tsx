import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/utils";
import { BarChart3, TrendingUp, TrendingDown, DollarSign, Calendar, PieChart } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function Reports() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [topCars, setTopCars] = useState<any[]>([]);
  const [summary, setSummary] = useState({
    revenue: 0,
    profit: 0,
    margin: 0,
    avgTicket: 0
  });

  useEffect(() => {
    if (user) loadReports();
  }, [user]);

  async function loadReports() {
    try {
      // 1. Load Monthly Analytics from View
      const { data: analytics } = await supabase
        .from('analytics_monthly_sales')
        .select('*')
        .order('month_year', { ascending: true })
        .limit(12);

      if (analytics) {
        setSalesData(analytics);
        
        // Calculate totals
        const totalRev = analytics.reduce((acc, curr) => acc + (curr.total_revenue || 0), 0);
        const totalCost = analytics.reduce((acc, curr) => acc + (curr.total_costs || 0), 0);
        const totalSales = analytics.reduce((acc, curr) => acc + (curr.total_sales || 0), 0);
        const profit = totalRev - totalCost;

        setSummary({
          revenue: totalRev,
          profit: profit,
          margin: totalRev > 0 ? (profit / totalRev) * 100 : 0,
          avgTicket: totalSales > 0 ? totalRev / totalSales : 0
        });
      }

      // 2. Load Top Selling Models (Mock query logic as we don't have enough data in demo)
      // In real app: Group by model count where status = sold
      const { data: soldVehicles } = await supabase
        .from('vehicles')
        .select('brand, model, price')
        .eq('status', 'sold')
        .limit(50);
      
      if (soldVehicles) {
        const modelCounts: Record<string, number> = {};
        soldVehicles.forEach(v => {
            const key = `${v.brand} ${v.model}`;
            modelCounts[key] = (modelCounts[key] || 0) + 1;
        });
        
        const sortedModels = Object.entries(modelCounts)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
            
        setTopCars(sortedModels);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-12 text-center">Gerando relatórios...</div>;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Relatórios & BI</h2>
        <p className="text-sm text-slate-500">Análise financeira e performance de vendas</p>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg"><DollarSign size={20} /></div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded">+12%</span>
            </div>
            <p className="text-sm text-slate-500">Faturamento Total</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(summary.revenue)}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><TrendingUp size={20} /></div>
            </div>
            <p className="text-sm text-slate-500">Lucro Líquido</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(summary.profit)}</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><PieChart size={20} /></div>
            </div>
            <p className="text-sm text-slate-500">Margem Média</p>
            <h3 className="text-2xl font-bold text-slate-900">{summary.margin.toFixed(1)}%</h3>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg"><BarChart3 size={20} /></div>
            </div>
            <p className="text-sm text-slate-500">Ticket Médio</p>
            <h3 className="text-2xl font-bold text-slate-900">{formatCurrency(summary.avgTicket)}</h3>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Sales Chart (CSS Only for simplicity in WebContainer) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                <Calendar size={18} className="text-slate-400" />
                Vendas por Mês
            </h3>
            
            {salesData.length === 0 ? (
                <div className="h-64 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    Sem dados de vendas suficientes
                </div>
            ) : (
                <div className="h-64 flex items-end gap-4 px-4 pb-4 border-b border-l border-slate-200">
                    {salesData.map((data, idx) => {
                        const maxRevenue = Math.max(...salesData.map(d => d.total_revenue));
                        const heightPercentage = (data.total_revenue / maxRevenue) * 100;
                        
                        return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-2 group relative">
                                <div 
                                    className="w-full bg-blue-500 rounded-t-sm hover:bg-blue-600 transition-all relative group-hover:shadow-lg"
                                    style={{ height: `${heightPercentage}%` }}
                                >
                                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                                        {formatCurrency(data.total_revenue)}
                                    </div>
                                </div>
                                <span className="text-xs text-slate-500 font-medium rotate-0">{data.month_year}</span>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>

        {/* Top Models List */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-800 mb-6">Modelos Mais Vendidos</h3>
            <div className="space-y-4">
                {topCars.length === 0 ? (
                    <p className="text-sm text-slate-500">Nenhum veículo vendido ainda.</p>
                ) : (
                    topCars.map((car, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-6 h-6 bg-slate-200 rounded-full flex items-center justify-center text-xs font-bold text-slate-600">
                                    {idx + 1}
                                </div>
                                <span className="font-medium text-slate-800 text-sm">{car.name}</span>
                            </div>
                            <span className="text-sm font-bold text-slate-600">{car.count} un</span>
                        </div>
                    ))
                )}
                
                {topCars.length > 0 && (
                    <div className="pt-4 mt-4 border-t border-slate-100">
                        <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium">
                            Ver ranking completo
                        </button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
