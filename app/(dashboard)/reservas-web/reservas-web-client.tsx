'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface Row {
  id: string; source: string; service_name: string; customer_name: string | null; customer_phone: string | null; customer_email: string | null
  booking_date: string | null; booking_time: string | null; location: string | null; notes: string | null; currency: string
  paid_amount: number | string; total_amount: number | string | null; stripe_url: string | null; status: string; created_at: string
}
const LABEL: Record<string, string> = { pending: 'Pendiente de agendar', scheduled: 'Agendada', done: 'Atendida', cancelled: 'Cancelada' }
const TONE: Record<string, string> = { pending: 'bg-amber-500/15 text-amber-600', scheduled: 'bg-blue-500/15 text-blue-600', done: 'bg-emerald-500/15 text-emerald-600', cancelled: 'bg-red-500/15 text-red-500' }

export function ReservasWebClient({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<'open' | 'all'>('open')
  const [busy, setBusy] = useState<string | null>(null)
  const list = rows.filter(r => filter === 'all' || r.status === 'pending' || r.status === 'scheduled')

  async function setStatus(id: string, status: string) {
    setBusy(id)
    const res = await fetch('/api/web-bookings/status', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, status }) })
    setBusy(null)
    if (!res.ok) { toast.error('No se pudo actualizar'); return }
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2 text-sm">
        {(['open', 'all'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-full border px-3 py-1 ${filter === f ? 'bg-violet-600 text-white' : ''}`}>{f === 'open' ? 'Por atender' : 'Todas'}</button>
        ))}
      </div>
      {!list.length && <p className="text-sm text-muted-foreground">No hay reservas web.</p>}
      {list.map(r => {
        const m = (n: number | string) => `$${Number(n).toFixed(2)} ${r.currency.toUpperCase()}`
        const when = r.booking_date ? `${r.booking_date}${r.booking_time ? ` · ${r.booking_time === 'ASAP' ? 'lo antes posible' : r.booking_time}` : ''}` : (r.booking_time === 'ASAP' ? 'Lo antes posible' : 'Sin fecha')
        const d = r.customer_phone
        return (
          <div key={r.id} className="space-y-2 rounded-xl border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-semibold">{r.service_name}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs ${TONE[r.status] ?? ''}`}>{LABEL[r.status] ?? r.status}</span>
              <span className="ml-auto text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString('es-MX')}</span>
            </div>
            <div className="text-sm">{r.customer_name || 'Sin nombre'} · {when}{r.location ? ` · ${r.location}` : ''}</div>
            {r.notes && <div className="text-xs text-muted-foreground">{r.notes}</div>}
            <div className="text-sm">Anticipo {m(r.paid_amount)}{r.total_amount != null && Number(r.total_amount) > Number(r.paid_amount) ? ` · saldo ${m(Number(r.total_amount) - Number(r.paid_amount))}` : ''}</div>
            <div className="flex flex-wrap gap-2 text-sm">
              {d && <a href={`tel:+${d}`} className="rounded-lg border px-3 py-1.5">Llamar</a>}
              {d && <a href={`https://wa.me/${d}`} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5">WhatsApp</a>}
              {r.customer_email && <a href={`mailto:${r.customer_email}`} className="rounded-lg border px-3 py-1.5">Correo</a>}
              {r.stripe_url && <a href={r.stripe_url} target="_blank" rel="noreferrer" className="rounded-lg border px-3 py-1.5">Stripe ↗</a>}
              <span className="flex-1" />
              {r.status === 'pending' && <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'scheduled')} className="rounded-lg bg-violet-600 px-3 py-1.5 text-white disabled:opacity-50">Marcar agendada</button>}
              {r.status === 'scheduled' && <button disabled={busy === r.id} onClick={() => setStatus(r.id, 'done')} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-white disabled:opacity-50">Marcar atendida</button>}
              {(r.status === 'pending' || r.status === 'scheduled') && <button disabled={busy === r.id} onClick={() => { if (confirm('¿Cancelar esta reserva? El reembolso se hace en Stripe.')) setStatus(r.id, 'cancelled') }} className="rounded-lg border px-3 py-1.5 text-red-500 disabled:opacity-50">Cancelar</button>}
            </div>
          </div>
        )
      })}
    </div>
  )
}
