import { LayoutDashboard, Car, Users, BarChart3, Settings, Share2, FileText, Wallet, LogOut, ShieldCheck, ExternalLink } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
  { icon: Car, label: 'Estoque', path: '/vehicles' },
  { icon: Users, label: 'Leads & CRM', path: '/leads' },
  { icon: Share2, label: 'Integrações', path: '/integrations' },
  { icon: FileText, label: 'Propostas', path: '/proposals' },
  { icon: Wallet, label: 'Financeiro', path: '/finance' },
  { icon: BarChart3, label: 'Relatórios', path: '/reports' },
  { icon: Settings, label: 'Configurações', path: '/settings' },
];

export function Sidebar() {
  const { user, signOut } = useAuth();
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [tenantId, setTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (user) checkUserContext();
  }, [user]);

  async function checkUserContext() {
    const { data } = await supabase.from('users').select('is_superadmin, tenant_id').eq('id', user?.id).single();
    if (data) {
        if (data.is_superadmin) setIsSuperAdmin(true);
        setTenantId(data.tenant_id);
    }
  }

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col h-screen fixed left-0 top-0 border-r border-slate-800 z-50">
      <div className="p-6 border-b border-slate-800">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          AutoSaaS
        </h1>
        <p className="text-xs text-slate-500 mt-1">Gestão Inteligente</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                isActive 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}

        {/* Public Site Link */}
        {tenantId && (
            <div className="pt-4 mt-4 border-t border-slate-800">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Vitrine Digital</p>
                <a
                    href={`/site/${tenantId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors text-sm font-medium group"
                >
                    <ExternalLink size={18} className="group-hover:scale-110 transition-transform" />
                    Ver meu Site
                </a>
            </div>
        )}

        {/* Super Admin Link */}
        {isSuperAdmin && (
            <div className="pt-4 mt-4 border-t border-slate-800">
                <p className="px-4 text-xs font-bold text-slate-500 uppercase mb-2">Administração</p>
                <NavLink
                    to="/saas"
                    className={({ isActive }) =>
                    cn(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-sm font-medium",
                        isActive 
                        ? "bg-indigo-600 text-white" 
                        : "text-indigo-400 hover:bg-slate-800 hover:text-indigo-300"
                    )
                    }
                >
                    <ShieldCheck size={18} />
                    Painel Master
                </NavLink>
            </div>
        )}
      </nav>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className="flex items-center gap-3 px-4 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-indigo-500 flex items-center justify-center text-xs font-bold uppercase text-white">
            {user?.email?.substring(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate text-slate-200">{user?.email}</p>
            <p className="text-xs text-slate-500 truncate">
                {isSuperAdmin ? 'Super Admin' : 'Admin Revenda'}
            </p>
          </div>
        </div>
        <button 
          onClick={() => signOut()}
          className="w-full flex items-center gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <LogOut size={14} />
          Sair da conta
        </button>
      </div>
    </aside>
  );
}
