'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export function SplashScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)

  useLayoutEffect(() => {
    if (sessionStorage.getItem('splash-done')) { setDone(true); return }

    const el = ref.current
    if (!el) return

    const logo = el.querySelector('[data-splash-logo]')
    const text = el.querySelector('[data-splash-text]')

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem('splash-done', '1')
        setDone(true)
      },
    })

    tl
      // 1. Logo aparece con escala y rebote
      .fromTo(logo,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.4)' }
      )
      // 2. Texto desliza desde la izquierda
      .fromTo(text,
        { x: -40, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.55, ease: 'power3.out' },
        '-=0.1'
      )
      // 3. Pausa
      .to({}, { duration: 0.8 })
      // 4. Logo y texto suben y desaparecen con stagger
      .to([logo, text], { y: -20, opacity: 0, duration: 0.45, ease: 'power3.in', stagger: 0.06 })
      // 5. Overlay sube fuera de pantalla
      .to(el, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' }, '-=0.1')
  }, [])

  if (done) return null

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[9999] bg-[#0c0c0c] flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        data-splash-logo
        src="/logotrans.png"
        alt="Turno"
        style={{ height: 72, width: 'auto', filter: 'brightness(0) invert(1)', opacity: 0 }}
      />
      <span
        data-splash-text
        style={{
          fontSize: 48,
          fontWeight: 700,
          color: '#ebebeb',
          letterSpacing: '-0.03em',
          fontFamily: 'var(--font-geist-sans)',
          lineHeight: 1,
          marginLeft: 16,
          opacity: 0,
        }}
      >
        Turno
      </span>
    </div>
  )
}
