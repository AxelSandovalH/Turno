'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'

export function SplashScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)

  useLayoutEffect(() => {
    // Skip splash if already seen in this session
    if (sessionStorage.getItem('splash-done')) { setDone(true); return }

    const el = ref.current
    if (!el) return

    const logo = el.querySelector('[data-splash-logo]')

    const tl = gsap.timeline({
      onComplete: () => {
        sessionStorage.setItem('splash-done', '1')
        setDone(true)
      },
    })

    tl.fromTo(logo,
      { opacity: 0, scale: 0.82 },
      { opacity: 1, scale: 1, duration: 0.65, ease: 'power3.out' }
    )
    .to(logo, { opacity: 1, duration: 0.55 })          // hold
    .to(el, { opacity: 0, duration: 0.45, ease: 'power2.in' }) // fade out overlay
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
        pointerEvents: 'none',
      }}
    >
      <div data-splash-logo style={{ opacity: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logotrans.png"
          alt="Turno"
          style={{ height: 52, width: 'auto', filter: 'brightness(0) invert(1)' }}
        />
      </div>
    </div>
  )
}
