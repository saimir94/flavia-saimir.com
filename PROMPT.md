# Builder Prompt

Create an elegant, premium wedding upload website for FLAVIA & SAIMIR, wedding date 10.09.2026.

Purpose: Only photo and video uploads. No RSVP, no public gallery, no guest login.

Visual style:
- editorial luxury wedding aesthetic
- ivory/champagne/black color palette
- soft grain texture
- refined serif typography
- minimal, romantic, premium
- mobile-first because most guests will use phones

UX:
- Hero: FLAVIA & SAIMIR, 10.09.2026
- One clear call to action: Choose photos & videos
- Optional wedding passcode input
- Upload progress per file
- Success message: Thank you. Your memories were uploaded successfully.
- Accepted files: image/* and video/*
- No public listing of uploaded files

Backend:
- Next.js API route creates Microsoft Graph OneDrive upload session
- Files upload directly from browser to OneDrive uploadUrl in chunks
- Microsoft credentials remain server-side only
- Store files in OneDrive folder: Wedding Uploads/FLAVIA & SAIMIR 10.09.2026

Security:
- no Microsoft tokens exposed to guests
- optional UPLOAD_PASSCODE
- robots noindex
