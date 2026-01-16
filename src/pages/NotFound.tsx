import { Link } from "react-router-dom";
import { Car, Home, ArrowLeft } from "lucide-react";

export function NotFound() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 max-w-md w-full">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-6 text-slate-400">
          <Car size={40} />
        </div>
        
        <h1 className="text-4xl font-bold text-slate-900 mb-2">404</h1>
        <h2 className="text-xl font-semibold text-slate-700 mb-4">Página não encontrada</h2>
        
        <p className="text-slate-500 mb-8">
          Opa! Parece que você estacionou em uma vaga proibida. 
          A página que você procura não existe ou foi movida.
        </p>

        <div className="space-y-3">
          <Link 
            to="/" 
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <Home size={18} />
            Voltar para o Dashboard
          </Link>
          
          <button 
            onClick={() => window.history.back()}
            className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
          >
            <ArrowLeft size={18} />
            Voltar para página anterior
          </button>
        </div>
      </div>
      
      <p className="mt-8 text-xs text-slate-400">
        AutoSaaS Platform © 2025
      </p>
    </div>
  );
}
