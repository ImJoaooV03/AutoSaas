import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../context/AuthContext';
import { X, Loader2, Save, User, Phone, Mail, Car, MapPin, MessageSquare } from 'lucide-react';

// --- Schema de Validação ---
const leadFormSchema = z.object({
  name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  phone: z.string().min(14, "Telefone inválido. Formato: (99) 99999-9999"),
  email: z.string().email("Email inválido").optional().or(z.literal('')),
  vehicle_id: z.string().optional(),
  origin: z.string().min(1, "Origem é obrigatória"),
  status: z.enum(['new', 'contacted', 'proposal', 'negotiation', 'won', 'lost']),
  message: z.string().optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

interface LeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function LeadModal({ isOpen, onClose, onSuccess }: LeadModalProps) {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<{id: string, brand: string, model: string, price: number}[]>([]);
  
  const { register, handleSubmit, formState: { errors }, reset, setValue, watch } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      status: 'new',
      origin: 'loja',
      message: ''
    }
  });

  // Carregar veículos para o select
  useEffect(() => {
    if (isOpen) {
      loadVehicles();
    }
  }, [isOpen]);

  async function loadVehicles() {
    const { data } = await supabase
      .from('vehicles')
      .select('id, brand, model, price')
      .eq('status', 'available') // Apenas disponíveis
      .order('brand');
    
    if (data) setVehicles(data);
  }

  // Máscara de Telefone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    
    // (11) 99999-9999
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 9) value = `${value.slice(0, 9)}-${value.slice(9)}`;
    
    setValue('phone', value, { shouldValidate: true });
  };

  const onSubmit = async (data: LeadFormData) => {
    setIsSubmitting(true);
    try {
      // Buscar tenant_id
      const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user?.id).single();
      if (!userData) throw new Error("Erro de autenticação");

      const payload = {
        tenant_id: userData.tenant_id,
        name: data.name,
        phone: data.phone,
        email: data.email || null,
        vehicle_id: data.vehicle_id === "" ? null : data.vehicle_id,
        origin: data.origin,
        status: data.status,
        message: data.message,
        assigned_to: user?.id // Atribuir a quem criou
      };

      const { error } = await supabase.from('leads').insert(payload);

      if (error) throw error;

      reset();
      onSuccess();
      onClose();
    } catch (err: any) {
      alert("Erro ao salvar lead: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Novo Lead</h2>
            <p className="text-sm text-slate-500">Cadastre um cliente interessado</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          <form id="lead-form" onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            
            {/* Nome */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <User size={16} className="text-blue-600" /> Nome do Cliente <span className="text-red-500">*</span>
              </label>
              <input 
                {...register('name')}
                className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 transition-all ${errors.name ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-500'}`}
                placeholder="Ex: Maria Silva"
              />
              {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Phone size={16} className="text-blue-600" /> Telefone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input 
                  {...register('phone')}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 transition-all ${errors.phone ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-500'}`}
                  placeholder="(00) 00000-0000"
                />
                {errors.phone && <p className="text-xs text-red-500 font-medium">{errors.phone.message}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <Mail size={16} className="text-slate-400" /> Email (Opcional)
                </label>
                <input 
                  {...register('email')}
                  type="email"
                  className={`w-full px-4 py-2.5 border rounded-lg outline-none focus:ring-2 transition-all ${errors.email ? 'border-red-300 focus:ring-red-200' : 'border-slate-200 focus:ring-blue-500'}`}
                  placeholder="cliente@email.com"
                />
                {errors.email && <p className="text-xs text-red-500 font-medium">{errors.email.message}</p>}
              </div>
            </div>

            {/* Veículo de Interesse */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <Car size={16} className="text-blue-600" /> Veículo de Interesse
              </label>
              <select 
                {...register('vehicle_id')}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Nenhum veículo específico</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>
                    {v.brand} {v.model} - R$ {v.price.toLocaleString('pt-BR')}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Origem */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" /> Origem
                </label>
                <select 
                  {...register('origin')}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="loja">Loja Física (Balcão)</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="telefone">Telefone</option>
                  <option value="indicacao">Indicação</option>
                  <option value="site">Site Próprio</option>
                  <option value="olx">OLX</option>
                  <option value="webmotors">Webmotors</option>
                  <option value="facebook">Facebook/Instagram</option>
                </select>
              </div>

              {/* Status Inicial */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700">Status Inicial</label>
                <select 
                  {...register('status')}
                  className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="new">Novo</option>
                  <option value="contacted">Em Contato</option>
                  <option value="proposal">Proposta Enviada</option>
                  <option value="negotiation">Em Negociação</option>
                </select>
              </div>
            </div>

            {/* Mensagem / Observações */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                <MessageSquare size={16} className="text-slate-400" /> Observações
              </label>
              <textarea 
                {...register('message')}
                rows={3}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Ex: Cliente prefere contato após as 18h..."
              />
            </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
          <button 
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Cancelar
          </button>
          <button 
            type="submit"
            form="lead-form"
            disabled={isSubmitting}
            className="px-6 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 shadow-lg shadow-blue-200 disabled:opacity-70 transition-all"
          >
            {isSubmitting ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
            Salvar Lead
          </button>
        </div>

      </div>
    </div>
  );
}
