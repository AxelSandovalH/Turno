'use client'

import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
  mq.addEventListener('change', cb)
  return () => mq.removeEventListener('change', cb)
}
/** Si la persona pidió menos movimiento, los textos aparecen completos en lugar de escribirse. */
export function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribe, () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false)
}

/** Texto que se va escribiendo letra por letra. Avisa una sola vez cuando termina. */
export function TypedText({ text, speed = 22, onDone, caret = false }: { text: string; speed?: number; onDone?: () => void; caret?: boolean }) {
  const reduced = usePrefersReducedMotion()
  const [n, setN] = useState(0)
  const done = useRef(onDone)
  useEffect(() => { done.current = onDone })
  const complete = reduced || n >= text.length

  useEffect(() => {
    if (complete) { done.current?.(); return }
    const id = setTimeout(() => setN(v => v + 1), speed + Math.random() * speed * 0.6)
    return () => clearTimeout(id)
  }, [n, complete, speed])

  return (
    <>
      {complete ? text : text.slice(0, n)}
      {caret && !complete && <span className="qt-caret" aria-hidden="true">|</span>}
    </>
  )
}

/** Estilos de las animaciones de la demo (una sola vez). */
export function DemoStyles() {
  return (
    <style>{`
      @keyframes qt-fade-up { from { opacity: 0; transform: translateY(10px) } to { opacity: 1; transform: none } }
      @keyframes qt-pop { from { opacity: 0; transform: scale(.94) } to { opacity: 1; transform: none } }
      @keyframes qt-pulse { 0%,100% { transform: scale(1); opacity: .9 } 50% { transform: scale(1.06); opacity: 1 } }
      @keyframes qt-glow { 0%,100% { opacity: .25; transform: scale(.9) } 50% { opacity: .6; transform: scale(1.15) } }
      @keyframes qt-orbit { to { transform: rotate(360deg) } }
      @keyframes qt-caret { 0%,49% { opacity: 1 } 50%,100% { opacity: 0 } }
      @keyframes qt-slide { from { transform: translateX(-100%) } to { transform: translateX(260%) } }
      @keyframes qt-dot { 0%,80%,100% { opacity: .25; transform: translateY(0) } 40% { opacity: 1; transform: translateY(-2px) } }
      @keyframes qt-progress { from { transform: scaleX(0) } to { transform: scaleX(1) } }
      @keyframes qt-tap { 0% { box-shadow: 0 0 0 0 var(--qt-tap, rgba(124,58,237,.5)) } 100% { box-shadow: 0 0 0 14px rgba(124,58,237,0) } }
      .qt-caret { display: inline-block; margin-left: 1px; animation: qt-caret 1s steps(1) infinite }
      @media (prefers-reduced-motion: reduce) { .qt-anim { animation: none !important } }
    `}</style>
  )
}
