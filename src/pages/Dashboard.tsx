import { useEffect, useState } from "react";
import { BarChart3, Car, ShoppingBag, Users, TrendingUp, Loader2, ShieldCheck, Activity, CheckCircle2, AlertCircle } from "lucide-react";
import { formatCurrency } from "../lib/utils";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { OnboardingGuide } from "../components/OnboardingGuide";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    vehiclesTotal: 0,
    vehiclesAvailable: 0,
    leadsTotal: 0,
    leadsNew: 0,
    salesTotal: 0,
    salesCount: 0
  });
  const [recentLogs, setRecentLogs] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
        loadStats();
        loadRecentActivity();
    }
  }, [user]);

  async function loadStats() {
    try {
      // 1. Vehicles Stats
      const { count: vTotal } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
      const { count: vAvailable } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'available');
      const { count: vSold } = await supabase.from('vehicles').select('*', { count: 'exact', head: true }).eq('status', 'sold');
      
      // 2. Leads Stats
      const { count: lTotal } = await supabase.from('leads').select('*', { count: 'exact', head: true });
      const { count: lNew } = await supabase.from('leads').select('*', { count: 'exact', head: true }).eq('status', 'new');

      // 3. Sales Volume
      const { data: soldVehicles } = await supabase.from('vehicles').select('price').eq('status', 'sold');
      const salesVol = soldVehicles?.reduce((acc, curr) => acc + (curr.price || 0), 0) || 0;

      setStats({
        vehiclesTotal: vTotal || 0,
        vehiclesAvailable: vAvailable || 0,
        leadsTotal: lTotal || 0,
        leadsNew: lNew || 0,
        salesTotal: salesVol,
        salesCount: vSold || 0
      });
    } catch (err) {
      console.error("Error loading stats", err);
    }
  }

  async function loadRecentActivity() {
    try {
        // Fetch logs from integrator and lead creation
        const { data } = await supabase
            .from('integration_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (data) setRecentLogs(data);
    } catch (err) {
        console.error("Error loading activity", err);
    } finally {
        setLoading(false);
    }
  }

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

  const cards = [
    { 
      label: 'Estoque Disponível', 
      value: stats.vehiclesAvailable.toString(), 
      sub: `De ${stats.vehiclesTotal} total`,
      icon: Car, 
      color: 'text-blue-500', 
      bg: 'bg-blue-50' 
    },
    { 
      label: 'Leads Novos', 
      value: stats.leadsNew.toString(), 
      sub: `${stats.leadsTotal} no total`,
      icon: Users, 
      color: 'text-indigo-500', 
      bg: 'bg-indigo-50' 
    },
    { 
      label: 'Volume de Vendas', 
      value: formatCurrency(stats.salesTotal), 
      sub: `${stats.salesCount} veículos vendidos`,
      icon: ShoppingBag, 
      color: 'text-emerald-500', 
      bg: 'bg-emerald-50' 
    },
    { 
      label: 'Taxa de Conversão', 
      value: stats.leadsTotal > 0 ? `${((stats.salesCount / stats.leadsTotal) * 100).toFixed(1)}%` : '0%', 
      sub: 'Leads -> Vendas',
      icon: TrendingUp, 
      color: 'text-amber-500', 
      bg: 'bg-amber-50' 
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <OnboardingGuide />
      
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Visão Geral</h2>
          <p className="text-sm text-slate-500 flex items-center gap-2">
             Métricas em tempo real da sua revenda
             <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-medium border border-emerald-100">
                <ShieldCheck size={10} /> Sistema Seguro
             </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Link to="/vehicles/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
            <Car size={16} /> Novo Veículo
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((stat) => (
          <div key={stat.label} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-2">{stat.value}</h3>
              </div>
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                <stat.icon size={20} />
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-4">
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Placeholder */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm min-h-[300px] flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-slate-800">Performance de Vendas</h3>
            <Link to="/reports" className="text-sm text-blue-600 hover:underline">Ver relatório completo</Link>
          </div>
          <div className="flex-1 flex items-center justify-center text-slate-400 bg-slate-50 rounded-lg border border-dashed border-slate-200">
            <div className="text-center">
                <BarChart3 size={48} className="mb-4 opacity-20 mx-auto" />
                <p>Gráfico disponível no módulo de Relatórios</p>
            </div>
          </div>
        </div>
        
        {/* Recent Activity Feed */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <Activity size={18} className="text-blue-600" />
            Atividade Recente
          </h3>
          
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
             {recentLogs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                    Nenhuma atividade registrada ainda.
                </div>
             ) : (
                recentLogs.map((log) => (
                    <div key={log.id} className="flex gap-3 items-start">
                        <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${
                            log.level === 'error' ? 'bg-red-500' : 'bg-emerald-500'
                        }`} />
                        <div>
                            <p className="text-sm text-slate-700 font-medium">{log.message_human}</p>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] text-slate-400 uppercase font-bold bg-slate-100 px-1.5 py-0.5 rounded">
                                    {log.portal_code}
                                </span>
                                <span className="text-xs text-slate-400">
                                    {format(new Date(log.created_at), "HH:mm", { locale: ptBR })}
                                </span>
                            </div>
                        </div>
                    </div>
                ))
             )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100">
             <Link to="/integrations" className="block w-full text-center px-4 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-sm font-medium text-slate-700 transition-colors">
                Ver todos os logs
             </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
