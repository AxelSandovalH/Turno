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

    const line = el.querySelector('[data-splash-line]')
    const logo = el.querySelector('[data-splash-logo]')
    const glow = el.querySelector('[data-splash-glow]')

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem('splash-done', '1')
        setDone(true)
      },
    })

    tl
      // 1. Línea púrpura se expande desde el centro
      .fromTo(line,
        { scaleX: 0, opacity: 1 },
        { scaleX: 1, duration: 0.45, ease: 'power4.inOut' }
      )
      // 2. Logo cae y "estampa" con rebote elástico
      .fromTo(logo,
        { y: -48, opacity: 0, scale: 0.9 },
        { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: 'back.out(1.8)' },
        '-=0.05'
      )
      // 3. Glow pulsa suavemente bajo el logo
      .fromTo(glow,
        { opacity: 0, scale: 0.6 },
        { opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' },
        '-=0.4'
      )
      // 4. Hold
      .to({}, { duration: 0.6 })
      // 5. Línea desaparece
      .to(line, { scaleX: 0, opacity: 0, duration: 0.3, ease: 'power3.in' }, '-=0.1')
      // 6. Glow y logo suben y se desvanecen
      .to([logo, glow], { y: -32, opacity: 0, duration: 0.45, ease: 'power3.in' }, '-=0.15')
      // 7. Overlay sube y sale
      .to(el, { y: '-100%', duration: 0.55, ease: 'power4.in' }, '-=0.1')
  }, [])

  if (done) return null

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0c0c0c',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Glow bajo el logo */}
      <div
        data-splash-glow
        style={{
          position: 'absolute',
          width: 320,
          height: 120,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.18) 0%, transparent 70%)',
          filter: 'blur(24px)',
          opacity: 0,
          pointerEvents: 'none',
        }}
      />

      {/* Línea */}
      <div
        data-splash-line
        style={{
          position: 'absolute',
          width: 180,
          height: 1.5,
          background: 'linear-gradient(90deg, transparent, #7c3aed, transparent)',
          borderRadius: 2,
          transformOrigin: 'center',
          transform: 'scaleX(0)',
        }}
      />

      {/* Logo */}
      <div data-splash-logo style={{ opacity: 0, position: 'relative', zIndex: 1 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logotrans.png"
          alt="Turno"
          style={{ height: 88, width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
      </div>
    </div>
  )
}
