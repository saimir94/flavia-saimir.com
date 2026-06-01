import http from 'node:http';
import { URL } from 'node:url';
import { loadEnvConfig } from '@next/env';

loadEnvConfig(process.cwd());

const clientId = process.env.CLIENT_ID || process.env.MICROSOFT_CLIENT_ID;
const clientSecret = process.env.CLIENT_SECRET || process.env.MICROSOFT_CLIENT_SECRET;
const tenant = process.env.TENANT_ID || process.env.MICROSOFT_TENANT_ID || 'consumers';
const port = Number(process.env.AUTH_PORT || 3007);
const redirectUri = `http://localhost:${port}/callback`;

if (!clientId || !clientSecret) {
  console.error('Missing CLIENT_ID or CLIENT_SECRET in .env.local');
  process.exit(1);
}

const scope = 'offline_access Files.ReadWrite User.Read';
const authUrl = new URL(`https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`);
authUrl.searchParams.set('client_id', clientId);
authUrl.searchParams.set('response_type', 'code');
authUrl.searchParams.set('redirect_uri', redirectUri);
authUrl.searchParams.set('response_mode', 'query');
authUrl.searchParams.set('scope', scope);
authUrl.searchParams.set('prompt', 'consent');

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', redirectUri);
  if (url.pathname !== '/callback') {
    res.writeHead(404);
    res.end('Not found');
    return;
  }

  const code = url.searchParams.get('code');
  const error = url.searchParams.get('error');
  if (error || !code) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end(`Authorization failed: ${error || 'missing code'}`);
    server.close();
    return;
  }

  try {
    const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
      scope
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body
    });
    const json = await response.json();

    if (!response.ok) throw new Error(JSON.stringify(json, null, 2));

    console.log('\nCOPY THIS INTO VERCEL AND .env.local:\n');
    console.log(`REFRESH_TOKEN="${json.refresh_token}"\n`);

    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end('<h1>Done</h1><p>You can close this window and copy the refresh token from the terminal.</p>');
  } catch (err) {
    console.error(err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Token exchange failed. Check the terminal.');
  } finally {
    server.close();
  }
});

server.listen(port, () => {
  console.log('\nOpen this URL in your browser and sign in with the OneDrive account:\n');
  console.log(authUrl.toString());
  console.log(`\nRedirect URI to add in Azure: ${redirectUri}\n`);
});
