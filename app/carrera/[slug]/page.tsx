import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { RegisterForm } from './register-form'

interface Props { params: Promise<{ slug: string }>; searchParams: Promise<{ cancelado?: string }> }

export const dynamic = 'force-dynamic'

async function getEvent(slug: string) {
  const db = createServiceClient()
  const { data: ev } = await db.from('events').select('id, slug, title, subtitle, description, event_date, location, price, currency, capacity, image_url, is_open').eq('slug', slug).maybeSingle()
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
  const { cancelado } = await searchParams
  const found = await getEvent(slug)
  if (!found) notFound()
  const { ev, spotsLeft } = found

  const date = new Date(ev.event_date)
  const when = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })
  const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })
  const closed = !ev.is_open || date < new Date() || spotsLeft === 0
  const price = Number(ev.price).toLocaleString('es-MX', { style: 'currency', currency: ev.currency === 'usd' ? 'USD' : 'MXN', maximumFractionDigits: 0 })

  return (
    <main className="min-h-screen bg-[#14301a] text-white">
      <div className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-2 md:py-12">
        <div>
          {ev.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ev.image_url} alt={ev.title} className="w-full rounded-2xl shadow-2xl" />
          )}
        </div>
        <div className="space-y-5">
          <div>
            <h1 className="text-3xl font-extrabold leading-tight md:text-4xl">{ev.title}</h1>
            {ev.subtitle && <p className="mt-1 text-lg text-yellow-300">{ev.subtitle}</p>}
          </div>
          <ul className="space-y-1 text-[15px] text-green-50/90">
            <li>📅 <span className="capitalize">{when}</span>, {time}</li>
            {ev.location && <li>📍 {ev.location}</li>}
            <li>🎟️ Inscripción: <b className="text-yellow-300">{price}</b></li>
            {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 50 && <li>⚡ Quedan {spotsLeft} lugares</li>}
          </ul>
          {ev.description && <p className="whitespace-pre-line text-[15px] text-green-50/80">{ev.description}</p>}
          {cancelado && <p className="rounded-lg bg-yellow-400/15 px-3 py-2 text-sm text-yellow-200">El pago no se completó. Puedes intentarlo de nuevo cuando quieras.</p>}
          {closed ? (
            <p className="rounded-xl bg-white/10 p-4 text-center font-medium">Las inscripciones están cerradas.</p>
          ) : (
            <RegisterForm slug={ev.slug} price={price} />
          )}
          <p className="text-xs text-green-50/50">El pago se procesa de forma segura con Stripe. Recibirás tu confirmación por correo.</p>
        </div>
      </div>
    </main>
  )
}
