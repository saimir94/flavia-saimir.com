'use client';

import { useMemo, useRef, useState } from 'react';
import { Check, Heart, ImageUp, Loader2, Lock, QrCode, Upload, Video } from 'lucide-react';

type UploadState = {
  name: string;
  progress: number;
  status: 'waiting' | 'uploading' | 'done' | 'error';
  error?: string;
};

const CHUNK_SIZE = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ['image/', 'video/'];

function isAllowedFile(file: File) {
  return ACCEPTED_TYPES.some(type => file.type.startsWith(type));
}

async function uploadFileToOneDrive(file: File, passcode: string, onProgress: (progress: number) => void) {
  const sessionResponse = await fetch('/api/create-upload-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      passcode
    })
  });

  const session = await sessionResponse.json();
  if (!sessionResponse.ok) {
    throw new Error(session.error || 'Upload could not start.');
  }

  let start = 0;
  while (start < file.size) {
    const end = Math.min(start + CHUNK_SIZE, file.size);
    const chunk = file.slice(start, end);
    const uploadResponse = await fetch(session.uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Length': String(chunk.size),
        'Content-Range': `bytes ${start}-${end - 1}/${file.size}`
      },
      body: chunk
    });

    if (![200, 201, 202].includes(uploadResponse.status)) {
      const text = await uploadResponse.text();
      throw new Error(text || 'Upload failed.');
    }

    start = end;
    onProgress(Math.round((start / file.size) * 100));
  }
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [states, setStates] = useState<UploadState[]>([]);
  const [passcode, setPasscode] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [complete, setComplete] = useState(false);
  const [selectionError, setSelectionError] = useState('');

  const eventTitle = process.env.NEXT_PUBLIC_EVENT_TITLE || 'FLAVIA & SAIMIR';
  const eventDate = process.env.NEXT_PUBLIC_EVENT_DATE || '10.09.2026';
  const maxMb = Number(process.env.NEXT_PUBLIC_MAX_FILE_MB || '1024');
  const totalSize = useMemo(() => files.reduce((sum, file) => sum + file.size, 0), [files]);

  function formatBytes(bytes: number) {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function onSelect(selected: FileList | null) {
    if (!selected) return;

    const allFiles = Array.from(selected);
    const valid = allFiles.filter(isAllowedFile);
    setFiles(valid);
    setStates(valid.map(file => ({ name: file.name, progress: 0, status: 'waiting' })));
    setComplete(false);
    setSelectionError(valid.length === allFiles.length ? '' : 'Only photos and videos can be uploaded.');
  }

  async function uploadAll() {
    if (!files.length) return;
    setIsUploading(true);
    setComplete(false);

    const nextStates: UploadState[] = files.map(file => ({ name: file.name, progress: 0, status: 'waiting' }));
    setStates([...nextStates]);

    for (let index = 0; index < files.length; index++) {
      const file = files[index];
      if (file.size > maxMb * 1024 * 1024) {
        nextStates[index] = { name: file.name, progress: 0, status: 'error', error: `Over the ${maxMb}MB limit.` };
        setStates([...nextStates]);
        continue;
      }

      try {
        nextStates[index] = { ...nextStates[index], status: 'uploading' };
        setStates([...nextStates]);
        await uploadFileToOneDrive(file, passcode, progress => {
          nextStates[index] = { ...nextStates[index], progress, status: 'uploading' };
          setStates([...nextStates]);
        });
        nextStates[index] = { name: file.name, progress: 100, status: 'done' };
        setStates([...nextStates]);
      } catch (error) {
        nextStates[index] = {
          name: file.name,
          progress: nextStates[index].progress,
          status: 'error',
          error: error instanceof Error ? error.message : 'Upload failed.'
        };
        setStates([...nextStates]);
      }
    }

    setIsUploading(false);
    setComplete(nextStates.every(item => item.status === 'done'));
  }

  return (
    <main className="grain min-h-screen overflow-hidden bg-ivory text-ink">
      <section className="relative mx-auto grid min-h-screen w-full max-w-6xl items-center gap-8 px-5 py-10 lg:grid-cols-[1fr_18rem] lg:px-8">
        <div className="absolute left-1/2 top-8 h-72 w-72 -translate-x-1/2 rounded-full bg-blush blur-3xl" />

        <div className="relative rounded-[1.75rem] border border-white/70 bg-white/60 p-5 shadow-2xl shadow-stone-900/10 backdrop-blur md:p-9">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-champagne/40 bg-white/70 px-4 py-2 text-xs uppercase tracking-[0.32em] text-stone-600">
              <Heart className="h-4 w-4" /> {eventDate}
            </div>
            <h1 className="font-serif text-4xl font-light tracking-[0.08em] md:text-7xl">{eventTitle}</h1>
            <div className="mx-auto my-7 h-px w-40 bg-gradient-to-r from-transparent via-champagne to-transparent" />
            <p className="mx-auto max-w-xl text-base leading-8 text-stone-700 md:text-lg">
              Share the beautiful moments you captured with us. Your photos and videos go privately to our wedding OneDrive folder.
            </p>
          </div>

          <div className="mx-auto mt-9 max-w-2xl rounded-2xl border border-stone-200/80 bg-ivory/85 p-5 md:p-7">
            {process.env.NEXT_PUBLIC_UPLOAD_PASSCODE_LABEL !== 'hidden' && (
              <label className="mb-5 block">
                <span className="mb-2 flex items-center gap-2 text-sm font-medium text-stone-700">
                  <Lock className="h-4 w-4" /> Wedding code, if provided
                </span>
                <input
                  value={passcode}
                  onChange={event => setPasscode(event.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none transition focus:border-champagne"
                />
              </label>
            )}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={event => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={event => {
                event.preventDefault();
                setIsDragging(false);
                onSelect(event.dataTransfer.files);
              }}
              className={`group flex min-h-52 w-full flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition ${
                isDragging ? 'border-ink bg-white' : 'border-champagne/70 bg-white/70 hover:bg-white'
              }`}
            >
              <ImageUp className="mb-4 h-11 w-11 text-champagne transition group-hover:scale-105" />
              <span className="font-serif text-2xl">Drop photos and videos here</span>
              <span className="mt-2 text-sm text-stone-600">or tap to choose files, up to {maxMb}MB each</span>
            </button>
            <input
              ref={inputRef}
              className="hidden"
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={event => onSelect(event.target.files)}
            />

            {selectionError && <p className="mt-3 text-sm text-red-700">{selectionError}</p>}

            {files.length > 0 && (
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm text-stone-600">
                  <span>{files.length} file{files.length === 1 ? '' : 's'} selected</span>
                  <span>{formatBytes(totalSize)}</span>
                </div>

                <div className="max-h-64 space-y-3 overflow-auto pr-1">
                  {states.map((item, index) => (
                    <div key={`${item.name}-${index}`} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <span className="flex min-w-0 items-center gap-2 truncate">
                          <Video className="h-4 w-4 shrink-0 text-champagne" />
                          <span className="truncate">{item.name}</span>
                        </span>
                        <span className="shrink-0 text-stone-500">{item.status === 'done' ? 'Done' : `${item.progress}%`}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
                        <div className="h-full rounded-full bg-ink transition-all duration-500 ease-out" style={{ width: `${item.progress}%` }} />
                      </div>
                      {item.error && <p className="mt-2 text-xs text-red-700">{item.error}</p>}
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={uploadAll}
                  disabled={isUploading}
                  className="mt-4 flex w-full items-center justify-center gap-3 rounded-full bg-ink px-6 py-4 text-sm font-semibold uppercase tracking-[0.25em] text-ivory transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
                  {isUploading ? 'Uploading...' : 'Upload memories'}
                </button>
              </div>
            )}

            {complete && (
              <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-center text-emerald-900">
                <Check className="mx-auto mb-2 h-6 w-6" /> Thank you. Your memories were uploaded successfully.
              </div>
            )}
          </div>

          <p className="mt-8 text-center text-xs uppercase tracking-[0.3em] text-stone-500">Thank you for being part of our day</p>
        </div>

        <aside className="relative rounded-2xl border border-white/70 bg-white/60 p-5 text-center shadow-xl shadow-stone-900/10 backdrop-blur">
          <div className="mx-auto flex aspect-square max-w-56 items-center justify-center rounded-xl border border-dashed border-champagne/80 bg-ivory">
            <QrCode className="h-24 w-24 text-stone-500" />
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.25em] text-stone-500">QR code placeholder</p>
          <p className="mt-3 text-sm leading-6 text-stone-700">Replace this with the QR code for the deployed upload page before printing.</p>
        </aside>
      </section>
    </main>
  );
}
