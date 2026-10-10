'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

export function InstanceForm() {
  const router = useRouter()
  const [instanceId, setInstanceId] = useState('')
  const [token, setToken] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const res = await fetch('/api/admin/instances', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ instanceId, token }),
    })
    const data = await res.json().catch(() => null)
    setLoading(false)
    if (!res.ok) return toast.error(data?.error ?? 'No se pudo agregar')
    toast.success('Instancia agregada a la reserva')
    setInstanceId(''); setToken('')
    router.refresh()
  }

  const input = 'h-9 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary'
  return (
    <form onSubmit={submit} className="rounded-lg border border-border p-4 space-y-3">
      <p className="text-sm font-semibold">Agregar instancia</p>
      <div className="flex flex-wrap gap-2">
        <input className={`${input} w-48`} placeholder="instance123456" value={instanceId} onChange={e => setInstanceId(e.target.value)} required />
        <input className={`${input} flex-1 min-w-[200px]`} placeholder="Token" type="password" autoComplete="off" value={token} onChange={e => setToken(e.target.value)} required />
        <button type="submit" disabled={loading} className="h-9 rounded-md bg-violet-600 px-4 text-sm font-medium text-white disabled:opacity-50">
          {loading ? 'Verificando…' : 'Agregar'}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">Se comprueba con UltraMsg antes de guardarla. El token no se vuelve a mostrar.</p>
    </form>
  )
}
