import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Car, Loader2, AlertCircle } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "A senha deve ter no mínimo 6 caracteres"),
  companyName: z.string().optional(), // Only for signup
});

type AuthForm = z.infer<typeof authSchema>;

export function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors }, reset, clearErrors } = useForm<AuthForm>({
    resolver: zodResolver(authSchema),
  });

  // Limpar erros ao trocar entre Login e Cadastro
  useEffect(() => {
    clearErrors();
    reset();
    setError(null);
  }, [isSignUp, clearErrors, reset]);

  const onSubmit = async (data: AuthForm) => {
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              company_name: data.companyName,
              full_name: data.email.split('@')[0], // Simple default
            },
          },
        });
        if (error) throw error;
        alert("Cadastro realizado! Se não conseguir logar, peça ao admin para confirmar seu email ou use o script de dev.");
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password: data.password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (err: any) {
      console.error(err);
      if (err.message.includes("Email not confirmed")) {
        setError("Seu email ainda não foi confirmado. Em ambiente de teste, execute o script de migração 'confirm_users' no banco de dados.");
      } else if (err.message.includes("Invalid login credentials")) {
        setError("Email ou senha incorretos.");
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="w-12 h-12 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 text-white shadow-lg shadow-blue-900/50">
            <Car size={24} />
          </div>
          <h1 className="text-2xl font-bold text-white">AutoSaaS</h1>
          <p className="text-slate-400 text-sm mt-2">Plataforma de Gestão para Revendas</p>
        </div>

        <div className="p-8">
          <h2 className="text-xl font-semibold text-slate-800 mb-6">
            {isSignUp ? 'Criar nova conta' : 'Acesse sua conta'}
          </h2>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm mb-6 border border-red-100 flex items-start gap-2">
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="seu@email.com"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input
                {...register('password')}
                type="password"
                autoComplete={isSignUp ? "new-password" : "current-password"}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
            </div>

            {isSignUp && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Revenda</label>
                <input
                  {...register('companyName')}
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                  placeholder="Ex: Auto Prime Motors"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isSignUp ? 'Criar Conta Grátis' : 'Entrar na Plataforma'}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100 text-center">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-slate-500 hover:text-blue-600 font-medium"
            >
              {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem conta? Crie agora'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
