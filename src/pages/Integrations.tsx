import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { workerInstance } from "../modules/integrator/worker";
import { Play, RefreshCw, CheckCircle2, XCircle, Activity, Link2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ConnectionsTab } from "../modules/integrator/components/ConnectionsTab";

type Tab = 'monitoring' | 'connections';

export function Integrations() {
  const [activeTab, setActiveTab] = useState<Tab>('monitoring');
  const [jobs, setJobs] = useState<any[]>([]);
  const [isWorkerRunning, setIsWorkerRunning] = useState(false);

  useEffect(() => {
    // Start worker simulation
    workerInstance.start();
    setIsWorkerRunning(true);
    
    const interval = setInterval(fetchJobs, 2000);
    return () => {
        clearInterval(interval);
        workerInstance.stop();
    };
  }, []);

  async function fetchJobs() {
    const { data } = await supabase
        .from('integration_jobs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
    if (data) setJobs(data);
  }

  async function triggerTestJob() {
    const { data: vehicles } = await supabase.from('vehicles').select('id, tenant_id').limit(1);
    if (!vehicles || vehicles.length === 0) {
        alert("Crie um veículo no banco primeiro!");
        return;
    }
    
    const vehicle = vehicles[0];

    await supabase.from('integration_jobs').insert({
        tenant_id: vehicle.tenant_id,
        vehicle_id: vehicle.id,
        portal_code: 'olx',
        job_type: 'publish',
        status: 'pending',
        idempotency_key: Math.random().toString()
    });
    
    fetchJobs();
  }

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Painel do Integrador</h2>
          <p className="text-sm text-slate-500">Gerencie conexões e monitore publicações</p>
        </div>
        {activeTab === 'monitoring' && (
            <div className="flex gap-3">
                <button 
                    onClick={triggerTestJob}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium shadow-sm shadow-indigo-200"
                >
                    <Play size={16} />
                    Simular Publicação
                </button>
            </div>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="border-b border-slate-200 flex gap-8 flex-shrink-0">
        <button
            onClick={() => setActiveTab('monitoring')}
            className={`pb-3 flex items-center gap-2 text-sm font-medium transition-all relative
                ${activeTab === 'monitoring' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}
            `}
        >
            <Activity size={18} />
            Monitoramento
            {activeTab === 'monitoring' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
        <button
            onClick={() => setActiveTab('connections')}
            className={`pb-3 flex items-center gap-2 text-sm font-medium transition-all relative
                ${activeTab === 'connections' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700'}
            `}
        >
            <Link2 size={18} />
            Conexões & Credenciais
            {activeTab === 'connections' && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full" />}
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto min-h-0 py-2">
        
        {activeTab === 'connections' ? (
            <ConnectionsTab />
        ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
                {/* Status Cards */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Worker Status</h3>
                        <div className="flex items-center gap-2 mt-2">
                            <div className={`w-2.5 h-2.5 rounded-full ${isWorkerRunning ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
                            <span className="font-bold text-slate-900 text-lg">{isWorkerRunning ? 'Ativo' : 'Parado'}</span>
                        </div>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Jobs na Fila</h3>
                        <p className="text-2xl font-bold text-slate-900 mt-1">{jobs.filter(j => j.status === 'pending').length}</p>
                    </div>
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-xs font-bold text-slate-500 uppercase">Falhas (24h)</h3>
                        <p className="text-2xl font-bold text-red-600 mt-1">{jobs.filter(j => j.status === 'failed').length}</p>
                    </div>
                </div>

                {/* Jobs Table */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-800">Histórico de Jobs Recentes</h3>
                        <button onClick={() => fetchJobs()} className="text-slate-500 hover:text-blue-600 transition-colors"><RefreshCw size={16} /></button>
                    </div>
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">Job ID</th>
                                <th className="px-6 py-3">Tipo</th>
                                <th className="px-6 py-3">Portal</th>
                                <th className="px-6 py-3">Status</th>
                                <th className="px-6 py-3">Tentativas</th>
                                <th className="px-6 py-3">Atualizado em</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {jobs.map(job => (
                                <tr key={job.id} className="hover:bg-slate-50 transition-colors">
                                    <td className="px-6 py-3 font-mono text-xs text-slate-500">{job.id.slice(0,8)}...</td>
                                    <td className="px-6 py-3 font-medium text-slate-700 capitalize">{job.job_type}</td>
                                    <td className="px-6 py-3 uppercase text-xs font-bold text-slate-500">{job.portal_code}</td>
                                    <td className="px-6 py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border
                                            ${job.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 
                                            job.status === 'failed' ? 'bg-red-50 text-red-700 border-red-200' :
                                            job.status === 'processing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                            'bg-slate-100 text-slate-600 border-slate-200'
                                            }`}>
                                            {job.status === 'completed' && <CheckCircle2 size={12} />}
                                            {job.status === 'failed' && <XCircle size={12} />}
                                            {job.status === 'processing' && <RefreshCw size={12} className="animate-spin" />}
                                            {job.status}
                                        </span>
                                        {job.error_message && (
                                            <p className="text-xs text-red-500 mt-1 max-w-[200px] truncate" title={job.error_message}>{job.error_message}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-3 text-slate-600">{job.attempts} / {job.max_attempts}</td>
                                    <td className="px-6 py-3 text-slate-500 text-xs">
                                        {format(new Date(job.updated_at), "HH:mm:ss dd/MM", { locale: ptBR })}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}
