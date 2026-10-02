import type { Metadata, Viewport } from 'next';
import './globals.css';
import './auth.css';
import { AppShell } from '@/components/app-shell';
import { ServiceWorker } from '@/components/service-worker';

export const metadata: Metadata = { title: 'QMS Monitor — Pengelolaan Dokumen', description: 'Pantau pengajuan, review, dan tenggat dokumen QMS dalam satu tempat.', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'QMS Monitor' }, icons: { apple: '/apple-touch-icon.png', icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }] } };
export const viewport: Viewport = { themeColor: '#f6f7f9', width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="id"><body><ServiceWorker/><AppShell>{children}</AppShell></body></html>; }
