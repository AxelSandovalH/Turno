'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

/** Conecta la cuenta de Stripe propia de un negocio. Las llaves se escriben aquí y no se vuelven a mostrar. */
export function OrgStripeButton({ id, name, connected, live }: { id: string; name: string; connected: boolean; live: boolean }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [secretKey, setSecretKey] = useState('')
  const [webhookSecret, setWebhookSecret] = useState('')
  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.quickturno.app'}/api/stripe-webhook/org/${id}`

  async function call(body: Record<string, unknown>) {
    setBusy(true)
    const res = await fetch('/api/admin/organizations/stripe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
    const data = await res.json().catch(() => ({}))
    setBusy(false)
    if (!res.ok) { toast.error(data?.error ?? 'No se pudo guardar'); return false }
    return true
  }

  async function save() {
    if (await call({ secretKey, webhookSecret })) {
      toast.success('Stripe del negocio conectado')
      setSecretKey(''); setWebhookSecret(''); setOpen(false); router.refresh()
    }
  }
  async function remove() {
    if (!window.confirm(`¿Quitar el Stripe propio de “${name}”? Sus cobros volverán a pasar por la cuenta de la plataforma.`)) return
    if (await call({ remove: true })) { toast.success('Stripe propio quitado'); router.refresh() }
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {connected && <span className={`rounded-full px-2 py-0.5 text-xs ${live ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>{live ? 'Propio · real' : 'Propio · pruebas'}</span>}
        <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-border px-2 py-0.5 text-xs font-medium transition-colors hover:bg-muted">{connected ? 'Cambiar' : 'Conectar'}</button>
        {connected && <button type="button" onClick={remove} disabled={busy} className="text-xs text-red-400 hover:underline disabled:opacity-50">Quitar</button>}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setOpen(false)}>
          <div className="w-full max-w-lg rounded-xl border border-border bg-background p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold">Stripe propio · {name}</h3>
            <p className="text-xs text-muted-foreground">Los cobros de pedidos y anticipos de este negocio irán directo a su cuenta de Stripe. Las llaves se guardan cifradas y no se vuelven a mostrar. La suscripción de QuickTurno sigue por la cuenta de la plataforma.</p>
            <div className="space-y-1">
              <label className="text-xs font-medium">Llave secreta (sk_live_… o sk_test_…)</label>
              <input type="password" autoComplete="off" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-mono" value={secretKey} onChange={e => setSecretKey(e.target.value)} />
            </div>
            <div className="rounded-md bg-muted/40 p-3 text-xs space-y-1">
              <p className="font-medium">En el Stripe de ese negocio crea un webhook con:</p>
              <p>URL: <span className="font-mono break-all select-all">{webhookUrl}</span></p>
              <p>Evento: <span className="font-mono">checkout.session.completed</span></p>
              <p>Después copia su secreto de firma (whsec_…) aquí abajo.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">Secreto de firma del webhook (whsec_…)</label>
              <input type="password" autoComplete="off" className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm font-mono" value={webhookSecret} onChange={e => setWebhookSecret(e.target.value)} />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-md border border-border px-3 py-1.5 text-sm">Cancelar</button>
              <button type="button" onClick={save} disabled={busy || !secretKey || !webhookSecret} className="rounded-md bg-violet-600 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">{busy ? 'Validando…' : 'Guardar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
