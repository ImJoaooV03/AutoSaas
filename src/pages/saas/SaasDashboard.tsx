import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";
import { Building2, Users, Car, TrendingUp, ShieldCheck, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

export function SaasDashboard() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
  }, [user]);

  async function checkSuperAdmin() {
    if (!user) return;
    const { data } = await supabase.from('users').select('is_superadmin').eq('id', user.id).single();
    if (data?.is_superadmin) {
        setIsSuperAdmin(true);
        loadData();
    } else {
        setLoading(false);
    }
  }

  async function loadData() {
    // Fetch all tenants (Policy allows this for superadmin)
    const { data: tenantsData } = await supabase
        .from('tenants')
        .select('*, users(count), vehicles(count)'); // Count related data
    
    if (tenantsData) setTenants(tenantsData);
    setLoading(false);
  }

  if (loading) return <div className="p-12 text-center">Carregando Painel Master...</div>;

  if (!isSuperAdmin) {
    return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-center p-8">
            <div className="bg-amber-100 p-4 rounded-full text-amber-600 mb-4">
                <AlertTriangle size={32} />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Acesso Restrito</h2>
            <p className="text-slate-500 mt-2 max-w-md">
                Esta área é exclusiva para administradores da plataforma SaaS. 
                Se você é o dono, execute o comando SQL para se tornar superadmin.
            </p>
            <div className="mt-6 bg-slate-900 text-slate-300 p-4 rounded-lg text-xs font-mono text-left">
                UPDATE public.users SET is_superadmin = true WHERE email = '{user?.email}';
            </div>
        </div>
    );
  }

  const totalTenants = tenants.length;
  const totalVehicles = tenants.reduce((acc, t) => acc + (t.vehicles?.[0]?.count || 0), 0);
  const totalUsers = tenants.reduce((acc, t) => acc + (t.users?.[0]?.count || 0), 0);

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
            <h2 className="text-2xl font-bold text-slate-800">Painel Master SaaS</h2>
            <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold border border-indigo-200 flex items-center gap-1">
                <ShieldCheck size={12} /> SUPERADMIN
            </span>
        </div>
        <p className="text-sm text-slate-500">Visão global de todas as revendas cadastradas na plataforma.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                <Building2 size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">Revendas Ativas</p>
                <h3 className="text-2xl font-bold text-slate-900">{totalTenants}</h3>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
                <Car size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">Total de Veículos</p>
                <h3 className="text-2xl font-bold text-slate-900">{totalVehicles}</h3>
            </div>
        </div>
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                <Users size={24} />
            </div>
            <div>
                <p className="text-sm font-medium text-slate-500">Usuários Totais</p>
                <h3 className="text-2xl font-bold text-slate-900">{totalUsers}</h3>
            </div>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-semibold text-slate-800">Lista de Revendas</h3>
        </div>
        <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                    <th className="px-6 py-3">Revenda</th>
                    <th className="px-6 py-3">Slug (URL)</th>
                    <th className="px-6 py-3">Veículos</th>
                    <th className="px-6 py-3">Usuários</th>
                    <th className="px-6 py-3">Criado em</th>
                    <th className="px-6 py-3">Status</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {tenants.map(tenant => (
                    <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-900">{tenant.name}</td>
                        <td className="px-6 py-4 text-slate-500 font-mono text-xs">{tenant.slug}</td>
                        <td className="px-6 py-4">
                            <span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium text-slate-700">
                                {tenant.vehicles?.[0]?.count || 0} carros
                            </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">{tenant.users?.[0]?.count || 0}</td>
                        <td className="px-6 py-4 text-slate-500">
                            {format(new Date(tenant.created_at), 'dd/MM/yyyy')}
                        </td>
                        <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 border border-emerald-200">
                                Ativo
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
      </div>
    </div>
  );
}
