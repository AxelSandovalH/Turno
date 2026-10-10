'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ArrowRight, Sparkles, X } from 'lucide-react'

const KEY = 'qt-setup-nudge-closed'

/** Aviso llamativo en todo el panel mientras al negocio le falte configurar algo; lo lleva al asistente de IA. */
export function SetupNudge({ done, total, next }: { done: number; total: number; next: string }) {
  const pathname = usePathname()
  const [closed, setClosed] = useState(true)   // arranca cerrado para no parpadear mientras se lee el almacenamiento
  useEffect(() => {
    const id = setTimeout(() => { try { setClosed(sessionStorage.getItem(KEY) === '1') } catch { setClosed(false) } }, 0)
    return () => clearTimeout(id)
  }, [])

  if (closed || pathname?.startsWith('/setup')) return null
  const pct = Math.round((done / Math.max(total, 1)) * 100)

  return (
    <div className="relative mb-4 overflow-hidden rounded-2xl p-[1.5px] print:hidden" style={{ background: 'linear-gradient(120deg,#7c3aed,#ec4899,#7c3aed)', backgroundSize: '200% 100%', animation: 'qt-flow 6s linear infinite' }}>
      <style>{`@keyframes qt-flow { to { background-position: 200% 0 } } @keyframes qt-spark { 0%,100% { transform: rotate(0) scale(1) } 50% { transform: rotate(18deg) scale(1.18) } }`}</style>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[14px] bg-card px-4 py-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#ec4899)' }}>
          <Sparkles size={20} style={{ animation: 'qt-spark 2.4s ease-in-out infinite' }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Termina de armar tu negocio con la IA</p>
          <div className="mt-1.5 flex items-center gap-2">
            <div className="h-1.5 w-32 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg,#7c3aed,#ec4899)' }} /></div>
            <span className="text-xs text-muted-foreground">{done} de {total} pasos · siguiente: {next}</span>
          </div>
        </div>
        <Link href="/setup" className="inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-transform hover:scale-[1.03]" style={{ background: 'linear-gradient(135deg,#7c3aed,#c026d3)' }}>
          Continuar con la IA <ArrowRight size={15} />
        </Link>
        <button type="button" aria-label="Ocultar aviso" onClick={() => { try { sessionStorage.setItem(KEY, '1') } catch { /* nada */ } setClosed(true) }} className="text-muted-foreground transition-colors hover:text-foreground"><X size={16} /></button>
      </div>
    </div>
  )
}
