'use client'

import { useState } from 'react'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const input = 'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-[15px] text-white placeholder:text-white/40 focus:border-yellow-300 focus:outline-none'

export interface PkgOption { name: string; price: number; label: string; includes?: string[] }

export function RegisterForm({ slug, packages }: { slug: string; packages: PkgOption[] }) {
  const [pkg, setPkg] = useState(packages[0].name)
  const chosen = packages.find(p => p.name === pkg) ?? packages[0]
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true); setError('')
    const f = Object.fromEntries(new FormData(e.currentTarget).entries())
    try {
      const res = await fetch('/api/events/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, ...f, package: chosen.name }) })
      const data = await res.json()
      if (!res.ok || !data.url) { setError(data.error ?? 'No se pudo completar la inscripción'); setBusy(false); return }
      window.location.href = data.url
    } catch {
      setError('Sin conexión, intenta de nuevo'); setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-black/25 p-4 md:p-5">
      <div className="grid gap-2">
        {packages.map(p => (
          <label key={p.name} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${pkg === p.name ? 'border-yellow-300 bg-yellow-300/10' : 'border-white/15 hover:border-white/40'}`}>
            <input type="radio" name="pkg" checked={pkg === p.name} onChange={() => setPkg(p.name)} className="mt-1 accent-yellow-300" />
            <span className="flex-1">
              <span className="flex items-baseline justify-between gap-2"><b>{p.name}</b><b className="text-yellow-300">{p.label}</b></span>
              {!!p.includes?.length && <span className="mt-1 block text-xs text-white/60">{p.includes.join(' · ')}</span>}
            </span>
          </label>
        ))}
      </div>
      <input name="full_name" required placeholder="Nombre completo" autoComplete="name" className={input} />
      <div className="grid grid-cols-2 gap-3">
        <input name="phone" required type="tel" inputMode="tel" placeholder="Teléfono (WhatsApp)" autoComplete="tel" className={input} />
        <input name="email" required type="email" placeholder="Correo" autoComplete="email" className={input} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs text-white/60">Fecha de nacimiento
          <input name="birth_date" type="date" className={`${input} mt-1`} />
        </label>
        <label className="text-xs text-white/60">Talla de playera
          <select name="shirt_size" defaultValue="" className={`${input} mt-1`}>
            <option value="" className="text-black">—</option>
            {SIZES.map(s => <option key={s} value={s} className="text-black">{s}</option>)}
          </select>
        </label>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <input name="emergency_name" placeholder="Contacto de emergencia" className={input} />
        <input name="emergency_phone" type="tel" placeholder="Tel. de emergencia" className={input} />
      </div>
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button disabled={busy} className="w-full rounded-xl bg-yellow-400 py-3 text-base font-bold text-green-950 transition hover:bg-yellow-300 disabled:opacity-60">
        {busy ? 'Abriendo pago…' : `Inscribirme y pagar ${chosen.label}`}
      </button>
    </form>
  )
}
