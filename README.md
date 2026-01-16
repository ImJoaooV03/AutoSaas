# AutoSaaS - Plataforma de Gestão para Revendas de Veículos

Bem-vindo ao **AutoSaaS**, um sistema completo (Multi-tenant) para gestão de revendas de carros, integrando estoque, CRM, financeiro e publicação em portais.

## 🚀 Status do Projeto: CONCLUÍDO
O sistema está estável, seguro (0 vulnerabilidades críticas) e com todas as funcionalidades operantes.

### Funcionalidades
1. **Multi-tenancy & Segurança:** Isolamento total de dados via RLS.
2. **Gestão de Estoque:** Wizard completo com validação.
3. **Integrador:** Simulação de fila/worker com retry inteligente.
4. **CRM:** Kanban Board para gestão de leads.
5. **Vitrine Pública:** Site automático para cada loja (`/site/:tenantId`).
6. **Financeiro:** Cálculo de margem e custos por veículo.

---

## 🛠️ Como Rodar

### 1. Configuração
Certifique-se de que o arquivo `.env` contém suas credenciais do Supabase:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

### 2. Banco de Dados (Migrações)
Para configurar o banco do zero, execute os scripts na pasta `supabase/migrations` em ordem.
**Scripts Críticos Recentes:**
- `...20_absolute_final_security.sql`: Blinda todas as tabelas.
- `...21_confirm_users.sql`: Desbloqueia logins pendentes.
- `...26_fix_recursion_final_v3.sql`: **CRÍTICO** - Correção definitiva para erro de recursão infinita nas políticas de acesso (Bypass RLS Pattern).

### 3. Execução
```bash
yarn install
yarn run dev
```

### 4. Deploy
Este projeto está pronto para o Netlify.
- O arquivo `netlify.toml` já está configurado para lidar com rotas SPA (React Router).
- Basta conectar o repositório e definir as variáveis de ambiente no painel do Netlify.

---

## 🧪 Testes Rápidos

1. **Login:** Crie uma conta ou use uma existente.
2. **Seeder:** Vá em `Configurações` -> `Rodar Seeder` para popular a loja com dados de teste.
3. **Integração:** Cadastre um carro e clique em "Publicar" na aba Integrações.
4. **Site:** Acesse o link "Ver meu Site" na barra lateral.

---

**Desenvolvido com Dualite**
