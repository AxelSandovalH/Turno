import { NextResponse } from 'next/server'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const clean = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)

/** El organizador edita su evento (textos, fecha, lugar, paquetes). Solo toca eventos de su propia organización. */
export async function POST(req: Request) {
  const { organization } = await requireOrganization()
  const b = await req.json().catch(() => null)
  if (!b?.id) return NextResponse.json({ error: 'Solicitud inválida' }, { status: 400 })

  const title = clean(b.title, 120)
  if (title.length < 3) return NextResponse.json({ error: 'Escribe el nombre del evento' }, { status: 400 })
  const date = new Date(String(b.event_date))
  if (isNaN(date.getTime())) return NextResponse.json({ error: 'La fecha no es válida' }, { status: 400 })

  const raw = Array.isArray(b.packages) ? b.packages : []
  // El precio debe escribirse (0 vale para un paquete de carrera gratuito); las donaciones siempre llevan monto
  const packages = raw.slice(0, 20).map((p: Record<string, unknown>) => ({
    name: clean(p.name, 60),
    price: Math.round(Number(p.price) * 100) / 100,
    kind: p.kind === 'donation' ? 'donation' : 'race',
    includes: (Array.isArray(p.includes) ? p.includes : []).map((x: unknown) => clean(x, 90)).filter(Boolean).slice(0, 12),
    typed: String(p.price ?? '').trim() !== '',
  })).filter((p: { name: string; price: number; kind: string; typed: boolean }) => p.name && p.typed && (p.kind === 'race' ? p.price >= 0 : p.price > 0))
    .map(({ typed: _typed, ...rest }: { typed: boolean }) => rest)
  const racePrices = packages.filter((p: { kind: string }) => p.kind === 'race').map((p: { price: number }) => p.price)
  if (!racePrices.length) return NextResponse.json({ error: 'Agrega al menos un paquete de carrera con precio (0 si es gratis)' }, { status: 400 })

  // Fotos: solo URLs https (las que sube el panel a Storage o las ya existentes de la página)
  const okUrl = (u: unknown) => typeof u === 'string' && /^(https:\/\/|\/events\/)/.test(u) && u.length < 600
  const gallery = (Array.isArray(b.gallery) ? b.gallery : []).filter((g: { src?: unknown }) => okUrl(g?.src)).slice(0, 30)
    .map((g: { src: string; alt?: unknown }) => ({ src: g.src, alt: clean(g.alt, 120) || title }))
  const image_url = okUrl(b.image_url) ? String(b.image_url) : null

  const capacity = Number(b.capacity)
  const db = createServiceClient()
  const { error, data } = await db.from('events').update({
    title,
    subtitle: clean(b.subtitle, 160) || null,
    organizer: clean(b.organizer, 120) || null,
    description: clean(b.description, 2000) || null,
    location: clean(b.location, 200) || null,
    event_date: date.toISOString(),
    capacity: Number.isFinite(capacity) && capacity > 0 ? Math.floor(capacity) : null,
    is_open: !!b.is_open,
    // La columna exige precio > 0; con carrera gratuita guarda 1 (el precio real sale del paquete)
    price: Math.min(...racePrices) || 1,
    packages,
    gallery,
    ...(image_url ? { image_url } : {}),
  }).eq('id', clean(b.id, 64)).eq('organization_id', organization.id).select('slug').maybeSingle()
  if (error) return NextResponse.json({ error: 'No se pudo guardar' }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 })
  return NextResponse.json({ ok: true, slug: data.slug })
}
