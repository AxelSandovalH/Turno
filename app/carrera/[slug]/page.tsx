import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { EventSlides } from './event-slides'

interface Pkg { name: string; price: number; includes?: string[]; kind?: 'race' | 'donation' }
interface Props { params: Promise<{ slug: string }>; searchParams: Promise<{ cancelado?: string; debug?: string }> }

export const dynamic = 'force-dynamic'

async function getEvent(slug: string) {
  const db = createServiceClient()
  const { data: ev } = await db.from('events').select('id, slug, title, subtitle, description, event_date, location, price, currency, capacity, image_url, is_open, packages, gallery, organizer').eq('slug', slug).maybeSingle()
  if (!ev) return null
  let spotsLeft: number | null = null
  if (ev.capacity) {
    const { count } = await db.from('event_registrations').select('id', { count: 'exact', head: true }).eq('event_id', ev.id).eq('status', 'paid')
    spotsLeft = Math.max(ev.capacity - (count ?? 0), 0)
  }
  return { ev, spotsLeft }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const found = await getEvent(slug)
  if (!found) return { title: 'Evento' }
  const { ev } = found
  return {
    title: `${ev.title} — Inscripción`,
    description: ev.subtitle ?? ev.description ?? undefined,
    openGraph: { title: ev.title, description: ev.subtitle ?? undefined, images: ev.image_url ? [ev.image_url] : undefined },
  }
}

export default async function EventPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { cancelado, debug } = await searchParams
  const found = await getEvent(slug)
  if (!found) notFound()
  const { ev, spotsLeft } = found

  const date = new Date(ev.event_date)
  const when = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })
  const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })
  const fmt = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: ev.currency === 'usd' ? 'USD' : 'MXN', maximumFractionDigits: 0 })
  const packages = ((Array.isArray(ev.packages) ? ev.packages : []) as Pkg[]).filter(p => p?.name && (p.price > 0 || p.kind === 'race'))
  const hasRace = packages.some(p => p.kind !== 'donation')
  const options: Pkg[] = hasRace || packages.length ? packages : [{ name: 'Inscripción', price: Number(ev.price), includes: [] }]
  if (!packages.length) options[0].kind = 'race'
  const racePrices = options.filter(o => o.kind !== 'donation').map(o => o.price)
  const from = racePrices.length ? Math.min(...racePrices) : Math.min(...options.map(o => o.price))
  const hasDonations = options.some(o => o.kind === 'donation')
  // Lugares agotados cierra solo la carrera: las donaciones siguen abiertas
  const raceFull = spotsLeft === 0
  const closed = !ev.is_open || date < new Date() || (raceFull && !hasDonations)
  const gallery = (Array.isArray(ev.gallery) ? ev.gallery : []) as { src: string; alt?: string }[]

  return (
    <EventSlides
      slug={ev.slug} title={ev.title} subtitle={ev.subtitle} organizer={ev.organizer} description={ev.description}
      when={when} time={time} location={ev.location} fromLabel={fmt(from)}
      flyer={ev.image_url} gallery={gallery} packages={options.map(o => ({ ...o, label: o.price > 0 ? fmt(o.price) : 'Gratis' }))}
      closed={closed} raceFull={raceFull} currency={ev.currency} spotsLeft={spotsLeft} cancelado={!!cancelado} debug={!!debug}
    />
  )
}
