import type { Metadata } from 'next'
import { DM_Sans, Syne } from 'next/font/google'
import { Toaster } from 'react-hot-toast'
import Providers from '@/components/layout/Providers'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
})

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: { default: 'GolfGives — Play Golf. Change Lives.', template: '%s | GolfGives' },
  description: 'Subscribe, enter Stableford scores, compete in monthly prize draws, and donate to charity.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${syne.variable}`}>
      <body className="bg-bg-primary text-white font-sans antialiased">
        <Providers>
          {children}
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: '#1f2330',
                color: '#f0f4ff',
                border: '1px solid rgba(74,222,128,0.3)',
                fontFamily: 'var(--font-syne)',
                fontWeight: 600,
                fontSize: '0.875rem',
              },
              success: { iconTheme: { primary: '#4ade80', secondary: '#0a0b0d' } },
              error:   { iconTheme: { primary: '#ef4444', secondary: '#0a0b0d' } },
            }}
          />
        </Providers>
      </body>
    </html>
  )
}
