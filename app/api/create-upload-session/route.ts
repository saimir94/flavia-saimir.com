import fetch from 'node-fetch';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

async function getAccessToken() {
  const clientId = process.env.CLIENT_ID;
  const refreshToken = process.env.REFRESH_TOKEN;

  if (!clientId || !refreshToken) {
    throw new Error('Missing CLIENT_ID or REFRESH_TOKEN env variables.');
  }

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

// Funksioni brenda route.ts, por **jo i eksportuar si HTTP route**
async function createOneDriveUploadSession({ filename, fileSize, mimeType }) {
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

// Kjo është **POST handler i lejuar nga Next.js App Router**
export async function POST(request: Request) {
  try {
    const { filename, fileSize, mimeType, passcode } = await request.json();

    if (process.env.UPLOAD_PASSCODE && passcode !== process.env.UPLOAD_PASSCODE) {
      return new Response(JSON.stringify({ error: 'The upload code is not correct.' }), { status: 401 });
    }

    const session = await createOneDriveUploadSession({ filename, fileSize, mimeType });
    return new Response(JSON.stringify(session), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Upload session could not be created. Check the Microsoft configuration.' }), { status: 500 });
  }
}