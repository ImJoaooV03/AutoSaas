import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { formatCurrency } from "../lib/utils";
import { 
  ArrowLeft, Printer, Share2, CheckCircle2, XCircle, 
  Car, User, Calendar, DollarSign, FileText, Loader2 
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export function ProposalDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [proposal, setProposal] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) loadProposal();
  }, [id]);

  async function loadProposal() {
    const { data, error } = await supabase
      .from('proposals')
      .select('*, vehicles(*), tenants(*)')
      .eq('id', id)
      .single();
    
    if (error) {
      alert("Proposta não encontrada");
      navigate('/proposals');
      return;
    }
    setProposal(data);
    setLoading(false);
  }

  const updateStatus = async (newStatus: string) => {
    if (!confirm(`Deseja alterar o status para ${newStatus}?`)) return;
    setUpdating(true);
    
    const { error } = await supabase
      .from('proposals')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      alert("Erro ao atualizar");
    } else {
      setProposal({ ...proposal, status: newStatus });
    }
    setUpdating(false);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = () => {
    if (!proposal) return;
    const message = `Olá ${proposal.customer_name}, aqui é da ${proposal.tenants?.name}. Segue o link da sua proposta para o veículo ${proposal.vehicles?.brand} ${proposal.vehicles?.model}: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  if (loading) return <div className="p-12 flex justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;
  if (!proposal) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Actions */}
      <div className="flex justify-between items-center print:hidden">
        <Link to="/proposals" className="flex items-center gap-2 text-slate-500 hover:text-blue-600 font-medium">
          <ArrowLeft size={18} /> Voltar
        </Link>
        <div className="flex gap-2">
          <button 
            onClick={handlePrint}
            className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 flex items-center gap-2 font-medium"
          >
            <Printer size={18} /> Imprimir
          </button>
          <button 
            onClick={handleWhatsApp}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center gap-2 font-medium shadow-sm"
          >
            <Share2 size={18} /> Enviar WhatsApp
          </button>
        </div>
      </div>

      {/* Proposal Document (Printable Area) */}
      <div ref={printRef} className="bg-white p-8 md:p-12 rounded-xl border border-slate-200 shadow-sm print:shadow-none print:border-none">
        
        {/* Header Documento */}
        <div className="flex justify-between items-start border-b border-slate-100 pb-8 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{proposal.tenants?.name}</h1>
            <p className="text-slate-500 text-sm mt-1">Proposta Comercial #{proposal.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-slate-500">Data de Emissão</p>
            <p className="font-medium text-slate-900">{format(new Date(proposal.created_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
            <p className="text-xs text-slate-400 mt-1">Válido até {format(new Date(proposal.valid_until), "dd/MM/yyyy")}</p>
          </div>
        </div>

        {/* Cliente & Veículo */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
              <User size={16} /> Cliente
            </h3>
            <p className="text-lg font-semibold text-slate-900">{proposal.customer_name}</p>
            <p className="text-slate-500 text-sm">Cliente Preferencial</p>
          </div>
          <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
            <h3 className="text-sm font-bold text-slate-500 uppercase mb-4 flex items-center gap-2">
              <Car size={16} /> Veículo de Interesse
            </h3>
            <p className="text-lg font-semibold text-slate-900">{proposal.vehicles?.brand} {proposal.vehicles?.model}</p>
            <p className="text-slate-600">{proposal.vehicles?.version}</p>
            <p className="text-xs text-slate-500 mt-1">{proposal.vehicles?.year_model} • {proposal.vehicles?.color}</p>
          </div>
        </div>

        {/* Condições */}
        <div className="mb-8">
          <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <DollarSign size={20} className="text-blue-600" />
            Condições de Pagamento
          </h3>
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm text-left">
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="px-6 py-4 text-slate-500">Preço do Veículo</td>
                  <td className="px-6 py-4 font-medium text-right text-slate-900">{formatCurrency(proposal.price_vehicle)}</td>
                </tr>
                {proposal.trade_in_vehicle && (
                  <tr className="bg-slate-50/50">
                    <td className="px-6 py-4 text-slate-500">
                      Veículo na Troca <span className="text-xs bg-slate-200 px-1.5 py-0.5 rounded ml-2">{proposal.trade_in_vehicle}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-right text-red-600">- {formatCurrency(proposal.trade_in_value)}</td>
                  </tr>
                )}
                {proposal.entry_value > 0 && (
                  <tr>
                    <td className="px-6 py-4 text-slate-500">Entrada</td>
                    <td className="px-6 py-4 font-medium text-right text-emerald-600">- {formatCurrency(proposal.entry_value)}</td>
                  </tr>
                )}
                <tr className="bg-blue-50/30">
                  <td className="px-6 py-4 font-bold text-slate-800">Valor Final Negociado</td>
                  <td className="px-6 py-4 font-bold text-right text-blue-700 text-lg">{formatCurrency(proposal.price_final)}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          {proposal.payment_method === 'financing' && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200 text-sm text-slate-600 flex items-center gap-3">
              <FileText size={18} className="text-slate-400" />
              <span>
                Sugestão de Financiamento: 
                <strong className="text-slate-900 ml-1">{proposal.installments}x</strong> parcelas (sujeito a análise de crédito bancária).
              </span>
            </div>
          )}
        </div>

        {/* Observações */}
        {proposal.notes && (
          <div className="mb-12">
            <h4 className="text-sm font-bold text-slate-800 mb-2">Observações</h4>
            <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100 italic">
              "{proposal.notes}"
            </p>
          </div>
        )}

        {/* Assinaturas */}
        <div className="grid grid-cols-2 gap-12 mt-16 pt-8 border-t border-slate-200">
          <div className="text-center">
            <div className="border-b border-slate-300 mb-2 h-8"></div>
            <p className="text-sm font-medium text-slate-900">{proposal.tenants?.name}</p>
            <p className="text-xs text-slate-500">Vendedor Responsável</p>
          </div>
          <div className="text-center">
            <div className="border-b border-slate-300 mb-2 h-8"></div>
            <p className="text-sm font-medium text-slate-900">{proposal.customer_name}</p>
            <p className="text-xs text-slate-500">Cliente</p>
          </div>
        </div>
      </div>

      {/* Status Actions Footer */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex justify-between items-center print:hidden">
        <div>
          <span className="text-sm text-slate-500 mr-2">Status Atual:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase border
            ${proposal.status === 'accepted' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 
              proposal.status === 'rejected' ? 'bg-red-100 text-red-700 border-red-200' : 
              'bg-blue-100 text-blue-700 border-blue-200'}
          `}>
            {proposal.status === 'accepted' ? 'Aceita' : proposal.status === 'rejected' ? 'Recusada' : 'Em Aberto'}
          </span>
        </div>
        <div className="flex gap-2">
          {proposal.status !== 'accepted' && (
            <button 
              onClick={() => updateStatus('accepted')}
              disabled={updating}
              className="px-4 py-2 text-sm font-medium text-emerald-700 hover:bg-emerald-50 rounded-lg border border-transparent hover:border-emerald-200 transition-colors flex items-center gap-2"
            >
              <CheckCircle2 size={16} /> Marcar como Aceita
            </button>
          )}
          {proposal.status !== 'rejected' && (
            <button 
              onClick={() => updateStatus('rejected')}
              disabled={updating}
              className="px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors flex items-center gap-2"
            >
              <XCircle size={16} /> Marcar como Recusada
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
