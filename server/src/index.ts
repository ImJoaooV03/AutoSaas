import express from 'express';
import cors from 'cors';
import { CONFIG } from './config';
import olxRoutes from './olxRoutes';

const app = express();

app.use(cors()); // Permite chamadas do Frontend
app.use(express.json());

// Rotas
app.use('/integrations/olx', olxRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', server: 'AutoSaaS BFF', time: new Date() });
});

app.listen(CONFIG.PORT, () => {
  console.log(`🚀 Server running on port ${CONFIG.PORT}`);
  console.log(`Callback URL: ${CONFIG.API_URL}/integrations/olx/callback`);
});
