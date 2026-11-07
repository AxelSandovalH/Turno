'use client'

import { useState } from 'react'

interface Ev { id: string; slug: string; title: string; price: number; currency: string; capacity: number | null; event_date: string }
interface Reg { id: string; event_id: string; full_name: string; email: string | null; phone: string; birth_date: string | null; shirt_size: string | null; emergency_name: string | null; emergency_phone: string | null; package_name: string | null; kind: string; donation_amount: number | null; status: string; amount: number | null; paid_at: string | null; created_at: string }

const money = (n: number) => n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 })

export function InscritosClient({ events, regs, baseUrl }: { events: Ev[]; regs: Reg[]; baseUrl: string }) {
  const [eventId, setEventId] = useState(events[0]?.id ?? '')
  const [onlyPaid, setOnlyPaid] = useState(true)
  const [copied, setCopied] = useState(false)
  const ev = events.find(e => e.id === eventId)
  const all = regs.filter(r => r.event_id === eventId)
  const paid = all.filter(r => r.status === 'paid')
  const runners = paid.filter(r => r.kind !== 'donation')
  const donors = paid.filter(r => r.kind === 'donation')
  const donated = paid.reduce((s, r) => s + Number(r.donation_amount ?? 0), 0)
  const rows = onlyPaid ? paid : all
  const total = paid.reduce((s, r) => s + Number(r.amount ?? 0), 0)
  const link = ev ? `${baseUrl}/carrera/${ev.slug}` : ''

  function csv() {
    const head = ['Tipo', 'Nombre', 'Teléfono', 'Correo', 'Paquete', 'Donación', 'Nacimiento', 'Contacto emergencia', 'Tel. emergencia', 'Estado', 'Monto', 'Pagado']
    const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const lines = rows.map(r => [r.kind === 'donation' ? 'Donación' : 'Corredor', r.full_name, r.phone, r.email, r.package_name, r.donation_amount, r.birth_date, r.emergency_name, r.emergency_phone, r.status === 'paid' ? 'Pagado' : r.status === 'pending' ? 'Pendiente' : 'Cancelado', r.amount, r.paid_at ?? ''].map(esc).join(','))
    const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `inscritos-${ev?.slug ?? 'evento'}.csv`; a.click()
  }

  if (!events.length) return <p className="p-6 text-sm text-zinc-500">Aún no hay eventos configurados.</p>

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-4 md:p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-bold">Inscritos</h1>
          {events.length > 1 && (
            <select value={eventId} onChange={e => setEventId(e.target.value)} className="mt-1 rounded border px-2 py-1 text-sm">
              {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          )}
          {events.length === 1 && <p className="text-sm text-zinc-500">{ev?.title}</p>}
        </div>
        <div className="grid grid-cols-2 gap-2 md:flex">
          <button onClick={() => { navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 1500) }} className="rounded-lg border px-3 py-2.5 text-sm">{copied ? '¡Copiado!' : 'Copiar link'}</button>
          <button onClick={csv} className="rounded-lg bg-green-600 px-3 py-2.5 text-sm font-medium text-white">Descargar Excel</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Corredores pagados</p><p className="text-2xl font-bold">{runners.length}{ev?.capacity ? <span className="text-sm font-normal text-zinc-500"> / {ev.capacity}</span> : null}</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Recaudado</p><p className="text-2xl font-bold">{money(total)}</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Donaciones</p><p className="text-2xl font-bold">{money(donated)}</p><p className="text-xs text-zinc-500">{donors.length} donantes</p></div>
        <div className="rounded-xl border p-4"><p className="text-xs text-zinc-500">Pendientes de pago</p><p className="text-2xl font-bold">{all.filter(r => r.status === 'pending').length}</p></div>
      </div>

      <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={onlyPaid} onChange={e => setOnlyPaid(e.target.checked)} /> Mostrar solo pagados</label>

      {/* Celular: una tarjeta por persona */}
      <div className="space-y-2.5 md:hidden">
        {rows.map(r => {
          const extra = Number(r.donation_amount) > 0 && r.kind !== 'donation' ? ` + ${money(Number(r.donation_amount))}` : ''
          const wa = r.phone.replace(/\D/g, '')
          return (
            <div key={r.id} className="rounded-xl border p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{r.full_name}</p>
                  <p className="text-xs text-zinc-500">{r.kind === 'donation' ? '💛 Donación' : 'Corredor'} · {r.package_name ?? '—'}{extra}</p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${r.status === 'paid' ? 'bg-green-500/15 text-green-600' : r.status === 'pending' ? 'bg-amber-500/15 text-amber-600' : 'bg-zinc-500/15 text-zinc-500'}`}>{r.status === 'paid' ? 'Pagado' : r.status === 'pending' ? 'Pendiente' : 'Cancelado'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <a href={`tel:${r.phone}`} className="truncate rounded-lg bg-zinc-500/10 px-3 py-2 text-center text-sm">📞 {r.phone}</a>
                <a href={`https://wa.me/${wa.length === 10 ? '52' + wa : wa}`} target="_blank" rel="noreferrer" className="rounded-lg bg-green-500/10 px-3 py-2 text-center text-sm text-green-600">WhatsApp</a>
              </div>
              {r.email && <p className="mt-2 truncate text-xs text-zinc-500">✉️ {r.email}</p>}
              {r.emergency_name && <p className="mt-1 text-xs text-zinc-500">🚑 {r.emergency_name} · {r.emergency_phone ?? ''}</p>}
            </div>
          )
        })}
        {!rows.length && <p className="rounded-xl border px-3 py-8 text-center text-sm text-zinc-500">Todavía no hay inscritos.</p>}
      </div>

      <div className="hidden overflow-x-auto rounded-xl border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-50 text-xs uppercase text-zinc-500 dark:bg-zinc-900"><tr>{['Tipo', 'Nombre', 'Teléfono', 'Correo', 'Paquete', 'Emergencia', 'Estado'].map(h => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.kind === 'donation' ? '💛 Donación' : 'Corredor'}</td>
                <td className="px-3 py-2 font-medium">{r.full_name}</td>
                <td className="px-3 py-2">{r.phone}</td>
                <td className="px-3 py-2">{r.email}</td>
                <td className="px-3 py-2">{r.package_name ?? '—'}{Number(r.donation_amount) > 0 && r.kind !== 'donation' ? ` + ${money(Number(r.donation_amount))}` : ''}</td>
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
