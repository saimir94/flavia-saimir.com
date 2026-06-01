// app/api/create-upload-session/route.ts
import { NextRequest, NextResponse } from 'next/server';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

const ALLOWED_PREFIXES = ['image/', 'video/'];
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || '1024');
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

async function getAccessToken() {
  const clientId = process.env.CLIENT_ID;
  const refreshToken = process.env.REFRESH_TOKEN;

  if (!clientId || !refreshToken) {
    throw new Error('Missing CLIENT_ID or REFRESH_TOKEN environment variables.');
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

async function createOneDriveUploadSession(filename: string, mimeType: string) {
  const accessToken = await getAccessToken();

  const body = {
    item: {
      '@microsoft.graph.conflictBehavior': 'rename',
      name: filename,
    },
  };

  const res = await fetch(`${GRAPH_BASE_URL}/me/drive/root:/${filename}:/createUploadSession`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
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

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { filename, fileSize, mimeType, passcode } = await request.json();

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Missing file name.' }, { status: 400 });
    }

    if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'Invalid file size.' }, { status: 400 });
    }

    if (!mimeType || !ALLOWED_PREFIXES.some(prefix => mimeType.startsWith(prefix))) {
      return NextResponse.json({ error: 'Only images and videos are allowed.' }, { status: 400 });
    }

    if (fileSize > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `File too large. Max size is ${MAX_FILE_MB}MB.` }, { status: 413 });
    }

    const session = await createOneDriveUploadSession(filename, mimeType);
    return NextResponse.json(session);
  } catch (err: any) {
    console.error(err);
    return NextResponse.json(
      { error: 'Upload session could not be created. Check your Microsoft configuration.' },
      { status: 500 }
    );
  }
}