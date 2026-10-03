import type { Metadata, Viewport } from 'next';
import './globals.css';
import './auth.css';
import { AppShell } from '@/components/app-shell';
import { ServiceWorker } from '@/components/service-worker';
import { ThemeProvider } from '@/components/theme-provider';

export const metadata: Metadata = { title: 'QMS Monitor — Pengelolaan Dokumen', description: 'Pantau pengajuan, review, dan tenggat dokumen QMS dalam satu tempat.', manifest: '/manifest.webmanifest', appleWebApp: { capable: true, statusBarStyle: 'default', title: 'QMS Monitor' }, icons: { apple: '/apple-touch-icon.png', icon: [{ url: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icon-512.png', sizes: '512x512', type: 'image/png' }] } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover', colorScheme: 'light dark' };
const themeBootstrap = `(function(){var r=document.documentElement;function apply(t){if(t!=='light'&&t!=='dark'&&t!=='system')t='system';r.setAttribute('data-theme',t);var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);r.setAttribute('data-color-scheme',d?'dark':'light');var m=document.getElementById('qms-theme-color');if(m)m.setAttribute('content',d?'#0B1220':'#F5F7FA')}try{apply(localStorage.getItem('qms-theme')||'system')}catch(e){apply('system')}var media=matchMedia('(prefers-color-scheme: dark)');media.addEventListener('change',function(){if(r.getAttribute('data-theme')==='system')apply('system')})})()`;
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id" data-theme="system" suppressHydrationWarning><head><meta id="qms-theme-color" name="theme-color" content="#F5F7FA"/><script dangerouslySetInnerHTML={{ __html: themeBootstrap }}/></head><body><ThemeProvider><ServiceWorker/><AppShell>{children}</AppShell></ThemeProvider></body></html>;
}
