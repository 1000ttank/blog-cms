import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { Providers } from '@/components/layout/Providers'
import { GlobalFontProvider } from '@/components/layout/GlobalFontProvider'
import { UpdateBanner } from '@/components/layout/UpdateBanner'
import { SpaRedirectHandler } from '@/components/layout/SpaRedirectHandler'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: {
    default: 'Hexo-NX-CMS',
    template: '%s | Hexo-NX-CMS',
  },
  description: 'Next.js CMS for Hexo blog — Jamstack + GitOps + Serverless',
  keywords: ['hexo', 'cms', 'blog', 'nextjs', 'github'],
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon-96x96.png', type: 'image/png', sizes: '96x96' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <GlobalFontProvider />
        <SpaRedirectHandler />
        <UpdateBanner />
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
