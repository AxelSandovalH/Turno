import { notFound } from 'next/navigation'
import { createServiceClient } from '@/lib/supabase/service'
import { isMedicalVertical } from '@/lib/business-type'
import { format, differenceInYears, isAfter } from 'date-fns'
import { es } from 'date-fns/locale'
import type { Metadata } from 'next'

interface Props { params: Promise<{ token: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const db = createServiceClient()
  const { data: patient } = await db
    .from('customers').select('name, organization:organizations(name)').eq('portal_token', token).single()
  const orgName = (patient?.organization as unknown as { name: string } | null)?.name ?? 'Turno'
  return { title: `Mi portal — ${orgName}` }
}

export default async function PatientPortalPage({ params }: Props) {
  const { token } = await params
  const db = createServiceClient()

  const { data: patient } = await db
    .from('customers')
    .select('*, organization:organizations(name, whatsapp_number, logo_url, primary_color, business_type)')
    .eq('portal_token', token)
    .single()

  if (!patient) notFound()

  const org = patient.organization as unknown as {
    name: string; whatsapp_number: string; logo_url: string | null
    primary_color: string | null; business_type: string | null
  } | null

  const accent = org?.primary_color ?? '#7c3aed'
  const isMedical = isMedicalVertical(org?.business_type)

  // Upcoming appointments
  const { data: appointments } = await db
    .from('appointments')
    .select('id, starts_at, ends_at, status, service:services(name), staff:staff(name)')
    .eq('customer_id', patient.id)
    .eq('organization_id', patient.organization_id)
    .eq('status', 'confirmed')
    .gte('starts_at', new Date().toISOString())
    .order('starts_at', { ascending: true })
    .limit(5)

  // Active treatment plan
  const { data: activePlan } = await db
    .from('treatment_plans')
    .select('id, title, sessions_done, total_sessions, starts_at, ends_at, status')
    .eq('customer_id', patient.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  // Pain evolution (SOAP notes with pain_level)
  const apptIds = (await db.from('appointments').select('id').eq('customer_id', patient.id)).data?.map(a => a.id) ?? []
  const { data: notes } = apptIds.length > 0
    ? await db
        .from('appointment_notes')
        .select('pain_level, created_at, appointment:appointments(starts_at)')
        .in('appointment_id', apptIds)
        .not('pain_level', 'is', null)
        .order('created_at', { ascending: true })
        .limit(10)
    : { data: [] }

  const age = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : null
  const painPoints = (notes ?? []) as unknown as { pain_level: number; appointment: { starts_at: string } | null }[]

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-zinc-800" style={{ borderBottomColor: `${accent}22` }}>
        <div className="max-w-lg mx-auto px-4 py-5 flex items-center gap-3">
          {org?.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-9 w-9 rounded-lg object-cover" />
          ) : (
            <div className="h-9 w-9 rounded-lg flex items-center justify-center text-sm font-bold"
              style={{ background: `${accent}22`, color: accent }}>
              {org?.name?.slice(0, 2).toUpperCase() ?? 'T'}
            </div>
          )}
          <div>
            <p className="text-xs text-zinc-500">{org?.name}</p>
            <p className="text-sm font-semibold">{patient.name ?? 'Mi portal'}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        {/* Patient summary */}
        <div className="rounded-2xl p-4 border border-zinc-800 space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-widest">Tu información</p>
          <p className="text-xl font-semibold">{patient.name}</p>
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-zinc-400 mt-1">
            {age !== null && <span>{age} años</span>}
            {patient.blood_type && <span>Sangre {patient.blood_type}</span>}
            {patient.allergies && (
              <span className="text-amber-400">⚠ Alergias: {patient.allergies}</span>
            )}
          </div>
        </div>

        {/* Active plan */}
        {activePlan && (
          <div className="rounded-2xl p-4 border border-zinc-800 space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Plan activo</p>
            <p className="font-semibold">{activePlan.title}</p>
            {activePlan.total_sessions && (
              <>
                <div className="flex justify-between text-sm text-zinc-400">
                  <span>{activePlan.sessions_done} sesiones realizadas</span>
                  <span style={{ color: accent }}>
                    {activePlan.total_sessions - activePlan.sessions_done} restantes
                  </span>
                </div>
                <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(100, (activePlan.sessions_done / activePlan.total_sessions) * 100)}%`,
                      background: accent,
                    }}
                  />
                </div>
                <p className="text-xs text-zinc-500">
                  {Math.round((activePlan.sessions_done / activePlan.total_sessions) * 100)}% completado
                  {activePlan.ends_at && ` · Hasta ${format(new Date(activePlan.ends_at), 'd MMM yyyy', { locale: es })}`}
                </p>
              </>
            )}
          </div>
        )}

        {/* Upcoming appointments */}
        <div className="rounded-2xl border border-zinc-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Próximas citas</p>
          </div>
          {!appointments || appointments.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-zinc-500">
              No tienes citas próximas agendadas.
              {org?.whatsapp_number && (
                <div className="mt-3">
                  <a
                    href={`https://wa.me/${org.whatsapp_number.replace(/\D/g, '')}?text=Hola, quiero agendar una cita`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block px-4 py-2 rounded-xl text-sm font-medium text-white"
                    style={{ background: accent }}
                  >
                    Agendar por WhatsApp
                  </a>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-zinc-800">
              {appointments.map(a => {
                const svc = a.service as unknown as { name: string } | null
                const stf = a.staff as unknown as { name: string } | null
                return (
                  <div key={a.id} className="px-4 py-3">
                    <p className="font-medium text-sm capitalize">
                      {format(new Date(a.starts_at), "EEEE d 'de' MMMM", { locale: es })}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: accent }}>
                      {format(new Date(a.starts_at), 'HH:mm')} – {format(new Date((a as any).ends_at), 'HH:mm')}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {svc?.name ?? '—'}{stf?.name ? ` · ${stf.name}` : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Pain evolution */}
        {isMedical && painPoints.length >= 2 && (
          <div className="rounded-2xl border border-zinc-800 p-4 space-y-3">
            <p className="text-xs text-zinc-500 uppercase tracking-widest">Evolución del dolor</p>
            <MiniPainChart points={painPoints} accent={accent} />
            <div className="flex justify-between text-sm">
              <span className="text-zinc-500">Inicio: <span className="text-white font-medium">{painPoints[0].pain_level}/10</span></span>
              <span className="text-zinc-500">Actual: <span className="font-medium" style={{ color: accent }}>{painPoints[painPoints.length - 1].pain_level}/10</span></span>
              {painPoints[0].pain_level > painPoints[painPoints.length - 1].pain_level && (
                <span className="text-emerald-400 font-medium">
                  ↓ {painPoints[0].pain_level - painPoints[painPoints.length - 1].pain_level} pts mejora
                </span>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center pt-2 pb-6">
          <p className="text-xs text-zinc-600">Portal personal de {patient.name} · Turno</p>
          <p className="text-xs text-zinc-700 mt-1">Este link es personal. No lo compartas.</p>
        </div>
      </div>
    </div>
  )
}

function MiniPainChart({ points, accent }: {
  points: { pain_level: number; appointment: { starts_at: string } | null }[]
  accent: string
}) {
  const W = 320, H = 80
  const PAD = { top: 8, right: 8, bottom: 8, left: 8 }
  const cW = W - PAD.left - PAD.right
  const cH = H - PAD.top - PAD.bottom
  const n = points.length

  const xOf = (i: number) => PAD.left + (i / (n - 1)) * cW
  const yOf = (v: number) => PAD.top + cH - (v / 10) * cH

  const linePoints = points.map((p, i) => `${xOf(i)},${yOf(p.pain_level)}`).join(' ')
  const areaPath = [
    `M ${xOf(0)},${yOf(points[0].pain_level)}`,
    ...points.slice(1).map((p, i) => `L ${xOf(i + 1)},${yOf(p.pain_level)}`),
    `L ${xOf(n - 1)},${PAD.top + cH}`,
    `L ${xOf(0)},${PAD.top + cH} Z`,
  ].join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full">
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.3" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#pg)" />
      <polyline points={linePoints} fill="none" stroke={accent} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <circle key={i} cx={xOf(i)} cy={yOf(p.pain_level)} r={3} fill={accent} stroke="#09090b" strokeWidth={1.5} />
      ))}
    </svg>
  )
}
