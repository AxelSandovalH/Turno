'use client'

import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Check, MessageSquare, CalendarCheck, BellRing, Users, Smartphone, Zap } from 'lucide-react'
import { FancyButton } from '@/components/ui/fancy-button'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spotlight } from '@/components/ui/spotlight'
import { WhatsappMockup } from '@/components/landing/whatsapp-mockup'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

// ── Time-based theme ──────────────────────────────────────────────────────────
// Day  06:00 – 18:59  →  light
// Night 19:00 – 05:59 →  dark (default for SSR)

function getIsDay() {
  const h = new Date().getHours()
  return h >= 6 && h < 19
}

// Resolved design tokens per theme
function tokens(isDay: boolean) {
  return isDay
    ? {
        bg:         '#f5f4f0',
        text:       '#111111',
        muted:      '#6b6b6b',
        subtle:     '#b0aaaa',
        border:     '#e0ddd8',
        card:       '#ffffff',
        navBg:      'rgba(245,244,240,0.88)',
        heroBg:     'radial-gradient(ellipse at bottom, #ddd8f0 0%, #eeecea 100%)',
        logoColor:  '#111111',
        accent:     '#7c3aed',
        accentHover:'#6d28d9',
      }
    : {
        bg:         '#0c0c0c',
        text:       '#ebebeb',
        muted:      '#6b6b6b',
        subtle:     '#3d3d3d',
        border:     '#1f1f1f',
        card:       '#111111',
        navBg:      'rgba(12,12,12,0.90)',
        heroBg:     'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)',
        logoColor:  '#ffffff',
        accent:     '#7c3aed',
        accentHover:'#6d28d9',
      }
}

// ── Data ──────────────────────────────────────────────────────────────────────

const FEATURES = [
  { Icon: MessageSquare, title: 'Nunca pierdas una cita por no contestar', desc: 'Mientras trabajas, Turno responde al instante. Aunque te escriban a las 11 de la noche, la cita queda agendada.' },
  { Icon: CalendarCheck, title: 'Dos clientes a la misma hora: imposible', desc: 'Turno revisa tu agenda antes de confirmar. Nunca más el "es que a mí me dijeron a las 5".' },
  { Icon: BellRing, title: 'Se acabaron los plantones', desc: 'Un día antes le recuerda a tu cliente su cita por WhatsApp. Si no puede ir, te avisa y el espacio se libera para otro.' },
  { Icon: Users, title: 'Todo tu equipo, cada quien su agenda', desc: 'Cada barbero o profesional con su propio horario, servicios y precios. Turno sabe con quién agendar a cada cliente.' },
  { Icon: Smartphone, title: 'Tus clientes no instalan nada', desc: 'Usan el WhatsApp que ya tienen en su teléfono. Escriben como siempre y Turno se encarga del resto.' },
  { Icon: Zap, title: 'Listo el mismo día', desc: 'Creas tu cuenta, pones tus servicios y horarios, y tu WhatsApp ya contesta solo. Sin técnicos ni instalaciones.' },
]

