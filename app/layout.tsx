import type { Metadata, Viewport } from 'next'
import { Toaster } from '@/components/ui/sonner'
import ServiceWorkerRegister from '@/components/pwa/ServiceWorkerRegister'
import { getSupabasePublicEnv } from '@/lib/env'
import './globals.css'

export const metadata: Metadata = {
  title: 'Cantoni English School',
  description: 'Portal acadêmico e administrativo da Cantoni English School',
  applicationName: 'Cantoni English School',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Cantoni English School',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a8a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { url, anonKey } = getSupabasePublicEnv()
  const serializedPublicEnv = JSON.stringify({ url, anonKey })

  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full">
        <script
          dangerouslySetInnerHTML={{
            __html: `window.__SUPABASE_PUBLIC_ENV__ = ${serializedPublicEnv};`,
          }}
        />
        <ServiceWorkerRegister />
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
