'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { TurnoLogo } from '@/components/ui/turno-logo'

export function SplashScreen() {
  const ref = useRef<HTMLDivElement>(null)
  const [done, setDone] = useState(false)

  useLayoutEffect(() => {
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

    tl
      .fromTo(logo,
        { scale: 0.6, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(1.4)' }
      )
      .to({}, { duration: 0.8 })
      .to(logo, { y: -20, opacity: 0, duration: 0.45, ease: 'power3.in' })
      .to(el, { yPercent: -100, duration: 0.7, ease: 'power3.inOut' }, '-=0.1')
  }, [])

  if (done) return null

  return (
    <div
      ref={ref}
      className="fixed inset-0 z-[9999] bg-[#0c0c0c] flex items-center justify-center"
      style={{ pointerEvents: 'none' }}
    >
      <div data-splash-logo style={{ opacity: 0, color: '#ffffff' }}>
        <TurnoLogo height={64} />
      </div>
    </div>
  )
}
