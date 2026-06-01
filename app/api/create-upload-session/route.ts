import fetch from 'node-fetch';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

async function getAccessToken() {
  const clientId = process.env.CLIENT_ID;
  const refreshToken = process.env.REFRESH_TOKEN;

  if (!clientId || !refreshToken) {
    throw new Error('Missing CLIENT_ID or REFRESH_TOKEN env variables.');
  }

  // Merr access token nga refresh token
  const params = new URLSearchParams();
  params.append('client_id', clientId);
  params.append('scope', 'Files.ReadWrite offline_access');
  params.append('refresh_token', refreshToken);
  params.append('grant_type', 'refresh_token');

  const res = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('Failed to get access token: ' + JSON.stringify(data));

  return data.access_token;
}

/**
 * Krijon OneDrive upload session për file të madh
 */
export async function createOneDriveUploadSession({ filename, fileSize, mimeType }: { filename: string, fileSize: number, mimeType: string }) {
  const accessToken = await getAccessToken();

  const body = {
    item: {
      '@microsoft.graph.conflictBehavior': 'rename',
      name: filename,
    }
  };

  const res = await fetch(`${GRAPH_BASE_URL}/me/drive/root:/${filename}:/createUploadSession`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();
  if (!data.uploadUrl) throw new Error('Upload session failed: ' + JSON.stringify(data));

  return {
    uploadUrl: data.uploadUrl,
    expirationDateTime: data.expirationDateTime,
  };
}