import type { Metadata } from 'next'
import { Inter, Geist_Mono, Instrument_Serif } from 'next/font/google'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SplashScreen } from '@/components/splash-screen'
import { Analytics } from '@vercel/analytics/next'
import { GoogleTag } from '@/components/analytics/google-tag'
import './globals.css'

const geistSans = Inter({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })
const instrumentSerif = Instrument_Serif({
  variable: '--font-serif',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://www.quickturno.app'),
  title: 'QuickTurno — Recepcionista por WhatsApp que agenda citas y toma pedidos',
  description: 'QuickTurno contesta tu WhatsApp las 24 horas, agenda citas, confirma y recuerda a tus clientes, cobra anticipos y toma pedidos. Barberías, spas, consultorios, tours y restaurantes. 7 días gratis.',
  openGraph: {
    title: 'QuickTurno — Recepcionista por WhatsApp para tu negocio',
    description: 'Agenda citas, confirma, recuerda y cobra anticipos por WhatsApp, sin que tú contestes. 7 días gratis.',
    url: 'https://www.quickturno.app',
    siteName: 'QuickTurno',
    locale: 'es_MX',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'QuickTurno — Recepcionista por WhatsApp para tu negocio', description: 'Agenda citas, confirma, recuerda y cobra anticipos por WhatsApp, sin que tú contestes. 7 días gratis.' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${instrumentSerif.variable} antialiased`}>
        <TooltipProvider>
          <SplashScreen />
          {children}
          <Toaster richColors position="top-right" />
        </TooltipProvider>
        <Analytics />
        <GoogleTag />
      </body>
    </html>
  )
}
