'use client'

import { useState } from 'react'

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL']
const input = 'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2.5 text-[15px] text-white placeholder:text-white/40 focus:border-yellow-300 focus:outline-none'

export function RegisterForm({ slug, price }: { slug: string; price: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setBusy(true); setError('')
    const f = Object.fromEntries(new FormData(e.currentTarget).entries())
    try {
      const res = await fetch('/api/events/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug, ...f }) })
      const data = await res.json()
      if (!res.ok || !data.url) { setError(data.error ?? 'No se pudo completar la inscripción'); setBusy(false); return }
      window.location.href = data.url
    } catch {
      setError('Sin conexión, intenta de nuevo'); setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-2xl bg-black/25 p-4 md:p-5">
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
        {busy ? 'Abriendo pago…' : `Inscribirme y pagar ${price}`}
      </button>
    </form>
  )
}
