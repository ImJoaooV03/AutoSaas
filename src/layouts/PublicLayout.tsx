import { Outlet, useParams } from "react-router-dom";
import { Car, MapPin, Phone, Instagram, Facebook } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export function PublicLayout() {
  const { tenantId } = useParams<{ tenantId: string }>();
  const [tenant, setTenant] = useState<any>(null);

  useEffect(() => {
    if (tenantId) loadTenant();
  }, [tenantId]);

  async function loadTenant() {
    const { data } = await supabase.from('tenants').select('*').eq('id', tenantId).single();
    if (data) setTenant(data);
  }

  if (!tenant) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div></div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <Car size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-none">{tenant.name}</h1>
              <p className="text-xs text-slate-500 mt-1">Veículos Selecionados</p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Estoque</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Sobre Nós</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">Financiamento</a>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-colors shadow-md shadow-blue-100">
              Fale Conosco
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main>
        <Outlet context={{ tenant }} />
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 mt-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-4">{tenant.name}</h3>
            <p className="text-sm leading-relaxed mb-4">
              Referência em veículos novos e seminovos com garantia e procedência. 
              Venha nos visitar e tomar um café.
            </p>
            <div className="flex gap-4">
              <a href="#" className="hover:text-white transition-colors"><Instagram size={20} /></a>
              <a href="#" className="hover:text-white transition-colors"><Facebook size={20} /></a>
            </div>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2"><Phone size={16} /> (11) 99999-9999</li>
              <li className="flex items-center gap-2"><MapPin size={16} /> Av. dos Automóveis, 1000 - SP</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-4">Horário</h4>
            <ul className="space-y-2 text-sm">
              <li>Seg - Sex: 09h às 18h</li>
              <li>Sáb: 09h às 14h</li>
              <li>Dom: Fechado</li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-4 mt-12 pt-8 border-t border-slate-800 text-center text-xs">
          <p>Powered by AutoSaaS © 2025</p>
        </div>
      </footer>
    </div>
  );
}
