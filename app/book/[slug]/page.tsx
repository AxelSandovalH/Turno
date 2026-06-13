import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import type { Metadata } from 'next'
import { BookingForm } from './booking-form'

interface Props { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const db = createServiceClient()
  const { data: org } = await db.from('organizations').select('name').eq('slug', slug).single()
  return { title: org ? `Reservar cita — ${org.name}` : 'Reservar cita' }
}

export default async function BookingPage({ params }: Props) {
  const { slug } = await params
  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, name, slug, whatsapp_number, address, logo_url, primary_color, business_type, is_active')
    .eq('slug', slug)
    .single()

  if (!org || !org.is_active) notFound()

  const [{ data: servicesRaw }, { data: staff }] = await Promise.all([
    db.from('services')
      .select('id, name, duration_minutes, price')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .order('name'),
    db.from('staff')
      .select('id, name')
      .eq('organization_id', org.id)
      .eq('is_active', true)
      .in('role', ['therapist', 'staff']),
  ])

  // Evaluación inicial siempre primero
  const services = (servicesRaw ?? []).sort((a, b) => {
    const aEval = a.name.toLowerCase().includes('evaluación') || a.name.toLowerCase().includes('evaluacion')
    const bEval = b.name.toLowerCase().includes('evaluación') || b.name.toLowerCase().includes('evaluacion')
    if (aEval && !bEval) return -1
    if (!aEval && bEval) return 1
    return 0
  })

  const accent = org.primary_color ?? '#7c3aed'
  const isMedical = org.business_type && org.business_type !== 'barbershop'
  const ctaLabel = isMedical ? 'Agendar sesión' : 'Reservar turno'
  const serviceLabel = isMedical ? 'sesión' : 'servicio'

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800">
        <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-3">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-10 w-10 rounded-xl object-cover" />
          ) : (
            <div
              className="h-10 w-10 rounded-xl flex items-center justify-center text-sm font-bold"
              style={{ background: `${accent}22`, color: accent }}
            >
              {org.name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold">{org.name}</p>
            {org.address && <p className="text-xs text-zinc-500">{org.address}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold">{ctaLabel}</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Elige tu {serviceLabel}, fecha y horario. Te contactaremos por WhatsApp para confirmar.
          </p>
        </div>

        <BookingForm
          org={{ id: org.id, name: org.name, whatsapp_number: org.whatsapp_number }}
          services={services}
          staff={staff ?? []}
          accent={accent}
          ctaLabel={ctaLabel}
        />
      </div>
    </div>
  )
}
