'use client'

import { useState } from 'react'

interface Ev { id: string; slug: string; title: string; price: number; currency: string; capacity: number | null; event_date: string }
interface Reg { id: string; event_id: string; full_name: string; email: string | null; phone: string; birth_date: string | null; shirt_size: string | null; emergency_name: string | null; emergency_phone: string | null; package_name: string | null; status: string; amount: number | null; paid_at: string | null; created_at: string }

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export function InscritosClient({ events, regs, baseUrl }: { events: Ev[]; regs: Reg[]; baseUrl: string }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [onlyPaid, setOnlyPaid] = useState(true)
  const [copied, setCopied] = useState(false)
  const ev = events.find(e => e.id === eventId)
  const all = regs.filter(r => r.event_id === eventId)
  const paid = all.filter(r => r.status === 'paid')
  const rows = onlyPaid ? paid : all
  const total = paid.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const shirts = paid.reduce<Record<string, number>>((m, r) => { const k = r.shirt_size || 'Sin talla'; m[k] = (m[k] ?? 0) + 1; return m }, {})
  const link = ev ? `${baseUrl}/carrera/${ev.slug}` : ''

  function csv() {
    const head = ['Nombre', 'Teléfono', 'Correo', 'Paquete', 'Nacimiento', 'Talla', 'Contacto emergencia', 'Tel. emergencia', 'Estado', 'Monto', 'Pagado']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = rows.map(r => [r.full_name, r.phone, r.email, r.package_name, r.birth_date, r.shirt_size, r.emergency_name, r.emergency_phone, r.status === 'paid' ? 'Pagado' : r.status === 'pending' ? 'Pendiente' : 'Cancelado', r.amount, r.paid_at ?? ''].map(esc).join(','))
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `inscritos-${ev?.slug ?? 'evento'}.csv`; a.click()
  }

  if (!events.length) return <p className="p-6 text-sm text-zinc-500">Aún no hay eventos configurados.</p>

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">Inscritos</h1>
          {events.length > 1 && (
            <select value={eventId} onChange={e => setEventId(e.target.value)} className="mt-1 rounded border px-2 py-1 text-sm">
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          )}
          {events.length === 1 && <p className="text-sm text-zinc-500">{ev?.title}</p>}
        </div>
        <div className="flex gap-2">
          <button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="rounded-lg border px-3 py-2 text-sm">{copied ? '¡Copiado!' : 'Copiar link de inscripción'}</button>
          <button onClick={csv} className="rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white">Descargar Excel (CSV)</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Inscritos pagados</p><p className="text-2xl font-bold">{paid.length}{ev?.capacity ? <span className="text-sm font-normal text-zinc-500"> / {ev.capacity}</span> : null}</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Recaudado</p><p className="text-2xl font-bold">{money(total)}</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Pendientes de pago</p><p className="text-2xl font-bold">{all.filter(r => r.status === 'pending').length}</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Tallas</p><p className="text-sm">{Object.entries(shirts).map(([k, v]) => `${k}: ${v}`).join(' · ') || '—'}</p></div>
      </div>

      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyPaid} onChange={e => setOnlyPaid(e.target.checked)} /> Mostrar solo pagados</label>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900"><tr>{['Nombre', 'Teléfono', 'Correo', 'Paquete', 'Talla', 'Emergencia', 'Estado'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2 font-medium">{r.full_name}</td>
                <td className="px-3 py-2">{r.phone}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.package_name ?? '—'}</td>
                <td className="px-3 py-2">{r.shirt_size ?? '—'}</td>
                <td className="px-3 py-2">{r.emergency_name ? `${r.emergency_name} · ${r.emergency_phone ?? ''}` : '—'}</td>
                <td className="px-3 py-2">{r.status === 'paid' ? '✅ Pagado' : r.status === 'pending' ? '⏳ Pendiente' : 'Cancelado'}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={7} className="px-3 py-6 text-center text-zinc-500">Todavía no hay inscritos.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
