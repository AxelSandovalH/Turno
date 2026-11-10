'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/** Conecta la cuenta de Clip propia de un negocio (cobro de inscripciones a eventos). Las llaves no se vuelven a mostrar. */
export function OrgClipButton({ id, name, connected, live }: { id: string; name: string; connected: boolean; live: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiSecret, setApiSecret] = useState('')

  async function call(body: Record<string, unknown>) {
    setBusy(true)
    const res = await fetch('/api/admin/organizations/clip', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { toast.error(data?.error ?? 'No se pudo guardar'); return false }
    return true
  }

  async function save() {
    if (await call({ apiKey, apiSecret })) {
      toast.success('Clip del negocio conectado')
      setApiKey(''); setApiSecret(''); setOpen(false); router.refresh()
    }
  }
  async function remove() {
    if (!window.confirm(`¿Quitar el Clip de “${name}”? Sus inscripciones volverán a cobrarse por Stripe.`)) return
    if (await call({ remove: true })) { toast.success('Clip quitado'); router.refresh() }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {connected && <span className={`rounded-full px-2 py-0.5 text-xs ${live ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{live ? 'Clip · real' : 'Clip · pruebas'}</span>}
        <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted">{connected ? 'Cambiar' : 'Conectar'}</button>
        {connected && <button type="button" onClick={remove} disabled={busy} className="text-xs text-red-400 hover:underline disabled:opacity-50">Quitar</button>}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Clip · {name}</h3>
            <p className="text-xs text-muted-foreground">Las inscripciones y donaciones de los eventos de este negocio se cobrarán por Clip, directo a su cuenta. Las credenciales se guardan cifradas y no se vuelven a mostrar. No hay que configurar webhook en Clip: se manda en cada cobro.</p>
            <div className="space-y-1">
              <label className="text-xs font-medium">API Key (las de pruebas empiezan con test_)</label>
              <input type="password" autoComplete="off" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-mono" value={apiKey} onChange={e => setApiKey(e.target.value)} />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Clave secreta</label>
              <input type="password" autoComplete="off" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-mono" value={apiSecret} onChange={e => setApiSecret(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-md border border-border px-3 py-1.5 text-sm">Cancelar</button>
              <button type="button" onClick={save} disabled={busy || !apiKey || !apiSecret} className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Validando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
