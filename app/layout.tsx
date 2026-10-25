import type { Metadata, Viewport } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans } from 'next/font/google';
import { SITE_URL } from '@/lib/routing';
import './globals.css';

const plexSans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  display: 'swap',
  adjustFontFallback: false, // fall back to the prototype's own stack (system UI), not a metric-adjusted Arial
  variable: '--font-plex-sans',
  fallback: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
});
const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
  adjustFontFallback: false, // fall back to the prototype's own stack (system UI), not a metric-adjusted Arial
  variable: '--font-plex-mono',
  fallback: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Consolas', 'monospace'],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  verification: { google: "2R2vOG0fDhmBtDQxU7lnOjiVscWTQYzAc1kVRMVyAyI" },
  title: 'json0 - JSON Tools Online',
  description:
    'JSON, CSV and MongoDB tools that run in your browser: diff, query, validate, format, tables, schemas, redaction and more. Nothing you paste leaves your device.',
  applicationName: 'json0',
  icons: { icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }], apple: '/apple-touch-icon.png.svg' },
  manifest: '/site.webmanifest',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f2f6f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0c0c' },
  ],
};

/* Applies the saved theme before first paint, so a dark-theme visitor never sees a light flash. */
const THEME_INIT = `try{if(localStorage.getItem('json0-theme')==='dark')document.documentElement.setAttribute('data-theme','dark')}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="light" className={`${plexSans.variable} ${plexMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
