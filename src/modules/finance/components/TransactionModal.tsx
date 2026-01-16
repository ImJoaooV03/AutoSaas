import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { TransactionSchema, TransactionFormValues } from '../types';
import { X, Save, Loader2, DollarSign, Calendar, Tag, AlignLeft } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: TransactionFormValues) => Promise<void>;
  initialData?: TransactionFormValues | null;
  isSubmitting: boolean;
}

export function TransactionModal({ isOpen, onClose, onSave, initialData, isSubmitting }: TransactionModalProps) {
  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<TransactionFormValues>({
    resolver: zodResolver(TransactionSchema),
    defaultValues: {
      type: 'expense',
      status: 'paid',
      date: new Date().toISOString().split('T')[0],
      amount: 0
    }
  });

  const type = watch('type');

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        reset(initialData);
      } else {
        reset({
          type: 'expense',
          status: 'paid',
          date: new Date().toISOString().split('T')[0],
          amount: undefined
        });
      }
    }
  }, [isOpen, initialData, reset]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Editar Transação' : 'Nova Transação'}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSave)} className="p-6 space-y-5">
          
          {/* Tipo */}
          <div className="grid grid-cols-2 gap-4 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => setValue('type', 'income')}
              className={`py-2 text-sm font-bold rounded-md transition-all ${type === 'income' ? 'bg-emerald-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Receita
            </button>
            <button
              type="button"
              onClick={() => setValue('type', 'expense')}
              className={`py-2 text-sm font-bold rounded-md transition-all ${type === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Despesa
            </button>
          </div>

          {/* Valor e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <DollarSign size={12} /> Valor
              </label>
              <input
                type="number"
                step="0.01"
                {...register('amount')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-semibold text-slate-800"
                placeholder="0.00"
              />
              {errors.amount && <p className="text-xs text-red-500">{errors.amount.message}</p>}
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Calendar size={12} /> Data
              </label>
              <input
                type="date"
                {...register('date')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-slate-600"
              />
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
              <AlignLeft size={12} /> Descrição
            </label>
            <input
              {...register('description')}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder="Ex: Aluguel da Loja"
            />
            {errors.description && <p className="text-xs text-red-500">{errors.description.message}</p>}
          </div>

          {/* Categoria e Status */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                <Tag size={12} /> Categoria
              </label>
              <select
                {...register('category')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="">Selecione...</option>
                {type === 'income' ? (
                  <>
                    <option value="venda_acessorios">Venda de Acessórios</option>
                    <option value="comissao">Comissões Recebidas</option>
                    <option value="servicos">Serviços Prestados</option>
                    <option value="outros">Outras Receitas</option>
                  </>
                ) : (
                  <>
                    <option value="aluguel">Aluguel / Condomínio</option>
                    <option value="salarios">Salários / Pessoal</option>
                    <option value="marketing">Marketing / Anúncios</option>
                    <option value="contas">Água / Luz / Internet</option>
                    <option value="impostos">Impostos</option>
                    <option value="manutencao">Manutenção Loja</option>
                    <option value="outros">Outras Despesas</option>
                  </>
                )}
              </select>
              {errors.category && <p className="text-xs text-red-500">{errors.category.message}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase">Status</label>
              <select
                {...register('status')}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
              >
                <option value="paid">Pago / Recebido</option>
                <option value="pending">Pendente</option>
              </select>
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 text-white rounded-lg font-medium flex items-center gap-2 shadow-lg transition-all disabled:opacity-70
                ${type === 'income' ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200' : 'bg-red-600 hover:bg-red-700 shadow-red-200'}
              `}
            >
              {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Salvar
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
