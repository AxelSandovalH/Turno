import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { LandingPage } from '@/components/landing-page'
import { LANDING_VARIANTS, LANDING_SLUGS } from '@/lib/landing-variants'

// Landings por giro (/barberias, /salones, /restaurantes): la misma landing con titular, plan y WhatsApp del giro.
export const dynamicParams = false
export function generateStaticParams() {
  return LANDING_SLUGS.map(giro => ({ giro }))
}

export async function generateMetadata({ params }: { params: Promise<{ giro: string }> }): Promise<Metadata> {
  const v = LANDING_VARIANTS[(await params).giro]
  if (!v) return {}
  return {
    title: v.title,
    description: v.description,
    alternates: { canonical: `/${v.slug}` },
    openGraph: { title: v.title, description: v.description, url: `https://www.quickturno.app/${v.slug}`, siteName: 'QuickTurno', locale: 'es_MX', type: 'website' },
  }
}

export default async function GiroLanding({ params }: { params: Promise<{ giro: string }> }) {
  const v = LANDING_VARIANTS[(await params).giro]
  if (!v) notFound()
  return <LandingPage variant={v} />
}
