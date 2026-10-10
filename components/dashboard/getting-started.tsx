'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Check, ChevronDown, Copy, X } from 'lucide-react'
import { toast } from 'sonner'
import type { SetupStep } from '@/lib/setup-steps'

interface Props {
  organizationId: string
  steps: SetupStep[]
  shareUrl: string | null
}

// Guía de primeros pasos. Se puede colapsar u ocultar, y desaparece sola al completarse.
export function GettingStarted({ organizationId, steps, shareUrl }: Props) {
  const key = (k: string) => `qt-setup-${k}-${organizationId}`
  const [hydrated, setHydrated] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [shared, setShared] = useState(false)

  // localStorage solo existe en el navegador: se lee después de montar
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(key('dismissed')) === '1')
      setCollapsed(localStorage.getItem(key('collapsed')) === '1')
      setShared(localStorage.getItem(key('shared')) === '1')
    } catch { /* sin almacenamiento: se muestra normal */ }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const remember = (k: string, v: boolean) => { try { localStorage.setItem(key(k), v ? '1' : '0') } catch { /* ignorar */ } }

  const all: (SetupStep & { manual?: boolean })[] = [
    ...steps,
    ...(shareUrl ? [{ id: 'share', title: 'Comparte tu link', desc: 'Ponlo en tu Instagram, WhatsApp y donde te encuentren.', done: shared, manual: true }] : []),
  ]
  const doneCount = all.filter(s => s.done).length
  if (!hydrated || dismissed || all.length === 0 || doneCount === all.length) return null

  async function copyLink() {
    if (!shareUrl) return
    try { await navigator.clipboard.writeText(shareUrl) } catch { /* el toast sigue siendo útil */ }
    toast.success('Link copiado')
    setShared(true); remember('shared', true)
  }

  const pct = Math.round((doneCount / all.length) * 100)

  return (
    <div className="rounded-xl border border-border bg-card print:hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          onClick={() => { setCollapsed(c => { remember('collapsed', !c); return !c }) }}
          className="flex flex-1 min-w-0 items-center gap-3 text-left"
          aria-expanded={!collapsed}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-foreground">Primeros pasos · {doneCount} de {all.length}</p>
            <div className="mt-1.5 h-1 w-full max-w-[220px] rounded-full bg-muted overflow-hidden">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${collapsed ? '-rotate-90' : ''}`} />
        </button>
        <button
          type="button"
          aria-label="Ocultar primeros pasos"
          title="Ocultar"
          onClick={() => { setDismissed(true); remember('dismissed', true) }}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {!collapsed && (
        <ul className="border-t border-border divide-y divide-border">
          {all.map(step => (
            <li key={step.id} className="flex items-center gap-3 px-4 py-3">
              <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${step.done ? 'border-primary bg-primary text-primary-foreground' : 'border-border'}`}>
                {step.done && <Check className="h-3 w-3" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-[13px] font-medium ${step.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>{step.title}</p>
                {!step.done && <p className="text-[12px] text-muted-foreground">{step.desc}</p>}
              </div>
              {!step.done && step.manual && (
                <button type="button" onClick={copyLink} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-[12px] font-medium hover:bg-muted">
                  <Copy className="h-3.5 w-3.5" /> Copiar link
                </button>
              )}
              {!step.done && !step.manual && step.href && (
                <Link href={step.href} className="shrink-0 rounded-lg bg-primary px-3 py-1.5 text-[12px] font-medium text-primary-foreground hover:opacity-90">
                  {step.cta ?? 'Ir'}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
