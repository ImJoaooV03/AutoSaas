import express from 'express';
import cors from 'cors';
import olxRoutes from './olxRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Rota de Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'AutoSaaS Vercel Function', time: new Date() });
});

// Rotas da OLX
// Importante: O Express na Vercel recebe a URL completa.
// Como o arquivo é [...route].ts dentro de 'api', ele captura tudo sob /api
app.use('/api/integrations/olx', olxRoutes);

// Exporta o app para a Vercel
export default app;
