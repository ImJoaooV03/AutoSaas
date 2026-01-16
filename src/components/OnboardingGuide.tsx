import { useState, useEffect } from 'react';
import { X, CheckCircle2, ArrowRight, Car, Globe, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function OnboardingGuide() {
  const [isVisible, setIsVisible] = useState(false);
  const [steps, setSteps] = useState({
    hasVehicle: false,
    hasSettings: false,
    hasIntegration: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkProgress();
  }, []);

  async function checkProgress() {
    try {
      // Check if user has dismissed the guide previously
      const dismissed = localStorage.getItem('onboarding_dismissed');
      if (dismissed) {
        setLoading(false);
        return;
      }

      // Check Vehicle
      const { count: vCount } = await supabase.from('vehicles').select('*', { count: 'exact', head: true });
      
      // Check Tenant Settings (simple check if phone is set)
      const { data: { user } } = await supabase.auth.getUser();
      let hasPhone = false;
      if (user) {
        const { data: userData } = await supabase.from('users').select('tenant_id').eq('id', user.id).single();
        if (userData) {
            const { data: tenant } = await supabase.from('tenants').select('phone').eq('id', userData.tenant_id).single();
            if (tenant?.phone) hasPhone = true;
        }
      }

      // Check Integration Jobs
      const { count: jCount } = await supabase.from('integration_jobs').select('*', { count: 'exact', head: true });

      setSteps({
        hasVehicle: (vCount || 0) > 0,
        hasSettings: hasPhone,
        hasIntegration: (jCount || 0) > 0
      });

      // Show if not all completed
      if ((vCount || 0) === 0 || !hasPhone || (jCount || 0) === 0) {
        setIsVisible(true);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const dismiss = () => {
    setIsVisible(false);
    localStorage.setItem('onboarding_dismissed', 'true');
  };

  if (loading || !isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full animate-in slide-in-from-bottom-10 duration-500">
      <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-4 flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold text-sm">Bem-vindo ao AutoSaaS! 🚀</h3>
            <p className="text-slate-400 text-xs mt-1">Complete o setup da sua revenda</p>
          </div>
          <button onClick={dismiss} className="text-slate-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-4 space-y-3">
          {/* Step 1 */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${steps.hasVehicle ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${steps.hasVehicle ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {steps.hasVehicle ? <CheckCircle2 size={16} /> : <Car size={16} />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${steps.hasVehicle ? 'text-emerald-800' : 'text-slate-700'}`}>Cadastrar 1º Veículo</p>
              {!steps.hasVehicle && <Link to="/vehicles/new" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">Começar agora <ArrowRight size={10} /></Link>}
            </div>
          </div>

          {/* Step 2 */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${steps.hasSettings ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${steps.hasSettings ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {steps.hasSettings ? <CheckCircle2 size={16} /> : <Globe size={16} />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${steps.hasSettings ? 'text-emerald-800' : 'text-slate-700'}`}>Configurar Loja</p>
              {!steps.hasSettings && <Link to="/settings" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">Adicionar telefone/endereço <ArrowRight size={10} /></Link>}
            </div>
          </div>

          {/* Step 3 */}
          <div className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${steps.hasIntegration ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-slate-100'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${steps.hasIntegration ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>
              {steps.hasIntegration ? <CheckCircle2 size={16} /> : <Share2 size={16} />}
            </div>
            <div className="flex-1">
              <p className={`text-sm font-medium ${steps.hasIntegration ? 'text-emerald-800' : 'text-slate-700'}`}>Testar Integração</p>
              {!steps.hasIntegration && <Link to="/integrations" className="text-xs text-blue-600 hover:underline flex items-center gap-1 mt-1">Simular publicação <ArrowRight size={10} /></Link>}
            </div>
          </div>
        </div>

        {steps.hasVehicle && steps.hasSettings && steps.hasIntegration && (
            <div className="p-4 bg-emerald-50 border-t border-emerald-100 text-center">
                <p className="text-sm font-bold text-emerald-700">Tudo pronto! 🎉</p>
                <button onClick={dismiss} className="text-xs text-emerald-600 hover:underline mt-1">Fechar guia</button>
            </div>
        )}
      </div>
    </div>
  );
}
