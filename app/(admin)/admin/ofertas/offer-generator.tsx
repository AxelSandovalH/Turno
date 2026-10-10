'use client'

import { useState } from 'react'

export function OfferGenerator() {
  const [plan, setPlan] = useState<'asistente' | 'agenda' | 'tours' | 'pedidos' | 'menu'>('asistente')
  const [link, setLink] = useState<{ url: string; expiresAt: number } | null>(null)
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)

  async function generate() {
    setLoading(true); setCopied(false)
    const res = await fetch('/api/admin/offer-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    setLoading(false)
    if (res.ok) setLink(await res.json())
    else window.alert('No se pudo generar el enlace.')
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link.url)
    setCopied(true)
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        {([['asistente', 'Agenda + Asistente'], ['agenda', 'Agenda'], ['tours', 'Tours + Asistente'], ['pedidos', 'Pedidos + Asistente'], ['menu', 'Menú y pedidos']] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setPlan(k)}
            className={`px-3 py-2 rounded-md text-sm border ${plan === k ? 'border-violet-500 bg-violet-500/10' : 'border-border text-muted-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>
      <button onClick={generate} disabled={loading} className="px-4 py-2 rounded-md text-sm font-medium bg-violet-600 text-white disabled:opacity-50">
        {loading ? 'Generando…' : 'Generar enlace de 24 horas'}
      </button>
      {link && (
        <div className="rounded-lg border border-border p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Vence el {new Date(link.expiresAt).toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}
          </p>
          <p className="text-sm break-all font-mono">{link.url}</p>
          <button onClick={copy} className="px-3 py-1.5 rounded-md text-sm border border-border">
            {copied ? 'Copiado' : 'Copiar enlace'}
          </button>
        </div>
      )}
    </div>
  )
}