const FAQ = [
  { q: '¿Para qué tipos de negocio funciona Turno?', a: 'Para cualquier negocio que trabaje con citas: barberías, consultorios de psicología, clínicas dentales, fisioterapia, spas, estéticas y más. Si agendas con clientes o pacientes, Turno funciona para ti.' },
  { q: '¿Necesito un número nuevo de WhatsApp?', a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo sin costo adicional.' },
  { q: '¿Mis clientes o pacientes tienen que instalar algo?', a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Escriben como siempre y Turno les contesta.' },
  { q: '¿Cuánto cuesta?', a: '$1,299 MXN al mes los primeros 3 meses (precio de lanzamiento), luego $2,499 MXN/mes. Incluye el asistente que contesta y agenda por WhatsApp 24/7. Sin contratos ni permanencia.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Sin penalizaciones ni letras chicas. Cancelas desde tu cuenta en menos de un minuto.' },
]

// ── Component ─────────────────────────────────────────────────────────────────

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)
  const [isDay, setIsDay] = useState(false) // dark default for SSR

  useEffect(() => {
    setIsDay(getIsDay())
    // Re-check at the next hour boundary
    const now   = new Date()
    const msToNextHour = (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1000
    const t = setTimeout(() => {
      setIsDay(getIsDay())
    }, msToNextHour)
    return () => clearTimeout(t)
  }, [])

  const t = tokens(isDay)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('[data-nav]',
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }
      )
      gsap.fromTo('[data-hero-badge]', { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.2 })
      gsap.fromTo('[data-hero-h1]',   { y: 40, opacity: 0 }, { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', delay: 0.35 })
      gsap.fromTo('[data-hero-p]',    { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out', delay: 0.5 })
      gsap.fromTo('[data-hero-cta]',  { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.65 })
      gsap.fromTo('[data-hero-note]', { opacity: 0 },        { opacity: 1, duration: 0.5, delay: 0.8 })
      gsap.fromTo('[data-hero-mockup]', { y: 50, opacity: 0, rotate: 2 }, { y: 0, opacity: 1, rotate: 0, duration: 0.9, ease: 'power3.out', delay: 0.55 })

      gsap.utils.toArray<HTMLElement>('[data-section-head]').forEach(el => {
        gsap.fromTo(el, { y: 40, opacity: 0 }, {
          y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%' },
        })
      })

      gsap.fromTo('[data-feature]', { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: '[data-features-grid]', start: 'top 82%' },
      })

      gsap.fromTo('[data-step]', { y: 40, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.15,
        scrollTrigger: { trigger: '[data-step]', start: 'top 85%' },
      })

      gsap.fromTo('[data-pricing-card]', { x: -50, opacity: 0 }, {
        x: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-pricing-card]', start: 'top 85%' },
      })

      gsap.fromTo('[data-faq]', { y: 24, opacity: 0 }, {
        y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.1,
        scrollTrigger: { trigger: '[data-faq-list]', start: 'top 85%' },
      })

      gsap.fromTo('[data-cta]', { y: 30, opacity: 0, scale: 0.97 }, {
        y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out',
        scrollTrigger: { trigger: '[data-cta]', start: 'top 88%' },
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div
      ref={root}
      className="min-h-screen transition-colors duration-700"
      style={{ background: t.bg, color: t.text, fontFamily: 'var(--font-geist-sans)' }}
    >

      {/* Nav */}
      <header
        data-nav
        className="sticky top-0 z-50 backdrop-blur-md transition-colors duration-700"
        style={{ borderBottom: `1px solid ${t.border}`, background: t.navBg, opacity: 0 }}
      >
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <Link href="/">
            <TurnoLogo height={36} variant={isDay ? 'light' : 'dark'} />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px]" style={{ color: t.muted }}>
            <a href="#features" className="transition-colors hover:opacity-80">Funciones</a>
            <a href="#pricing"  className="transition-colors hover:opacity-80">Precio</a>
            <a href="#faq"      className="transition-colors hover:opacity-80">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-[13px] transition-colors hover:opacity-80" style={{ color: t.muted }}>Entrar</Link>
            <Link href="/register">
              <button
                className="text-[13px] font-medium px-3.5 py-1.5 rounded-md text-white transition-colors"
                style={{ background: t.accent }}
              >
                Crear cuenta
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section
        className="relative overflow-hidden transition-colors duration-700"
        style={{ background: t.heroBg, minHeight: '580px' }}
      >
        <Spotlight
          className="-top-40 left-0 md:left-60 md:-top-20"
          fill={isDay ? '#7c3aed' : 'white'}
        />

        <div className="relative z-10 max-w-6xl mx-auto px-5 flex flex-col lg:flex-row items-center gap-0" style={{ minHeight: '580px' }}>

          {/* Left — copy */}
          <div className="flex-1 py-24 sm:py-32 lg:py-0 flex flex-col justify-center">
            <p data-hero-badge className="text-[12px] font-semibold mb-5 tracking-widest uppercase" style={{ color: t.accent, opacity: 0 }}>
              Contesta, agenda y recuerda · las 24 horas
            </p>
            <h1 data-hero-h1 className="text-[40px] sm:text-[58px] lg:text-[64px] font-bold leading-[1.06] tracking-[-0.03em] mb-6" style={{ color: t.text, opacity: 0 }}>
              Tu WhatsApp contesta<br />y agenda solo.
            </h1>
            <p data-hero-p className="text-[16px] sm:text-[18px] leading-relaxed mb-9 max-w-md" style={{ color: t.muted, opacity: 0 }}>
              Mientras tú atiendes, Turno responde los mensajes, agenda las citas
              y les recuerda a tus clientes que vayan. Para barberías, consultorios,
              clínicas dentales y más.
            </p>
            <div data-hero-cta className="flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{ opacity: 0 }}>
              <FancyButton href="/register">Empieza hoy →</FancyButton>
              <Link href="/login">
                <button
                  className="text-[14px] font-medium px-5 py-3 rounded-md transition-colors w-full sm:w-auto"
                  style={{ border: `1px solid ${t.border}`, color: t.muted }}
                >
                  Iniciar sesión
                </button>
              </Link>
            </div>
            <p data-hero-note className="text-[12px] mt-5" style={{ color: t.subtle, opacity: 0 }}>
              Desde $1,299 MXN/mes · Sin contrato · Cancela cuando quieras
            </p>
          </div>

          {/* Right — WhatsApp demo */}
          <div
            data-hero-mockup
            className="hidden lg:flex flex-1 items-center justify-center py-16"
            style={{ opacity: 0 }}
          >
            <WhatsappMockup isDay={isDay} />
          </div>

        </div>

        {/* Mobile — mockup debajo del copy */}
        <div className="lg:hidden flex justify-center pb-16 px-5 relative z-10">
          <WhatsappMockup isDay={isDay} />
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-14 sm:mb-20" style={{ opacity: 0 }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Funciones</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4" style={{ color: t.text }}>Todo lo que necesitas.</h2>
            <p className="text-[16px] max-w-lg" style={{ color: t.muted }}>Diseñado para cualquier negocio de citas. Sin configuraciones complicadas.</p>
          </div>
          <div data-features-grid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {FEATURES.map(({ Icon, title, desc }) => (
              <div
                key={title}
                data-feature
                className="rounded-2xl p-6 sm:p-7 transition-colors duration-300"
                style={{ opacity: 0, background: t.card, border: `1px solid ${t.border}` }}
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center mb-5"
                  style={{ background: `${t.accent}14`, color: t.accent }}
                >
                  <Icon className="h-5 w-5" strokeWidth={2} />
                </div>
                <h3 className="font-semibold text-[15px] mb-2 leading-snug" style={{ color: t.text }}>{title}</h3>
                <p className="text-[13.5px] leading-relaxed" style={{ color: t.muted }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cómo funciona */}
      <section id="how" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-14 sm:mb-16" style={{ opacity: 0 }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Cómo funciona</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4" style={{ color: t.text }}>Tres pasos y listo.</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-10">
            {[
              { n: '1', title: 'Crea tu cuenta', desc: 'Pon el nombre de tu negocio y tu número de WhatsApp. Toma 2 minutos.' },
              { n: '2', title: 'Di qué ofreces y cuándo', desc: 'Agrega tus servicios con precios y los horarios en que atiendes tú y tu equipo.' },
              { n: '3', title: 'Comparte tu WhatsApp', desc: 'Tus clientes escriben como siempre — y Turno les contesta, agenda y les recuerda su cita.' },
            ].map(({ n, title, desc }) => (
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

      {/* Pricing */}
      <section id="pricing" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-12 sm:mb-16" style={{ opacity: 0 }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Precio</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4" style={{ color: t.text }}>Elige tu plan.</h2>
            <p className="text-[16px] max-w-lg" style={{ color: t.muted }}>Sin comisiones. Sin contratos. Sin letra chica.</p>
          </div>

          {/* Single plan */}
          <div data-pricing-card style={{ opacity: 0 }} className="max-w-md mx-auto">
            <div
              className="rounded-xl p-8"
              style={{ border: `1px solid ${t.accent}`, background: `${t.accent}0d` }}
            >
              <span
                className="inline-block text-[10px] font-semibold uppercase tracking-widest rounded-full px-2.5 py-0.5 mb-3"
                style={{ color: t.accent, border: `1px solid ${t.accent}66` }}
              >Oferta de lanzamiento</span>
              <p className="text-[15px] font-semibold mb-1" style={{ color: t.text }}>Agenda + Asistente</p>
              <p className="text-[12px] mb-5" style={{ color: t.muted }}>Tu WhatsApp contesta y agenda solo, 24/7</p>
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[40px] font-bold tracking-tight" style={{ color: t.text }}>$1,299</span>
                <span className="text-[14px]" style={{ color: t.muted }}>MXN/mes</span>
                <span className="text-[15px] line-through" style={{ color: t.subtle }}>$2,499</span>
              </div>
              <p className="text-[12px] mb-6" style={{ color: t.accent }}>Precio especial los primeros 3 meses, luego $2,499/mes</p>
              <ul className="space-y-2.5 mb-7">
                {['Contesta WhatsApp 24/7', 'Agenda y reagenda citas por ti', 'Recordatorios automáticos', 'Hasta 5 profesionales', 'Soporte prioritario'].map(f => (
                  <li key={f} className="flex items-center gap-2.5">
                    <Check className="h-3.5 w-3.5 shrink-0" style={{ color: t.accent }} />
                    <span className="text-[13px]" style={{ color: t.muted }}>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className="block">
                <button
                  className="w-full py-2.5 rounded-md text-[13px] font-medium transition-colors"
                  style={{ background: t.accent, color: '#fff' }}
                >
                  Activar ahora
                </button>
              </Link>
            </div>
            <p className="text-[12px] mt-6 text-center" style={{ color: t.subtle }}>
              Sin contrato · Sin permanencia · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-12 sm:mb-16" style={{ opacity: 0 }}>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em]" style={{ color: t.text }}>Preguntas frecuentes.</h2>
          </div>
          <div data-faq-list className="max-w-2xl">
            {FAQ.map(({ q, a }, i) => (
              <div
                key={q}
                data-faq
                className="py-6 sm:py-7"
                style={{ opacity: 0, borderBottom: i < FAQ.length - 1 ? `1px solid ${t.border}` : 'none' }}
              >
                <p className="font-semibold text-[15px] mb-2" style={{ color: t.text }}>{q}</p>
                <p className="text-[14px] leading-relaxed" style={{ color: t.muted }}>{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ borderTop: `1px solid ${t.border}` }}>
        <div data-cta className="max-w-5xl mx-auto px-5 py-20 sm:py-28" style={{ opacity: 0 }}>
          <h2 className="text-[38px] sm:text-[56px] font-bold tracking-[-0.03em] mb-4" style={{ color: t.text }}>Empieza hoy.</h2>
          <p className="text-[16px] mb-3" style={{ color: t.muted }}>Desde $1,299 MXN/mes. Sin contrato. Cancela cuando quieras.</p>
          <p className="text-[13px] mb-10" style={{ color: t.subtle }}>Barberías · Psicología · Odontología · Fisioterapia · y más</p>
          <FancyButton href="/register">Empieza hoy →</FancyButton>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/">
            <TurnoLogo height={28} variant={isDay ? 'light' : 'dark'} />
          </Link>
          <p className="text-[13px]" style={{ color: t.subtle }}>© 2026 Turno · Hecho en México</p>
          <a
            href="https://axelsandoval.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] transition-colors hover:opacity-80"
            style={{ color: t.subtle }}
          >
            axelsandoval.dev
          </a>
        </div>
      </footer>

    </div>
  )
}
