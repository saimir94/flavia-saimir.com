// app/api/create-upload-session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createOneDriveUploadSession } from '@/lib/microsoft-graph';

export const runtime = 'nodejs';

const ALLOWED_PREFIXES = ['image/', 'video/'];
const MAX_FILE_MB = Number(process.env.MAX_FILE_MB || process.env.NEXT_PUBLIC_MAX_FILE_MB || '1024');
const MAX_FILE_BYTES = MAX_FILE_MB * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const { filename, fileSize, mimeType, passcode } = await request.json();

    const requiredPasscode = process.env.UPLOAD_PASSCODE;
    if (requiredPasscode && passcode !== requiredPasscode) {
      return NextResponse.json({ error: 'The upload code is not correct.' }, { status: 401 });
    }

    if (!filename || typeof filename !== 'string') {
      return NextResponse.json({ error: 'Missing file name.' }, { status: 400 });
    }

    if (!Number.isSafeInteger(fileSize) || fileSize <= 0) {
      return NextResponse.json({ error: 'Missing or invalid file size.' }, { status: 400 });
    }

    if (!mimeType || typeof mimeType !== 'string' || !ALLOWED_PREFIXES.some(prefix => mimeType.startsWith(prefix))) {
      return NextResponse.json({ error: 'Only photos and videos can be uploaded.' }, { status: 400 });
    }

    if (fileSize > MAX_FILE_BYTES) {
      return NextResponse.json({ error: `This file is too large. The limit is ${MAX_FILE_MB}MB.` }, { status: 413 });
    }

    const session = await createOneDriveUploadSession({ filename, fileSize, mimeType });
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Upload session could not be created. Check the Microsoft configuration.' },
      { status: 500 }
    );
  }
}