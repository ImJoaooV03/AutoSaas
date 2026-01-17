import { Router, Request, Response } from 'express';
import axios from 'axios';
import { CONFIG } from './config';
import { DbService } from './db';
import { CryptoService } from './crypto';

const router = Router();

// 1. Iniciar Fluxo OAuth
// GET /integrations/olx/auth-url?tenantId=UUID
router.get('/auth-url', (req: Request, res: Response) => {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  // State carrega o tenantId para sabermos quem é no callback
  // Em produção, adicione um nonce aleatório para evitar CSRF
  const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');
  
  const redirectUri = `${CONFIG.API_URL}/integrations/olx/callback`;
  
  // Escopos: autoupload (publicar), basic_user_info (ler dados)
  const scope = 'autoupload basic_user_info'; 

  const authUrl = `${CONFIG.OLX_AUTH_URL}?response_type=code&client_id=${CONFIG.OLX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  res.json({ url: authUrl });
});

// 2. Callback da OLX
// GET /integrations/olx/callback?code=...&state=...
router.get('/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    console.error('OLX Auth Error:', error);
    return res.redirect(`${CONFIG.APP_URL}/integrations?error=olx_denied`);
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.status(400).send('Invalid request');
  }

  try {
    // Decodificar state para pegar tenantId
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { tenantId } = stateData;

    if (!tenantId) throw new Error('Tenant ID missing in state');

    // Trocar Code por Token
    const tokenResponse = await axios.post(
      `${CONFIG.OLX_AUTH_URL}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CONFIG.OLX_CLIENT_ID,
        client_secret: CONFIG.OLX_CLIENT_SECRET,
        redirect_uri: `${CONFIG.API_URL}/integrations/olx/callback`,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    // Criptografar tokens antes de salvar
    const encryptedAccess = CryptoService.encrypt(access_token);
    const encryptedRefresh = refresh_token ? CryptoService.encrypt(refresh_token) : null;

    // Salvar no Banco
    await DbService.upsertPortalConnection(tenantId, 'olx', {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: Date.now() + (expires_in * 1000),
      connectedAt: new Date().toISOString(),
      needsReauth: false
    });

    await DbService.logIntegration(tenantId, 'olx', 'info', 'Conexão OAuth realizada com sucesso');

    // Redirecionar de volta para o App
    res.redirect(`${CONFIG.APP_URL}/integrations?success=olx_connected`);

  } catch (err: any) {
    console.error('OLX Callback Error:', err.response?.data || err.message);
    res.redirect(`${CONFIG.APP_URL}/integrations?error=olx_failed`);
  }
});

// 3. Testar Conexão (Me)
// GET /integrations/olx/me?tenantId=...
router.get('/me', async (req: Request, res: Response) => {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'tenantId required' });
  }

  try {
    const connection = await DbService.getPortalConnection(tenantId, 'olx');
    if (!connection || !connection.config_json?.accessToken) {
      return res.status(404).json({ error: 'Not connected' });
    }

    // Descriptografar
    const accessToken = CryptoService.decrypt(connection.config_json.accessToken);

    // Chamar API da OLX para validar
    // Nota: A URL de user info pode variar dependendo da documentação atual da OLX.
    // Usando endpoint padrão de User Info do OAuth2 ou Basic Info
    const userInfo = await axios.get('https://apps.olx.com.br/oauth_api/basic_user_info', {
        params: { access_token: accessToken }
    });

    res.json({ 
      connected: true, 
      user: userInfo.data,
      expiresAt: connection.config_json.expiresAt 
    });

  } catch (err: any) {
    console.error('OLX Me Error:', err.response?.data || err.message);
    
    // Se der 401, marcar que precisa de reauth
    if (err.response?.status === 401) {
       // Opcional: Tentar refresh token aqui no futuro
       await DbService.upsertPortalConnection(tenantId as string, 'olx', { needsReauth: true });
    }

    res.status(500).json({ error: 'Failed to fetch user info', details: err.message });
  }
});

export default router;
