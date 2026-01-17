import express from 'express';
import cors from 'cors';
import olxRoutes from './olxRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', server: 'AutoSaaS Vercel Function', time: new Date() });
});

// Importante: O Express na Vercel recebe a URL completa.
app.use('/api/integrations/olx', olxRoutes);

export default app;
