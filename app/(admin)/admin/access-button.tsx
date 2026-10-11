'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/** Da o quita acceso manual a un negocio sin cobro (pruebas y cortesías). */
export function AccessButton({ id, name, status, managedByStripe }: { id: string; name: string; status: string; managedByStripe: boolean }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  if (managedByStripe) return <span className="text-xs text-muted-foreground">Stripe</span>
  const active = status === 'active'

  async function run() {
    const action = active ? 'revoke' : 'grant'
    const msg = active ? `¿Quitar el acceso de “${name}”? Volverá a pedir pago.` : `¿Activar “${name}” sin cobro? Queda activo con el asistente de WhatsApp.`
    if (!window.confirm(msg)) return
    setBusy(true)
    const res = await fetch('/api/admin/organizations/access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, action }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) return toast.error(data?.error ?? 'No se pudo cambiar')
    toast.success(active ? 'Acceso quitado' : 'Negocio activado sin cobro')
    router.refresh()
  }

  return (
    <button type="button" onClick={run} disabled={busy} className={`rounded-md border px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${active ? 'border-border text-muted-foreground hover:text-foreground' : 'border-violet-500/50 bg-violet-500/10 text-violet-300 hover:bg-violet-500/20'}`}>
      {busy ? '…' : active ? 'Quitar acceso' : 'Activar sin pago'}
    </button>
  )
}
