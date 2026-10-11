'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/** Muestra la instancia de WhatsApp de un negocio y permite quitársela (queda libre en la reserva). */
export function ReleaseLineButton({ id, name, instance }: { id: string; name: string; instance: string | null }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (!instance) return <span className="text-xs text-muted-foreground">—</span>

  async function run() {
    if (!window.confirm(`¿Quitarle la instancia ${instance} a “${name}”? Se cierra la sesión de WhatsApp de esa línea y vuelve a la reserva como libre.`)) return
    setBusy(true)
    const res = await fetch('/api/admin/organizations/release-line', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error(data?.error ?? 'No se pudo quitar la instancia')
    toast.success('Instancia liberada: ya está libre en la reserva')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-xs text-muted-foreground">{instance}</span>
      <button type="button" onClick={run} disabled={busy} className="rounded-md border border-red-500/40 px-2 py-0.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50">{busy ? '…' : 'Quitar'}</button>
    </div>
  )
}
