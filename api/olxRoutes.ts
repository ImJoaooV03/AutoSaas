import { Router, Request, Response } from 'express';
import axios from 'axios';
import { CONFIG } from './config';
import { DbService } from './db';
import { CryptoService } from './crypto';

const router = Router();

router.get('/auth-url', (req: Request, res: Response) => {
  const { tenantId } = req.query;

  if (!tenantId || typeof tenantId !== 'string') {
    return res.status(400).json({ error: 'tenantId is required' });
  }

  const state = Buffer.from(JSON.stringify({ tenantId })).toString('base64');
  
  // URL de callback apontando para a API em produção
  const redirectUri = `${CONFIG.APP_URL}/api/integrations/olx/callback`;
  
  const scope = 'autoupload basic_user_info'; 

  const authUrl = `${CONFIG.OLX_AUTH_URL}?response_type=code&client_id=${CONFIG.OLX_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}&state=${state}`;

  res.json({ url: authUrl });
});

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
    const stateData = JSON.parse(Buffer.from(state, 'base64').toString());
    const { tenantId } = stateData;

    if (!tenantId) throw new Error('Tenant ID missing in state');

    const redirectUri = `${CONFIG.APP_URL}/api/integrations/olx/callback`;

    const tokenResponse = await axios.post(
      `${CONFIG.OLX_AUTH_URL}/token`,
      new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: CONFIG.OLX_CLIENT_ID,
        client_secret: CONFIG.OLX_CLIENT_SECRET,
        redirect_uri: redirectUri,
      }),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const encryptedAccess = CryptoService.encrypt(access_token);
    const encryptedRefresh = refresh_token ? CryptoService.encrypt(refresh_token) : null;

    await DbService.upsertPortalConnection(tenantId, 'olx', {
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      expiresAt: Date.now() + (expires_in * 1000),
      connectedAt: new Date().toISOString(),
      needsReauth: false
    });

    await DbService.logIntegration(tenantId, 'olx', 'info', 'Conexão OAuth realizada com sucesso');

    res.redirect(`${CONFIG.APP_URL}/integrations?success=olx_connected`);

  } catch (err: any) {
    console.error('OLX Callback Error:', err.response?.data || err.message);
    res.redirect(`${CONFIG.APP_URL}/integrations?error=olx_failed`);
  }
});

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

    const accessToken = CryptoService.decrypt(connection.config_json.accessToken);

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
    if (err.response?.status === 401) {
       await DbService.upsertPortalConnection(tenantId as string, 'olx', { needsReauth: true });
    }
    res.status(500).json({ error: 'Failed to fetch user info', details: err.message });
  }
});

export default router;
