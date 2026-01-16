import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/utils";
import { Plus, FileText, Calendar, CheckCircle2, XCircle, Clock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function Proposals() {
  const [proposals, setProposals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProposals();
  }, []);

  async function loadProposals() {
    const { data } = await supabase
      .from('proposals')
      .select('*, vehicles(brand, model, version, year_model)')
      .order('created_at', { ascending: false });
    
    if (data) setProposals(data);
    setLoading(false);
  }

  const getStatusBadge = (status: string) => {
    switch(status) {
        case 'accepted': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-medium border border-emerald-100"><CheckCircle2 size={12}/> Aceita</span>;
        case 'rejected': return <span className="flex items-center gap-1 text-red-600 bg-red-50 px-2 py-1 rounded text-xs font-medium border border-red-100"><XCircle size={12}/> Recusada</span>;
        case 'sent': return <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-medium border border-blue-100"><FileText size={12}/> Enviada</span>;
        default: return <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded text-xs font-medium border border-slate-200"><Clock size={12}/> Rascunho</span>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Propostas Comerciais</h2>
          <p className="text-sm text-slate-500">Gerencie orçamentos e negociações</p>
        </div>
        <Link to="/proposals/new" className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
          <Plus size={18} />
          Nova Proposta
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
            <tr>
              <th className="px-6 py-4">Cliente</th>
              <th className="px-6 py-4">Veículo de Interesse</th>
              <th className="px-6 py-4">Valor Proposto</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Data</th>
              <th className="px-6 py-4 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
                <tr><td colSpan={6} className="p-8 text-center text-slate-500">Carregando propostas...</td></tr>
            ) : proposals.length === 0 ? (
                <tr><td colSpan={6} className="p-12 text-center text-slate-500">Nenhuma proposta criada.</td></tr>
            ) : (
                proposals.map((proposal) => (
                <tr key={proposal.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{proposal.customer_name}</td>
                    <td className="px-6 py-4">
                        <div className="text-slate-800">{proposal.vehicles?.brand} {proposal.vehicles?.model}</div>
                        <div className="text-xs text-slate-500">{proposal.vehicles?.version} • {proposal.vehicles?.year_model}</div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-900">{formatCurrency(proposal.price_final)}</td>
                    <td className="px-6 py-4">{getStatusBadge(proposal.status)}</td>
                    <td className="px-6 py-4 text-slate-500">
                        {format(new Date(proposal.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                    </td>
                    <td className="px-6 py-4 text-right">
                        <Link to={`/proposals/${proposal.id}`} className="text-blue-600 hover:text-blue-800 font-medium text-xs">
                            Ver Detalhes
                        </Link>
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
