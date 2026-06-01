import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FLAVIA & SAIMIR - Wedding Uploads',
  description: 'Share your photos and videos from the wedding of Flavia & Saimir.',
  robots: { index: false, follow: false }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
