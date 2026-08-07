'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { WhatsappMockup } from './whatsapp-mockup'

gsap.registerPlugin(ScrollTrigger)

interface Tokens {
  text: string
  muted: string
  subtle: string
  border: string
  card: string
  accent: string
}

interface Props {
  t: Tokens
  isDay: boolean
}

const STEPS = [
  { n: '1', title: 'Crea tu cuenta', desc: 'Pon el nombre de tu negocio y tu número de WhatsApp. Toma 2 minutos.' },
  { n: '2', title: 'Di qué ofreces y cuándo', desc: 'Agrega tus servicios con precios y los horarios en que atiendes tú y tu equipo.' },
  { n: '3', title: 'Comparte tu WhatsApp', desc: 'Tus clientes escriben como siempre — y Turno les contesta, agenda y les recuerda su cita.' },
]

// ── Visual del paso 1 — registro ────────────────────────────────────────────────
function OnboardingVisual({ t }: { t: Tokens }) {
  return (
    <div style={{ width: 300, borderRadius: 20, background: t.card, border: `1px solid ${t.border}`, padding: 26, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.35)' }}>
      <p style={{ fontSize: 11, color: t.muted, marginBottom: 6 }}>Nombre del negocio</p>
      <div style={{ height: 40, borderRadius: 10, border: `1.5px solid ${t.accent}`, display: 'flex', alignItems: 'center', padding: '0 12px', marginBottom: 18 }}>
        <span style={{ fontSize: 13, color: t.text }}>Barbería El Estilo</span>
      </div>
      <p style={{ fontSize: 11, color: t.muted, marginBottom: 6 }}>WhatsApp del negocio</p>
      <div style={{ height: 40, borderRadius: 10, border: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', marginBottom: 18 }}>
        <span style={{ fontSize: 13, color: t.text }}>521XXXXXXXXXX</span>
      </div>
      <p style={{ fontSize: 11, color: t.muted, marginBottom: 8 }}>Tipo de negocio</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1.5px solid ${t.accent}`, background: `${t.accent}18`, fontSize: 12, color: t.accent, textAlign: 'center' }}>💈 Barbería</div>
        <div style={{ flex: 1, padding: '8px 10px', borderRadius: 8, border: `1px solid ${t.border}`, fontSize: 12, color: t.muted, textAlign: 'center' }}>💆 Spa</div>
      </div>
    </div>
  )
}

// ── Visual del paso 2 — servicios y horarios ────────────────────────────────────
function CatalogVisual({ t }: { t: Tokens }) {
  const services = [
    { name: 'Corte clásico', price: '$150' },
    { name: 'Corte + barba', price: '$220' },
    { name: 'Diseño / línea', price: '$80' },
  ]
  const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D']
  const activeDays = [true, true, true, true, true, true, false]

  return (
    <div style={{ width: 300, borderRadius: 20, background: t.card, border: `1px solid ${t.border}`, padding: 24, boxShadow: '0 24px 60px -20px rgba(0,0,0,0.35)' }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14 }}>Tus servicios</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {services.map(s => (
          <div key={s.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 12px', borderRadius: 9, border: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 13, color: t.text }}>{s.name}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: t.accent }}>{s.price}</span>
          </div>
        ))}
      </div>
      <p style={{ fontSize: 11, fontWeight: 600, color: t.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Días que atiendes</p>
      <div style={{ display: 'flex', gap: 6 }}>
        {days.map((day, i) => (
          <div
            key={i}
            style={{
              width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 600,
              background: activeDays[i] ? `${t.accent}1f` : 'transparent',
              border: `1px solid ${activeDays[i] ? t.accent : t.border}`,
              color: activeDays[i] ? t.accent : t.subtle,
            }}
          >
            {day}
          </div>
        ))}
      </div>
    </div>
  )
}

export function HowItWorks({ t, isDay }: Props) {
  const pinRef = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(0)

  useLayoutEffect(() => {
    const mm = gsap.matchMedia()

    // Scroll narrativo con pin solo en desktop — en móvil el fallback estático
    // (más abajo) evita el riesgo de jank con el resize del navegador móvil.
    mm.add('(min-width: 1024px)', () => {
      let lastStep = -1
      const trigger = ScrollTrigger.create({
        trigger: pinRef.current,
        start: 'top top',
        end: () => '+=' + window.innerHeight * 1.8,
        pin: true,
        scrub: 0.6,
        onUpdate: self => {
          const step = Math.min(STEPS.length - 1, Math.floor(self.progress * STEPS.length))
          if (step !== lastStep) {
            lastStep = step
            setActiveStep(step)
          }
        },
      })
      return () => trigger.kill()
    })

    return () => mm.revert()
  }, [])

  const visuals = [
    <OnboardingVisual key="onboarding" t={t} />,
    <CatalogVisual key="catalog" t={t} />,
    <WhatsappMockup key="whatsapp" isDay={isDay} />,
  ]

  return (
    <section id="how" style={{ borderTop: `1px solid ${t.border}` }}>
      {/* Desktop — narrativa con scroll pineado */}
      <div ref={pinRef} className="hidden lg:flex h-screen items-center overflow-hidden">
        <div className="max-w-5xl mx-auto px-5 w-full grid grid-cols-2 gap-16 items-center">
          {/* Texto */}
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Cómo funciona</p>

            <div className="flex gap-2 mb-8">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className="h-1 rounded-full transition-all duration-300"
                  style={{ width: i === activeStep ? 32 : 16, background: i === activeStep ? t.accent : t.border }}
                />
              ))}
            </div>

            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold mb-5 transition-colors duration-300"
              style={{ background: `${t.accent}1a`, color: t.accent, border: `1px solid ${t.accent}55` }}
            >
              {STEPS[activeStep].n}
            </div>
            <h3 className="font-semibold text-[26px] mb-3 tracking-[-0.01em]" style={{ color: t.text }}>{STEPS[activeStep].title}</h3>
            <p className="text-[16px] leading-relaxed max-w-sm" style={{ color: t.muted }}>{STEPS[activeStep].desc}</p>
          </div>

          {/* Visual */}
          <div className="relative flex items-center justify-center" style={{ height: 520 }}>
            {visuals.map((visual, i) => (
              <div
                key={i}
                className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
                style={{ opacity: activeStep === i ? 1 : 0, pointerEvents: activeStep === i ? 'auto' : 'none' }}
              >
                {visual}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile — grid estático, sin pin */}
      <div className="lg:hidden max-w-5xl mx-auto px-5 py-20 sm:py-28">
        <div data-section-head className="mb-14 sm:mb-16" style={{ opacity: 0 }}>
          <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Cómo funciona</p>
          <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4" style={{ color: t.text }}>Tres pasos y listo.</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-10">
          {STEPS.map(({ n, title, desc }) => (
            <div key={n} data-step style={{ opacity: 0 }}>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-[15px] font-bold mb-5"
                style={{ background: `${t.accent}1a`, color: t.accent, border: `1px solid ${t.accent}55` }}
              >
                {n}
              </div>
              <h3 className="font-semibold text-[15px] mb-2" style={{ color: t.text }}>{title}</h3>
              <p className="text-[14px] leading-relaxed" style={{ color: t.muted }}>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
