import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createServiceClient } from '@/lib/supabase/service'
import { RegisterForm } from './register-form'

interface Pkg { name: string; price: number; includes?: string[] }
interface Props { params: Promise<{ slug: string }>; searchParams: Promise<{ cancelado?: string }> }

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
  const { cancelado } = await searchParams
  const found = await getEvent(slug)
  if (!found) notFound()
  const { ev, spotsLeft } = found

  const date = new Date(ev.event_date)
  const when = date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/Mexico_City' })
  const time = date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Mexico_City' })
  const closed = !ev.is_open || date < new Date() || spotsLeft === 0
  const fmt = (n: number) => Number(n).toLocaleString('es-MX', { style: 'currency', currency: ev.currency === 'usd' ? 'USD' : 'MXN', maximumFractionDigits: 0 })
  const packages = ((Array.isArray(ev.packages) ? ev.packages : []) as Pkg[]).filter(p => p?.name && p.price > 0)
  const options: Pkg[] = packages.length ? packages : [{ name: 'Inscripción', price: Number(ev.price), includes: [] }]
  const from = Math.min(...options.map(o => o.price))
  const gallery = (Array.isArray(ev.gallery) ? ev.gallery : []) as { src: string; alt?: string }[]
  const hero = gallery[0]?.src

  return (
    <main className="min-h-screen bg-[#0f2614] text-white">
      <section className="relative isolate overflow-hidden">
        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="absolute inset-0 -z-20 h-full w-full object-cover" />
        )}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-[#0f2614]/70 via-[#0f2614]/80 to-[#0f2614]" />
        <div className="mx-auto max-w-5xl px-4 pb-10 pt-12 text-center md:pb-14 md:pt-20">
          {ev.organizer && <p className="text-xs font-semibold uppercase tracking-[0.25em] text-yellow-300">{ev.organizer}</p>}
          <h1 className="mt-2 text-5xl font-black leading-none md:text-7xl">{ev.title}</h1>
          {ev.subtitle && <p className="mt-3 text-lg text-green-50/90">{ev.subtitle}</p>}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm">
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">📅 <span className="capitalize">{when}</span></span>
            <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">⏰ {time}</span>
            {ev.location && <span className="rounded-full bg-white/15 px-3 py-1.5 backdrop-blur">📍 {ev.location}</span>}
            <span className="rounded-full bg-yellow-400 px-3 py-1.5 font-bold text-green-950">Desde {fmt(from)}</span>
          </div>
          {!closed && <a href="#inscripcion" className="mt-7 inline-block rounded-xl bg-yellow-400 px-7 py-3.5 text-base font-bold text-green-950 shadow-lg transition hover:bg-yellow-300">Inscribirme ahora</a>}
          {spotsLeft !== null && spotsLeft > 0 && spotsLeft <= 50 && <p className="mt-3 text-sm text-yellow-200">⚡ Quedan {spotsLeft} lugares</p>}
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-8 px-4 py-8 md:grid-cols-5 md:py-12">
        <div className="space-y-5 md:col-span-2">
          {ev.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={ev.image_url} alt={`Cartel de ${ev.title}`} className="w-full rounded-2xl shadow-2xl" />
          )}
          {ev.description && <p className="whitespace-pre-line text-[15px] leading-relaxed text-green-50/80">{ev.description}</p>}
        </div>
        <div id="inscripcion" className="scroll-mt-6 space-y-4 md:col-span-3">
          <h2 className="text-2xl font-extrabold">Inscripción</h2>
          {cancelado && <p className="rounded-lg bg-yellow-400/15 px-3 py-2 text-sm text-yellow-200">El pago no se completó. Puedes intentarlo de nuevo cuando quieras.</p>}
          {closed ? (
            <p className="rounded-xl bg-white/10 p-4 text-center font-medium">Las inscripciones están cerradas.</p>
          ) : (
            <RegisterForm slug={ev.slug} packages={options.map(o => ({ ...o, label: fmt(o.price) }))} />
          )}
          <p className="text-xs text-green-50/50">El pago se procesa de forma segura con Stripe. Recibirás tu confirmación por correo.</p>
        </div>
      </section>

      {gallery.length > 1 && (
        <section className="mx-auto max-w-5xl px-4 pb-14">
          <h2 className="mb-4 text-2xl font-extrabold">Así se vivió la edición pasada</h2>
          <div className="columns-2 gap-3 md:columns-3 [&>*]:mb-3">
            {gallery.slice(1).map(g => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={g.src} src={g.src} alt={g.alt ?? ''} loading="lazy" className="w-full break-inside-avoid rounded-xl object-cover" />
            ))}
          </div>
        </section>
      )}
    </main>
  )
}
