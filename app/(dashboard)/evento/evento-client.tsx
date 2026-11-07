'use client'

import { useState } from 'react'
import { toast } from 'sonner'

interface Pkg { name: string; price: number | string; kind?: 'race' | 'donation'; includes?: string[] }
interface Ev {
  id: string; slug: string; title: string; subtitle: string | null; organizer: string | null; description: string | null
  location: string | null; event_date: string; capacity: number | null; is_open: boolean; packages: unknown
}

// Fecha y hora en la zona de México para el selector (datetime-local)
const toLocalInput = (iso: string) => {
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Mexico_City', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
  return parts.replace(' ', 'T')
}
const fromLocalInput = (v: string) => new Date(`${v}:00-06:00`).toISOString()

const field = 'w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-violet-500/40'
const label = 'mb-1 block text-xs font-medium text-muted-foreground'

function Editor({ ev, baseUrl }: { ev: Ev; baseUrl: string }) {
  const initial = (Array.isArray(ev.packages) ? ev.packages : []) as Pkg[]
  const [f, setF] = useState({
    title: ev.title, subtitle: ev.subtitle ?? '', organizer: ev.organizer ?? '', description: ev.description ?? '',
    location: ev.location ?? '', when: toLocalInput(ev.event_date), capacity: ev.capacity ? String(ev.capacity) : '', is_open: ev.is_open,
  })
  const [pk, setPk] = useState<Pkg[]>(initial.map(p => ({ ...p, kind: p.kind === 'donation' ? 'donation' : 'race', includes: p.includes ?? [] })))
  const [saving, setSaving] = useState(false)

  const upd = (i: number, patch: Partial<Pkg>) => setPk(a => a.map((p, k) => (k === i ? { ...p, ...patch } : p)))
  const move = (i: number, d: number) => setPk(a => { const b = [...a], j = i + d; if (j < 0 || j >= b.length) return a; [b[i], b[j]] = [b[j], b[i]]; return b })

  async function save() {
    setSaving(true)
    const res = await fetch('/api/events/manage', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id: ev.id, ...f, event_date: fromLocalInput(f.when), packages: pk }),
    })
    const data = await res.json().catch(() => ({}))
    setSaving(false)
    if (!res.ok) { toast.error(data.error ?? 'No se pudo guardar'); return }
    toast.success('Guardado. Tu página ya está actualizada')
  }

  const url = `${baseUrl}/carrera/${ev.slug}`
  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Datos del evento</h2>
          <a href={url} target="_blank" rel="noreferrer" className="text-xs text-violet-500 hover:underline">Ver mi página ↗</a>
        </div>
        <div><label className={label}>Nombre</label><input className={field} value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /></div>
        <div><label className={label}>Frase debajo del nombre</label><input className={field} value={f.subtitle} onChange={e => setF({ ...f, subtitle: e.target.value })} placeholder="Ej. Un día para donar · UDEC" /></div>
        <div><label className={label}>Organiza</label><input className={field} value={f.organizer} onChange={e => setF({ ...f, organizer: e.target.value })} /></div>
        <div><label className={label}>Descripción</label><textarea className={field} rows={3} value={f.description} onChange={e => setF({ ...f, description: e.target.value })} /></div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label className={label}>Fecha y hora de salida</label><input type="datetime-local" className={field} value={f.when} onChange={e => setF({ ...f, when: e.target.value })} /></div>
          <div><label className={label}>Cupo de corredores (vacío = sin límite)</label><input inputMode="numeric" className={field} value={f.capacity} onChange={e => setF({ ...f, capacity: e.target.value.replace(/\D/g, '') })} /></div>
        </div>
        <div><label className={label}>Lugar</label><input className={field} value={f.location} onChange={e => setF({ ...f, location: e.target.value })} /></div>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_open} onChange={e => setF({ ...f, is_open: e.target.checked })} />Inscripciones y donaciones abiertas</label>
      </section>

      <section className="space-y-4 rounded-xl border p-5">
        <div>
          <h2 className="text-sm font-semibold">Paquetes</h2>
          <p className="text-xs text-muted-foreground">Cada línea de “Incluye” aparece como un punto en el paquete. Los de tipo donación no ocupan cupo de corredor.</p>
        </div>
        {pk.map((p, i) => (
          <div key={i} className="space-y-3 rounded-lg border p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_120px_150px]">
              <div><label className={label}>Nombre</label><input className={field} value={p.name} onChange={e => upd(i, { name: e.target.value })} /></div>
              <div><label className={label}>Precio (MXN)</label><input inputMode="decimal" className={field} value={p.price} onChange={e => upd(i, { price: e.target.value.replace(/[^\d.]/g, '') })} /></div>
              <div><label className={label}>Tipo</label>
                <select className={field} value={p.kind} onChange={e => upd(i, { kind: e.target.value as 'race' | 'donation' })}>
                  <option value="race">Carrera</option><option value="donation">Donación</option>
                </select>
              </div>
            </div>
            <div>
              <label className={label}>Incluye (una línea por cosa)</label>
              <textarea className={field} rows={3} value={(p.includes ?? []).join('\n')} onChange={e => upd(i, { includes: e.target.value.split('\n') })} placeholder={'Medalla de finalista\nHidratación'} />
            </div>
            <div className="flex gap-2 text-xs">
              <button type="button" onClick={() => move(i, -1)} className="rounded-md border px-2 py-1">↑ Subir</button>
              <button type="button" onClick={() => move(i, 1)} className="rounded-md border px-2 py-1">↓ Bajar</button>
              <button type="button" onClick={() => { if (confirm(`¿Quitar el paquete “${p.name || 'sin nombre'}”?`)) setPk(a => a.filter((_, k) => k !== i)) }} className="ml-auto rounded-md border px-2 py-1 text-red-500">Quitar</button>
            </div>
          </div>
        ))}
        <button type="button" onClick={() => setPk(a => [...a, { name: '', price: '', kind: 'race', includes: [] }])} className="rounded-lg border border-dashed px-4 py-2 text-sm">+ Agregar paquete</button>
      </section>

      <button onClick={save} disabled={saving} className="rounded-lg bg-violet-600 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? 'Guardando…' : 'Guardar cambios'}</button>
    </div>
  )
}

export function EventoClient({ events, baseUrl }: { events: Ev[]; baseUrl: string }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">Aún no hay un evento creado.</p>
  return <>{events.map(e => <Editor key={e.id} ev={e} baseUrl={baseUrl} />)}</>
}
