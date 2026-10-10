'use client'

import { useEffect, useState } from 'react'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { TypedText } from './motion'

const LINES = [
  'Leyendo tu negocio…',
  'Eligiendo servicios y precios…',
  'Armando tu link público…',
  'Preparando tu sistema…',
  'Escribiendo tu WhatsApp…',
]

/** Pantalla de "la IA está trabajando": el logo de QuickTurno y una línea de texto que se escribe y se borra. */
export function GeneratingStage({ isDay, accent = '#7c3aed' }: { isDay: boolean; accent?: string }) {
  const [i, setI] = useState(0)
  const [erasing, setErasing] = useState(false)

  // Cada línea se escribe, se sostiene un momento y se borra antes de pasar a la siguiente
  useEffect(() => {
    if (!erasing) return
    const id = setTimeout(() => { setErasing(false); setI(v => (v + 1) % LINES.length) }, 220)
    return () => clearTimeout(id)
  }, [erasing])

  return (
    <div className="flex min-h-[330px] flex-col items-center justify-center gap-7 py-8" role="status" aria-live="polite" style={{ animation: 'qt-pop .4s ease-out both' }}>
      <div className="relative flex h-44 w-44 items-center justify-center">
        <span className="qt-anim absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${accent}55, transparent 68%)`, animation: 'qt-glow 2.4s ease-in-out infinite' }} />
        <span className="qt-anim absolute inset-2 rounded-full border border-dashed" style={{ borderColor: `${accent}66`, animation: 'qt-orbit 9s linear infinite' }} />
        <span className="qt-anim absolute inset-2" style={{ animation: 'qt-orbit 3.2s linear infinite' }}>
          <span className="absolute -top-1 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rounded-full" style={{ background: accent, boxShadow: `0 0 12px ${accent}` }} />
        </span>
        <span className="qt-anim relative" style={{ animation: 'qt-pulse 2s ease-in-out infinite' }}>
          <TurnoLogo height={78} variant={isDay ? 'black' : 'dark'} />
        </span>
      </div>

      <p className="h-6 text-center text-sm sm:text-base" style={{ color: isDay ? '#444' : '#cfcfcf' }}>
        {erasing
          ? <span style={{ opacity: .35, transition: 'opacity .3s' }}>{LINES[i]}</span>
          : <TypedText key={i} text={LINES[i]} speed={14} caret onDone={() => setTimeout(() => setErasing(true), 450)} />}
      </p>

      <div className="relative h-1 w-48 overflow-hidden rounded-full" style={{ background: isDay ? '#e5e2dc' : '#222' }}>
        <span className="qt-anim absolute inset-y-0 left-0 w-1/3 rounded-full" style={{ background: accent, animation: 'qt-slide 1.4s ease-in-out infinite' }} />
      </div>
    </div>
  )
}

/** Capa sobre las vistas mientras la IA aplica un cambio: el logo de QuickTurno trabajando. */
export function RefineOverlay({ isDay, accent = '#7c3aed' }: { isDay: boolean; accent?: string }) {
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 rounded-2xl backdrop-blur-[2px]" style={{ background: isDay ? 'rgba(245,244,240,.72)' : 'rgba(12,12,12,.72)', animation: 'qt-pop .25s ease-out both' }} role="status" aria-live="polite">
      <span className="relative flex h-24 w-24 items-center justify-center">
        <span className="qt-anim absolute inset-0 rounded-full" style={{ background: `radial-gradient(circle, ${accent}66, transparent 68%)`, animation: 'qt-glow 1.6s ease-in-out infinite' }} />
        <span className="qt-anim absolute inset-1" style={{ animation: 'qt-orbit 1.6s linear infinite' }}>
          <span className="absolute -top-0.5 left-1/2 h-2 w-2 -translate-x-1/2 rounded-full" style={{ background: accent, boxShadow: `0 0 10px ${accent}` }} />
        </span>
        <span className="qt-anim relative" style={{ animation: 'qt-pulse 1.6s ease-in-out infinite' }}><TurnoLogo height={46} variant={isDay ? 'black' : 'dark'} /></span>
      </span>
      <p className="text-sm" style={{ color: isDay ? '#444' : '#cfcfcf' }}><TypedText text="Aplicando tu cambio…" speed={18} caret /></p>
    </div>
  )
}
