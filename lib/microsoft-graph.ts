const GRAPH_ROOT = 'https://graph.microsoft.com/v1.0';

function env(...names: string[]): string | undefined {
  for (const name of names) {
    const value = process.env[name];
    if (value) return value;
  }
}

function required(...names: string[]): string {
  const value = env(...names);
  if (!value) throw new Error(`Missing environment variable: ${names.join(' or ')}`);
  return value;
}

export function sanitizeFileName(input: string): string {
  const cleaned = input
    .normalize('NFKD')
    .replace(/[\\/:*?"<>|#%{}~&]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${timestamp} - ${cleaned || 'wedding-upload'}`;
}

export function encodeDrivePath(path: string): string {
  return path
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

export async function getAccessToken(): Promise<string> {
  const tenant = env('TENANT_ID', 'MICROSOFT_TENANT_ID') || 'consumers';
  const tokenUrl = `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: required('CLIENT_ID', 'MICROSOFT_CLIENT_ID'),
    client_secret: required('CLIENT_SECRET', 'MICROSOFT_CLIENT_SECRET'),
    refresh_token: required('REFRESH_TOKEN', 'MICROSOFT_REFRESH_TOKEN'),
    grant_type: 'refresh_token',
    scope: 'offline_access Files.ReadWrite User.Read'
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Token refresh failed: ${JSON.stringify(json)}`);
  }

  return json.access_token;
}

export async function createOneDriveUploadSession(params: {
  filename: string;
  fileSize: number;
  mimeType?: string;
}): Promise<{ uploadUrl: string; expirationDateTime?: string; finalPath: string }> {
  const accessToken = await getAccessToken();
  const folder = process.env.ONEDRIVE_FOLDER || 'Wedding Uploads/FLAVIA & SAIMIR 10.09.2026';
  const safeFilename = sanitizeFileName(params.filename);
  const fullPath = `${folder}/${safeFilename}`;
  const encodedPath = encodeDrivePath(fullPath);

  const response = await fetch(`${GRAPH_ROOT}/me/drive/root:/${encodedPath}:/createUploadSession`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      item: {
        '@microsoft.graph.conflictBehavior': 'rename',
        name: safeFilename,
        fileSize: params.fileSize
      }
    })
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(`Create upload session failed: ${JSON.stringify(json)}`);
  }

  return {
    uploadUrl: json.uploadUrl,
    expirationDateTime: json.expirationDateTime,
    finalPath: fullPath
  };
}
