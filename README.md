# FLAVIA & SAIMIR Wedding Upload Website

Elegant Next.js upload page for **FLAVIA & SAIMIR - 10.09.2026**. Guests can upload photos and videos without logging in. Files are saved privately to OneDrive through Microsoft Graph upload sessions.

Guests never see the OneDrive account, Microsoft credentials, or existing files. The browser receives only a short-lived upload URL for the one file it is sending.

## Features

- Drag-and-drop and click-to-select upload page
- Photos and videos only
- Animated per-file progress bars
- Thank-you message after successful uploads
- QR code placeholder for the printed wedding sign
- Server-created OneDrive upload sessions through Microsoft Graph
- Chunked browser upload in 10MB pieces for videos over 100MB
- Tailwind CSS styling

## Environment Variables

Create `.env.local` from `.env.example`.

```env
NEXT_PUBLIC_SUPABASE_URL=""
NEXT_PUBLIC_SUPABASE_ANON_KEY=""

CLIENT_ID="your-azure-app-client-id"
TENANT_ID="consumers"
CLIENT_SECRET="your-client-secret"
REFRESH_TOKEN="your-microsoft-refresh-token"
ONEDRIVE_FOLDER="Wedding Uploads/FLAVIA & SAIMIR 10.09.2026"

UPLOAD_PASSCODE=""
MAX_FILE_MB="1024"
NEXT_PUBLIC_MAX_FILE_MB="1024"
NEXT_PUBLIC_EVENT_TITLE="FLAVIA & SAIMIR"
NEXT_PUBLIC_EVENT_DATE="10.09.2026"
```

`NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are included as requested placeholders. This project does not use Supabase for storage or authentication.

`REFRESH_TOKEN` is required for a personal OneDrive account. Microsoft Graph cannot write to a personal user's OneDrive with only `CLIENT_ID`, `TENANT_ID`, and `CLIENT_SECRET`.

## Azure App Registration

1. Open Microsoft Entra ID / Azure App registrations.
2. Create a new registration named `Flavia Saimir Wedding Upload`.
3. For a personal OneDrive, choose `Personal Microsoft accounts only`.
4. Add a Web redirect URI:

```txt
http://localhost:3007/callback
```

5. Add delegated Microsoft Graph permissions:

```txt
Files.ReadWrite
User.Read
offline_access
```

6. Create a client secret and copy the secret value.

For a personal Microsoft account, keep `TENANT_ID="consumers"`. For an organization tenant, use that tenant ID instead.

## OneDrive Folder

Create this folder in the OneDrive account that will receive uploads:

```txt
Wedding Uploads/FLAVIA & SAIMIR 10.09.2026
```

You can change the path with `ONEDRIVE_FOLDER`.

## Get The Refresh Token

Install dependencies and run the helper:

```bash
npm install
npm run get-refresh-token
```

Open the URL shown in the terminal, sign in with the OneDrive owner account, and copy the printed `REFRESH_TOKEN` into `.env.local` and Vercel.

Never commit `.env.local` or any real secrets.

## Local Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), upload a test photo or video, and confirm it appears in the OneDrive folder.

## Vercel Deployment

1. Push the repo to GitHub on the `main` branch.
2. Import the project into Vercel.
3. Add the environment variables listed above in Vercel Project Settings.
4. Deploy.
5. Upload a small test image from the live URL.
6. Generate a QR code from the deployed URL and replace the placeholder in printed material.

Recommended sign text:

```txt
Share your memories with us
Scan here to upload your photos and videos
FLAVIA & SAIMIR - 10.09.2026
```

## Security Notes

- Microsoft credentials are used only in server-side code.
- Upload sessions are created only after the API validates file name, size, and MIME type.
- Only `image/*` and `video/*` MIME types are accepted.
- Guests cannot browse OneDrive or view other uploads.
- The upload URL expires automatically.

## Troubleshooting

If upload session creation fails, check:

- `CLIENT_ID`
- `CLIENT_SECRET`
- `TENANT_ID`
- `REFRESH_TOKEN`
- `ONEDRIVE_FOLDER`
- Microsoft Graph permissions include `Files.ReadWrite`, `User.Read`, and `offline_access`

If consent or token exchange fails, rerun:

```bash
npm run get-refresh-token
```
