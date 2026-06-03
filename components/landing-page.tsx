'use client'

import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { FancyButton } from '@/components/ui/fancy-button'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spotlight } from '@/components/ui/spotlight'
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
  { title: 'Bot de WhatsApp 24/7', desc: 'Responde, agenda y cancela citas automáticamente. Sin importar el giro, tus pacientes o clientes siempre tienen respuesta.' },
  { title: 'Cero doble booking', desc: 'Verifica disponibilidad en tiempo real. Nunca dos personas a la misma hora con el mismo profesional.' },
  { title: 'Recordatorios automáticos', desc: 'Envía WhatsApp antes de cada cita. Reduce inasistencias y cancelaciones de último momento.' },
  { title: 'Multi-especialidad', desc: 'Configura múltiples profesionales, cada uno con su horario, servicios y precios independientes.' },
  { title: 'Sin instalar apps', desc: 'Tus clientes y pacientes usan el WhatsApp que ya tienen. Cero fricción, cero confusión.' },
  { title: 'Lista en 5 minutos', desc: 'Crea cuenta, agrega servicios y horario. Tu asistente virtual queda activo al instante.' },
]

const FAQ = [
  { q: '¿Para qué tipos de negocio funciona Turno?', a: 'Para cualquier negocio basado en citas: barberías, consultorios de psicología, clínicas dentales, fisioterapia, spas, estéticas y más. Si agendas con clientes o pacientes, Turno funciona para ti.' },
  { q: '¿Necesito un número nuevo de WhatsApp?', a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo sin costo adicional.' },
  { q: '¿Mis clientes o pacientes tienen que instalar algo?', a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Cero fricción, cero confusión.' },
  { q: '¿Cuánto cuesta?', a: '$2,799 MXN al mes. Sin contratos, sin permanencia. Cancelas cuando quieras desde tu cuenta.' },
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
              Asistente de WhatsApp con IA · Agenda 24/7
            </p>
            <h1 data-hero-h1 className="text-[40px] sm:text-[58px] lg:text-[64px] font-bold leading-[1.06] tracking-[-0.03em] mb-6" style={{ color: t.text, opacity: 0 }}>
              Tu consulta agenda<br />citas sola.
            </h1>
            <p data-hero-p className="text-[16px] sm:text-[18px] leading-relaxed mb-9 max-w-md" style={{ color: t.muted, opacity: 0 }}>
              Un asistente de IA responde WhatsApp 24/7, agenda sin errores y
              muestra todo en un dashboard limpio. Para barberías, consultorios,
              clínicas dentales y más.
            </p>
            <div data-hero-cta className="flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{ opacity: 0 }}>
              <FancyButton href="/register">Activar Turno AI →</FancyButton>
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
              $2,799 MXN/mes · Cancela cuando quieras
            </p>
          </div>

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
          <div data-features-grid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {FEATURES.map(({ title, desc }) => (
              <div key={title} data-feature style={{ opacity: 0 }}>
                <div className="h-1 w-6 rounded-full mb-5" style={{ background: t.accent }} />
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

          {/* Individual plans */}
          <div data-pricing-card style={{ opacity: 0 }}>
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: t.subtle }}>Planes individuales</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {[
                {
                  name: 'Landing',
                  price: '$899',
                  desc: 'Presencia digital para tu negocio',
                  features: ['Página web profesional', 'Formulario de contacto', 'SEO básico', 'Dominio incluido 1 año'],
                  highlight: false,
                },
                {
                  name: 'Turno Sys',
                  price: '$1,299',
                  desc: 'Sistema de agenda sin IA',
                  features: ['Dashboard de citas', 'Hasta 5 barberos', 'Recordatorios automáticos', 'Sin límite de citas'],
                  highlight: false,
                },
                {
                  name: 'Turno AI',
                  price: '$2,799',
                  desc: 'Agenda con bot de WhatsApp 24/7',
                  features: ['Todo de Turno Sys', 'Bot IA en WhatsApp', 'Agenda automática', 'Soporte prioritario'],
                  highlight: true,
                },
              ].map(({ name, price, desc, features, highlight }) => (
                <div
                  key={name}
                  className="rounded-xl p-6"
                  style={{
                    border: `1px solid ${highlight ? t.accent : t.border}`,
                    background: highlight ? `${t.accent}0d` : t.card,
                  }}
                >
                  {highlight && (
                    <span
                      className="inline-block text-[10px] font-semibold uppercase tracking-widest rounded-full px-2.5 py-0.5 mb-3"
                      style={{ color: t.accent, border: `1px solid ${t.accent}66` }}
                    >Popular</span>
                  )}
                  <p className="text-[13px] font-semibold mb-1" style={{ color: t.text }}>{name}</p>
                  <p className="text-[11px] mb-4" style={{ color: t.muted }}>{desc}</p>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-[32px] font-bold tracking-tight" style={{ color: t.text }}>{price}</span>
                    <span className="text-[13px]" style={{ color: t.muted }}>MXN/mes</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check className="h-3.5 w-3.5 shrink-0" style={{ color: t.accent }} />
                        <span className="text-[13px]" style={{ color: t.muted }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="block">
                    <button
                      className="w-full py-2.5 rounded-md text-[13px] font-medium transition-colors"
                      style={
                        highlight
                          ? { background: t.accent, color: '#fff' }
                          : { border: `1px solid ${t.border}`, color: t.muted }
                      }
                    >
                      Activar ahora
                    </button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Bundle plans */}
            <p className="text-[11px] font-semibold uppercase tracking-widest mb-5" style={{ color: t.subtle }}>Combos (ahorra más)</p>
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                {
                  name: 'Landing + Turno Sys',
                  price: '$1,799',
                  saving: 'Ahorras $399',
                  features: ['Página web profesional', 'Dashboard de citas', 'Hasta 5 barberos', 'Recordatorios automáticos'],
                },
                {
                  name: 'Landing + Turno AI',
                  price: '$3,299',
                  saving: 'Ahorras $499',
                  features: ['Página web profesional', 'Bot IA en WhatsApp 24/7', 'Agenda automática', 'Soporte prioritario'],
                },
              ].map(({ name, price, saving, features }) => (
                <div
                  key={name}
                  className="rounded-xl p-6 flex flex-col sm:flex-row gap-6 items-start"
                  style={{ border: `1px solid ${t.border}`, background: t.card }}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold" style={{ color: t.text }}>{name}</p>
                      <span className="text-[10px] font-medium text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">{saving}</span>
                    </div>
                    <ul className="space-y-2 mt-3">
                      {features.map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: t.accent }} />
                          <span className="text-[12px]" style={{ color: t.muted }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-baseline gap-1 justify-end mb-3">
                      <span className="text-[28px] font-bold tracking-tight" style={{ color: t.text }}>{price}</span>
                      <span className="text-[12px]" style={{ color: t.muted }}>MXN/mes</span>
                    </div>
                    <Link href="/register">
                      <button
                        className="px-4 py-2 rounded-md text-white text-[13px] font-medium transition-colors whitespace-nowrap"
                        style={{ background: t.accent }}
                      >
                        Activar ahora
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[12px] mt-6 text-center" style={{ color: t.subtle }}>
              $2,799 MXN/mes · Sin contrato · Cancela cuando quieras
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
          <p className="text-[16px] mb-3" style={{ color: t.muted }}>$2,799 MXN/mes. Sin contrato. Cancela cuando quieras.</p>
          <p className="text-[13px] mb-10" style={{ color: t.subtle }}>Barberías · Psicología · Odontología · Fisioterapia · y más</p>
          <FancyButton href="/register">Activar Turno AI →</FancyButton>
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
