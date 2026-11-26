import Link from 'next/link'
import { redirect } from 'next/navigation'
import { addDays, format, parseISO, startOfWeek } from 'date-fns'
import { es } from 'date-fns/locale'
import { fromZonedTime, toZonedTime } from 'date-fns-tz'
import { requireOrganization } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { hasCapability } from '@/lib/profiles/registry'
import { deadlineRisk } from '@/lib/deadline'

interface Row {
  id: string; staff_id: string; starts_at: string; ends_at: string; status: string; deadline_at: string | null
  customer: { name: string | null } | null; service: { name: string } | null; property: { name: string; zone: string | null } | null
}

/** Agenda de la semana: una fila por persona de limpieza y un cuadro por día, con alertas de hora límite. */
export default async function WeekPage({ searchParams }: { searchParams: Promise<{ start?: string }> }) {
  const { organization } = await requireOrganization()
  if (!hasCapability(organization.business_type, 'properties')) redirect('/appointments')
  const tz = organization.timezone || 'America/Mexico_City'
  const { start } = await searchParams
  const base = start && /^\d{4}-\d{2}-\d{2}$/.test(start) ? parseISO(`${start}T12:00:00`) : toZonedTime(new Date(), tz)
  const monday = startOfWeek(base, { weekStartsOn: 1 })
  const days = Array.from({ length: 7 }, (_, i) => format(addDays(monday, i), 'yyyy-MM-dd'))

  const db = createServiceClient()
  const [{ data: staff }, { data: rows, error }] = await Promise.all([
    db.from('staff').select('id, name').eq('organization_id', organization.id).eq('is_active', true).order('name'),
    db.from('appointments')
      .select('id, staff_id, starts_at, ends_at, status, deadline_at, customer:customers(name), service:services(name), property:properties(name, zone)')
      .eq('organization_id', organization.id).neq('status', 'cancelled')
      .gte('starts_at', fromZonedTime(`${days[0]}T00:00:00`, tz).toISOString())
      .lte('starts_at', fromZonedTime(`${days[6]}T23:59:59`, tz).toISOString())
      .order('starts_at'),
  ])
  const list = (rows ?? []) as unknown as Row[]
  const local = (iso: string) => toZonedTime(new Date(iso), tz)
  const hm = (iso: string) => format(local(iso), 'HH:mm')
  const today = format(toZonedTime(new Date(), tz), 'yyyy-MM-dd')
  const alerts = list.filter(a => a.status === 'confirmed' && deadlineRisk(a.ends_at, a.deadline_at))
  const link = (d: Date) => `/semana?start=${format(d, 'yyyy-MM-dd')}`

  return (
    <div data-wide className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight">Semana por persona</h1>
          <p className="text-[13px] text-muted-foreground">{format(monday, "d 'de' MMMM", { locale: es })} al {format(addDays(monday, 6), "d 'de' MMMM yyyy", { locale: es })}</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href={link(addDays(monday, -7))} className="rounded-lg border border-border px-3 py-1.5">‹ Anterior</Link>
          <Link href="/semana" className="rounded-lg border border-border px-3 py-1.5">Esta semana</Link>
          <Link href={link(addDays(monday, 7))} className="rounded-lg border border-border px-3 py-1.5">Siguiente ›</Link>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">No se pudo cargar la agenda.</p>}

      {alerts.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">Entregas apretadas esta semana: {alerts.length}</p>
          <ul className="mt-1 space-y-0.5 text-muted-foreground">
            {alerts.map(a => (
              <li key={a.id}>{format(local(a.starts_at), 'EEE d', { locale: es })} · {a.property?.name ?? 'Sin propiedad'} · termina {hm(a.ends_at)}, entrega {hm(a.deadline_at!)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full min-w-[980px] table-fixed text-xs">
          <thead>
            <tr className="border-b border-border">
              <th className="w-32 p-2 text-left font-medium text-muted-foreground">Persona</th>
              {days.map(d => <th key={d} className={`p-2 text-left font-medium capitalize ${d === today ? 'text-primary' : 'text-muted-foreground'}`}>{format(parseISO(`${d}T12:00:00`), 'EEE d', { locale: es })}</th>)}
            </tr>
          </thead>
          <tbody>
            {(staff ?? []).map(s => (
              <tr key={s.id} className="border-b border-border align-top last:border-0">
                <td className="p-2 text-sm font-medium">{s.name}</td>
                {days.map(d => (
                  <td key={d} className="space-y-1.5 border-l border-border p-1.5">
                    {list.filter(a => a.staff_id === s.id && format(local(a.starts_at), 'yyyy-MM-dd') === d).map(a => {
                      const risk = a.status === 'confirmed' ? deadlineRisk(a.ends_at, a.deadline_at) : null
                      return (
                        <div key={a.id} className={`rounded-md border p-1.5 ${risk === 'late' ? 'border-red-500/60 bg-red-500/10' : risk === 'tight' ? 'border-amber-500/60 bg-amber-500/10' : 'border-border bg-muted/40'} ${a.status === 'completed' ? 'opacity-60' : ''}`}>
                          <p className="font-semibold">{hm(a.starts_at)}–{hm(a.ends_at)}</p>
                          <p className="truncate">{a.property?.name ?? a.customer?.name ?? '—'}</p>
                          {a.property?.zone && <p className="truncate text-muted-foreground">{a.property.zone}</p>}
                          <p className="truncate text-muted-foreground">{a.service?.name}</p>
                          {a.deadline_at && <p className={risk ? 'font-medium' : 'text-muted-foreground'}>Entrega {hm(a.deadline_at)}{risk === 'late' ? ' · no llega' : risk === 'tight' ? ' · margen corto' : ''}</p>}
                        </div>
                      )
                    })}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
