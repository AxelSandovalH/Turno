import Link from 'next/link'
import { createServiceClient } from '@/lib/supabase/service'
import { FUNNEL_STEPS } from '@/lib/funnel/steps'
import { getProfile } from '@/lib/profiles/registry'

export const dynamic = 'force-dynamic'

const PERIODS = [{ days: 7, label: '7 días' }, { days: 30, label: '30 días' }, { days: 90, label: '90 días' }]
const daysAgo = (d: number) => new Date(Date.now() - d * 86400_000).toISOString()
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null)

export default async function FunnelPage({ searchParams }: { searchParams: Promise<{ dias?: string }> }) {
  const { dias } = await searchParams
  const days = PERIODS.some(p => String(p.days) === dias) ? Number(dias) : 30
  const since = daysAgo(days)

  const db = createServiceClient()
  const [{ data: counts, error }, { data: bySeg }] = await Promise.all([
    db.rpc('funnel_counts', { p_since: since }),
    db.rpc('funnel_by_segment', { p_since: since }),
  ])
  const total: Record<string, number> = {}
  for (const r of (counts ?? []) as { step: string; sessions: number }[]) total[r.step] = Number(r.sessions)

  // Cada paso se compara con el paso del que viene (su "parent"); el % nunca pasa de 100
  const byId = Object.fromEntries(FUNNEL_STEPS.map(s => [s.id, s]))
  const rows = FUNNEL_STEPS.map(s => {
    const parent = s.parent ? byId[s.parent] : null
    const n = total[s.id] ?? 0
    const parentN = parent ? total[parent.id] ?? 0 : 0
    const p = parent ? pct(n, parentN) : null
    return { ...s, n, parentN, fromPrev: p === null ? null : Math.min(100, p), prevLabel: parent?.label }
  })
  // Mayor caída: el paso (fuera de las ramas) con menor % respecto a su paso de origen, con al menos 5 visitantes antes
  const worst = rows.filter(r => !r.branch && r.fromPrev !== null && r.parentN >= 5).sort((a, b) => (a.fromPrev ?? 100) - (b.fromPrev ?? 100))[0]
  const max = Math.max(1, ...rows.map(r => r.n))

  // Giros: cuántos llegaron a cada paso
  const segs: Record<string, Record<string, number>> = {}
  for (const r of (bySeg ?? []) as { step: string; segment: string; sessions: number }[]) (segs[r.segment] ??= {})[r.step] = Number(r.sessions)
  const segRows = Object.entries(segs).sort((a, b) => (b[1].demo_ready ?? 0) - (a[1].demo_ready ?? 0))

  return (
    <div className="max-w-4xl space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold">Embudo</h1>
          <p className="text-sm text-muted-foreground mt-1">Del primer vistazo a la página hasta que la IA configura su negocio. Cada número es de visitantes distintos.</p>
        </div>
        <div className="flex gap-1.5">
          {PERIODS.map(p => (
            <Link key={p.days} href={`/admin/embudo?dias=${p.days}`} className={`rounded-md border px-3 py-1.5 text-xs font-medium ${p.days === days ? 'border-violet-500/60 bg-violet-500/15 text-violet-300' : 'border-border text-muted-foreground hover:text-foreground'}`}>{p.label}</Link>
          ))}
        </div>
      </div>

      {error && <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-500">No se pudo leer el embudo ({error.message}). ¿Corriste la migración 035?</p>}

      {worst && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="font-semibold text-amber-500">Mayor caída:</span> de los que «{(worst.prevLabel ?? '').split(' (')[0].toLowerCase()}», solo {worst.fromPrev}% llegó a «{worst.label.split(' (')[0].toLowerCase()}». Ahí está tu mejor oportunidad.
        </div>
      )}

      <section className="rounded-xl border border-border divide-y divide-border">
        {rows.map(r => (
          <div key={r.id} className={`px-4 py-3 ${r.branch ? 'pl-8 bg-muted/20' : ''}`}>
            <div className="flex items-baseline justify-between gap-4">
              <p className={`text-sm ${r.branch ? 'text-muted-foreground' : 'font-medium'}`}>{r.branch ? '↳ ' : ''}{r.label}</p>
              <div className="flex items-baseline gap-4 text-right">
                {r.fromPrev !== null && <span className={`text-xs tabular-nums ${r === worst ? 'font-semibold text-amber-500' : 'text-muted-foreground'}`}>{r.fromPrev}% de «{(r.prevLabel ?? '').split(' (')[0].toLowerCase()}»</span>}
                <span className="w-14 text-lg font-semibold tabular-nums">{r.n}</span>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(r.n / max) * 100}%`, background: r === worst ? '#f59e0b' : 'linear-gradient(90deg,#7c3aed,#ec4899)' }} /></div>
          </div>
        ))}
      </section>

      {segRows.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold">Por giro</h2>
          <div className="overflow-hidden rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-muted/40 text-xs text-muted-foreground"><th className="px-4 py-2 text-left font-medium">Giro</th><th className="px-4 py-2 text-right font-medium">Vieron su demo</th><th className="px-4 py-2 text-right font-medium">Tocaron publicar</th><th className="px-4 py-2 text-right font-medium">Crearon negocio</th><th className="px-4 py-2 text-right font-medium">Activaron</th></tr></thead>
              <tbody className="divide-y divide-border">
                {segRows.map(([seg, v]) => (
                  <tr key={seg}><td className="px-4 py-2">{getProfile(seg).emoji} {seg === 'sin giro' ? seg : getProfile(seg).displayName}</td>
                    {['demo_ready', 'publish_click', 'org_created', 'subscribed'].map(k => <td key={k} className="px-4 py-2 text-right tabular-nums">{v[k] ?? 0}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="text-xs text-muted-foreground">
        Una sesión es un navegador, no una persona: quien entra desde el celular y luego desde la computadora cuenta dos veces. No se guarda lo que escriben ni datos personales, y tus propias visitas de administrador no cuentan.
      </p>
    </div>
  )
}
