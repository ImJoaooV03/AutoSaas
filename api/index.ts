import express from 'express';
import cors from 'cors';
import olxRoutes from './olxRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

// Rotas da API
app.use('/api/integrations/olx', olxRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'AutoSaaS Vercel Function', time: new Date() });
});

// Exporta o app para a Vercel
export default app;
