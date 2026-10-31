'use client'

import { useLayoutEffect, useRef, useState, useEffect } from 'react'
import { flushSync } from 'react-dom'
import Link from 'next/link'
import { Check, Sun, Moon } from 'lucide-react'
import { FancyButton } from '@/components/ui/fancy-button'
import { TurnoLogo } from '@/components/ui/turno-logo'
import { Spotlight } from '@/components/ui/spotlight'
import { WhatsappMockup } from '@/components/landing/whatsapp-mockup'
import { HowItWorks } from '@/components/landing/how-it-works'
import { DashboardMockup } from '@/components/landing/dashboard-mockup'
import { FeaturesBento } from '@/components/landing/features-bento'
import { SegmentShowcase } from '@/components/landing/segment-showcase'
import { DemoGenerator } from '@/components/landing/demo-generator'
import { WhatsAppLink } from '@/components/landing/whatsapp-link'
import { SITE } from '@/lib/site'
import { WhatsAppFloat } from '@/components/landing/whatsapp-float'
import { SEGMENTS } from '@/components/landing/segments-data'
import { BASES, ASSISTANT, PLANS, PRICE_RANGE, TRIAL_MESSAGES, planKeyFor, totalFor, money } from '@/lib/plans'
import gsap from 'gsap'
import { track } from '@/lib/funnel/client'
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
// FEATURES vive ahora en features-bento.tsx y SEGMENTS en segments-data.ts

const FAQ = [
  { q: '¿Para qué tipos de negocio funciona QuickTurno?', a: 'Para negocios que trabajan con citas o reservas: barberías, spas y estéticas, psicología, odontología, fisioterapia, laboratorios clínicos, estudios de tatuaje y charters de yates o pesca. Y también para restaurantes, taquerías y cafeterías que reciben pedidos a domicilio o para recoger.' },
  { q: '¿QuickTurno sirve para restaurantes y delivery?', a: 'Sí. Armas tu menú con fotos, extras y notas, y tus clientes piden por WhatsApp o desde tu link de menú con carrito, a domicilio o para recoger. QuickTurno toma el pedido, manda las fotos de los platillos y cobra con tarjeta en línea por Stripe. Tú ves cada pedido en un tablero y, al cambiarlo de estado, el cliente recibe el aviso por WhatsApp. Sin comisión por pedido.' },
  { q: '¿Necesito un número nuevo de WhatsApp?', a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo sin costo adicional.' },
  { q: '¿Mis clientes o pacientes tienen que instalar algo?', a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Escriben como siempre y QuickTurno les contesta.' },
  { q: '¿Puedo pedir anticipo para apartar la cita?', a: 'Sí. Lo activas desde Configuración y defines el monto. QuickTurno manda el link de pago de Stripe en la misma conversación y aparta el horario 20 minutos: si el cliente no paga en ese rato, el espacio se libera automáticamente para alguien más. El dinero llega directo a tu cuenta de Stripe.' },
  { q: '¿Cuánto cuesta?', a: `Hay dos planes por tipo de negocio, sin contratos ni permanencia. Citas y reservas: Agenda ${money(totalFor('citas', false))} MXN al mes, o Agenda + Asistente de WhatsApp ${money(totalFor('citas', true))} MXN al mes. Restaurantes y pedidos: Menú y pedidos ${money(totalFor('pedidos', false))} MXN al mes, o ${money(totalFor('pedidos', true))} MXN al mes con el Asistente. Tours: ${money(totalFor('tours', false))} MXN al mes, o ${money(totalFor('tours', true))} MXN al mes con el Asistente. El Asistente es el que contesta y atiende tu WhatsApp solo, 24/7.` },
  { q: '¿Cómo funciona la prueba gratis?', a: `Todos los planes incluyen 7 días de prueba gratis, también el que trae el Asistente de WhatsApp: durante la prueba el Asistente contesta hasta ${TRIAL_MESSAGES} mensajes. Eliges tu plan, registras tu tarjeta y lo usas completo sin pagar nada: hoy no se te cobra. Si cancelas antes de que termine la prueba, no pagas; si no, al día 8 se cobra el primer mes. Cancelas tú mismo desde Configuración, en menos de un minuto.` },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Sin penalizaciones ni letras chicas. Cancelas desde tu cuenta en menos de un minuto.' },
]

// ── Theme switch (nav) ────────────────────────────────────────────────────────
// Ícono simple (no el switch grande sol/luna que ya usa el dashboard en
// Configuración) — en una landing de conversión, el toggle de tema no debe
// competir visualmente con el CTA; va después de él, con el mismo peso que
// cualquier otro ícono utilitario del nav.
function LandingThemeSwitch({ t, isDay, onToggle }: {
  t: ReturnType<typeof tokens>
  isDay: boolean
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void
}) {
  const [hover, setHover] = useState(false)
  return (
    <button
      type="button"
      onClick={onToggle}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-label={isDay ? 'Cambiar a modo noche' : 'Cambiar a modo día'}
      title={isDay ? 'Modo noche' : 'Modo día'}
      className="flex items-center justify-center rounded-full shrink-0 transition-colors duration-200"
      style={{
        width: 32,
        height: 32,
        color: hover ? t.text : t.muted,
        background: hover ? `${t.accent}14` : 'transparent',
      }}
    >
      {isDay ? <Moon size={16} strokeWidth={2} /> : <Sun size={16} strokeWidth={2} />}
    </button>
  )
}
// ── Segment picker (hero) ─────────────────────────────────────────────────────
// Chips de giro que controlan qué conversación muestra el mockup de WhatsApp —
// mismo orden/emoji que SEGMENTS, así el índice apunta directo a SCENARIOS.

function SegmentPicker({ t, active, onSelect }: {
  t: ReturnType<typeof tokens>
  active: number
  onSelect: (i: number) => void
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap justify-center max-w-[330px]">
      {SEGMENTS.map(({ emoji, name }, i) => {
        const isActive = i === active
        return (
          <button
            key={name}
            type="button"
            onClick={() => onSelect(i)}
            title={name}
            aria-label={name}
            aria-pressed={isActive}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[15px] transition-all duration-200"
            style={{
              background: isActive ? `${t.accent}22` : 'transparent',
              border: `1.5px solid ${isActive ? t.accent : t.border}`,
              transform: isActive ? 'scale(1.08)' : 'scale(1)',
              opacity: isActive ? 1 : 0.55,
            }}
          >
            {emoji}
          </button>
        )
      })}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

const THEME_KEY = 'turno-landing-theme'

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => { track('landing_view') }, [])
  const [isDay, setIsDay] = useState(false) // dark default for SSR
  const [loginHover, setLoginHover] = useState(false)
  const [activeSegment, setActiveSegment] = useState(0)
  // Los planes se muestran según el tipo de negocio: citas o pedidos
  const [pricingSegment, setPricingSegment] = useState<'citas' | 'tours' | 'pedidos'>('citas')

  useEffect(() => {
    // Por defecto SIEMPRE se adapta a la hora actual. Si el visitante toca el
    // switch, la elección manual dura solo esta sesión (sessionStorage, no
    // localStorage) — en su próxima visita vuelve a decidir por horario.
    localStorage.removeItem(THEME_KEY) // limpia la versión anterior (persistía para siempre)
    const stored = sessionStorage.getItem(THEME_KEY)
    if (stored === 'day' || stored === 'night') {
      setIsDay(stored === 'day')
      return
    }
    setIsDay(getIsDay())
    // Re-check at the next hour boundary (solo mientras no haya elección manual)
    const now   = new Date()
    const msToNextHour = (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1000
    const t = setTimeout(() => {
      setIsDay(getIsDay())
    }, msToNextHour)
    return () => clearTimeout(t)
  }, [])

  function toggleTheme(e: React.MouseEvent<HTMLButtonElement>) {
    const next = !isDay
    const apply = () => {
      setIsDay(next)
      sessionStorage.setItem(THEME_KEY, next ? 'day' : 'night')
    }

    // Barrido circular desde el botón con la View Transitions API — si el
    // navegador no la soporta (Firefox, Safari viejo), cae a un cambio
    // instantáneo sin romper nada.
    const supportsViewTransition = typeof document !== 'undefined' && typeof (document as any).startViewTransition === 'function'
    if (!supportsViewTransition) { apply(); return }

    document.documentElement.style.setProperty('--theme-x', `${e.clientX}px`)
    document.documentElement.style.setProperty('--theme-y', `${e.clientY}px`)
    ;(document as any).startViewTransition(() => flushSync(apply))
  }

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
            <TurnoLogo height={52} variant={isDay ? 'black' : 'dark'} />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px]" style={{ color: t.muted }}>
            <a href="#features"  className="transition-colors hover:opacity-80">Funciones</a>
            <a href="#segments"  className="transition-colors hover:opacity-80">Giros</a>
            <a href="#dashboard" className="transition-colors hover:opacity-80">Sistema</a>
            <a href="#pricing"   className="transition-colors hover:opacity-80">Planes</a>
            <a href="#faq"       className="transition-colors hover:opacity-80">FAQ</a>
          </nav>
          <div className="flex items-center gap-1.5 sm:gap-3">
            <a href="#pricing" className="md:hidden text-[13px] transition-colors hover:opacity-80" style={{ color: t.muted }}>Planes</a>
            <Link href="/login" className="text-[13px] transition-colors hover:opacity-80" style={{ color: t.muted }}>Entrar</Link>
            <Link href="/register">
              <button
                className="text-[13px] font-medium px-3.5 py-1.5 rounded-md text-white transition-colors"
                style={{ background: t.accent }}
              >
                Crear cuenta
              </button>
            </Link>
            <LandingThemeSwitch t={t} isDay={isDay} onToggle={toggleTheme} />
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
              Mientras tú atiendes, QuickTurno responde los mensajes, agenda las citas,
              toma pedidos y les recuerda a tus clientes que vayan. Para barberías,
              consultorios, restaurantes y más.
            </p>
            <div data-hero-cta className="flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{ opacity: 0 }}>
              {/* CTA principal: WhatsApp. Secundario: prueba gratis (si eligió restaurantes o tours en el selector, el registro ya arranca con su tipo de negocio) */}
              <WhatsAppLink section="hero" giro={SEGMENTS[activeSegment]?.giro}
                className="text-[14px] font-semibold px-6 py-3 rounded-md w-full sm:w-auto text-center text-white transition-opacity hover:opacity-90"
                style={{ background: '#25d366' }}>
                Escríbenos por WhatsApp
              </WhatsAppLink>
              <Link href={SEGMENTS[activeSegment]?.short === 'Restaurantes' ? '/register?plan=menu' : SEGMENTS[activeSegment]?.short === 'Tours' ? '/register?plan=agenda&type=tours' : '/register'} className="w-full sm:w-auto">
                <button
                  onMouseEnter={() => setLoginHover(true)}
                  onMouseLeave={() => setLoginHover(false)}
                  className="relative text-[14px] font-medium px-5 py-3 rounded-md w-full sm:w-auto overflow-hidden"
                  style={{ border: `1px solid ${t.border}` }}
                >
                  <span className="relative z-10 transition-colors duration-300" style={{ color: loginHover ? t.accent : t.text }}>
                    Empezar 7 días gratis
                  </span>
                  <span
                    className="absolute left-0 right-0 bottom-0 h-[2px]"
                    style={{ background: t.accent, transform: `scaleX(${loginHover ? 1 : 0})`, transformOrigin: loginHover ? 'left' : 'right', transition: 'transform 0.35s ease' }}
                  />
                </button>
              </Link>
            </div>
            <p data-hero-note className="text-[12px] mt-5" style={{ color: t.subtle, opacity: 0 }}>
              7 días gratis con Asistente incluido · Desde {money(PRICE_RANGE.low)} MXN/mes · Cancela cuando quieras
            </p>
          </div>

          {/* Right — WhatsApp demo */}
          <div
            data-hero-mockup
            className="hidden lg:flex flex-1 flex-col items-center justify-center py-16 gap-5"
            style={{ opacity: 0 }}
          >
            <SegmentPicker t={t} active={activeSegment} onSelect={setActiveSegment} />
            <WhatsappMockup isDay={isDay} activeIndex={activeSegment} onScenarioChange={setActiveSegment} />
          </div>

        </div>

        {/* Mobile — mockup debajo del copy */}
        <div className="lg:hidden flex flex-col items-center gap-5 pb-16 px-5 relative z-10">
          <SegmentPicker t={t} active={activeSegment} onSelect={setActiveSegment} />
          <WhatsappMockup isDay={isDay} activeIndex={activeSegment} onScenarioChange={setActiveSegment} />
        </div>
      </section>

      {/* Demo con IA: el visitante describe su negocio y ve cómo quedaría */}
      <DemoGenerator t={t} isDay={isDay} />

      {/* Funciones — bento asimétrico, las celdas grandes muestran producto real */}
      <FeaturesBento t={t} isDay={isDay} />

      {/* Segmentos — un solo panel por giro en vez de 7 columnas de bullets */}
      <SegmentShowcase t={t} isDay={isDay} />

      {/* Pricing */}
      <section id="pricing" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-12 sm:mb-16" style={{ opacity: 0 }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>Precio</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-4" style={{ color: t.text }}>Elige tu plan.</h2>
            <p className="text-[16px] max-w-lg" style={{ color: t.muted }}>Sin comisiones. Sin contratos. Sin letra chica.</p>
          </div>

          {/* Planes por tipo de negocio: citas (Agenda, Agenda + Asistente) y pedidos (Pedidos) */}
          <div data-pricing-card style={{ opacity: 0 }} className="max-w-5xl mx-auto">
            <div className="flex justify-center mb-3">
              <div role="tablist" aria-label="Tipo de negocio" className="inline-flex rounded-full p-1 gap-1" style={{ border: `1px solid ${t.border}`, background: t.card }}>
                {([['citas', 'Citas y reservas'], ['tours', 'Tours'], ['pedidos', 'Restaurantes y pedidos']] as const).map(([seg, label]) => (
                  <button
                    key={seg}
                    role="tab"
                    aria-selected={pricingSegment === seg}
                    onClick={() => setPricingSegment(seg)}
                    className="px-4 py-2 rounded-full text-[13px] font-medium transition-colors"
                    style={pricingSegment === seg ? { background: t.accent, color: '#fff' } : { color: t.muted }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <p className="text-center text-[13px] mb-8" style={{ color: t.muted }}>
              {pricingSegment === 'citas'
                ? 'Barberías, spas, clínicas, estudios de tatuaje y charters.'
                : pricingSegment === 'tours'
                  ? 'Operadores de tours y actividades.'
                  : 'Restaurantes, taquerías y cafeterías con pedidos a domicilio o para recoger.'}
            </p>
            {/* Dos planes por giro, cada uno con su total real (base + asistente ya sumados) */}
            <div className="grid md:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {([false, true] as const).map(withAssistant => {
                const base = BASES[pricingSegment]
                const total = totalFor(pricingSegment, withAssistant)
                const planKey = planKeyFor(pricingSegment, withAssistant)
                const features = withAssistant ? [...base.features, ...ASSISTANT.featuresBySegment[pricingSegment]] : base.features
                return (
                  <div key={String(withAssistant)} data-plan-card={planKey} className="rounded-xl p-7 flex flex-col"
                    style={{ border: `1px solid ${withAssistant ? t.accent : t.border}`, background: withAssistant ? `${t.accent}0d` : t.card }}>
                    {withAssistant && <p className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: t.accent }}>Más completo</p>}
                    <p className="text-[16px] font-semibold" style={{ color: t.text }}>{withAssistant ? `${base.name} + Asistente de WhatsApp` : base.name}</p>
                    <p className="text-[12px] mb-4" style={{ color: t.muted }}>{withAssistant ? ASSISTANT.description : base.description}</p>
                    <p className="mb-5">
                      <span className="text-[38px] font-bold tracking-tight" style={{ color: t.text }}>{money(total)}</span>
                      <span className="text-[14px]" style={{ color: t.muted }}> MXN/mes</span>
                    </p>
                    <ul className="space-y-2.5 mb-6 flex-1">
                      {features.map(f => (
                        <li key={f} className="flex items-center gap-2.5">
                          <Check className="h-3.5 w-3.5 shrink-0" style={{ color: t.accent }} />
                          <span className="text-[13px]" style={{ color: t.muted }}>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <Link href={`/register?plan=${planKey}`} className="block">
                      <button className="w-full py-3 rounded-md text-[14px] font-medium transition-colors"
                        style={withAssistant ? { background: t.accent, color: '#fff' } : { border: `1px solid ${t.border}`, color: t.text }}>
                        Probar 7 días gratis
                      </button>
                    </Link>
                    <WhatsAppLink section="pricing" className="block text-center text-[13px] mt-3 underline underline-offset-4" style={{ color: t.muted }}>
                      ¿Dudas? Escríbenos por WhatsApp
                    </WhatsAppLink>
                    <p className="text-[12px] mt-3 text-center" style={{ color: t.subtle }}>
                      {withAssistant ? `Sin cobro hoy. La prueba incluye hasta ${TRIAL_MESSAGES} mensajes del Asistente.` : 'Sin cobro hoy.'}
                    </p>
                  </div>
                )
              })}
            </div>
            <p className="text-[12px] mt-6 text-center" style={{ color: t.subtle }}>
              7 días gratis en cualquier plan · Sin contrato · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* El sistema detrás del bot */}
      <section id="dashboard" style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28 grid lg:grid-cols-2 gap-14 items-center">
          <div data-section-head style={{ opacity: 0 }}>
            <p className="text-[12px] font-semibold uppercase tracking-widest mb-4" style={{ color: t.accent }}>No solo un bot</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] mb-5" style={{ color: t.text }}>Tu negocio, ordenado.</h2>
            <p className="text-[16px] leading-relaxed mb-6" style={{ color: t.muted }}>
              Cada cita que agenda el bot cae directo a tu panel. Ve tu agenda del día, tus ingresos y a tus clientes sin perseguir mensajes.
            </p>
            <ul className="space-y-3">
              {[
                'Agenda del día por colaborador, sin choques de horario',
                'Ingresos y citas confirmadas en tiempo real',
                'Historial de cada cliente y sus citas pasadas',
              ].map(item => (
                <li key={item} className="flex items-start gap-3 text-[14px]" style={{ color: t.text }}>
                  <Check size={16} style={{ color: t.accent, marginTop: 3, flexShrink: 0 }} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div data-feature className="flex justify-center min-w-0" style={{ opacity: 0 }}>
            <DashboardMockup isDay={isDay} />
          </div>
        </div>
      </section>

      {/* Cómo funciona — narrativa con scroll pineado en desktop */}
      <HowItWorks t={t} isDay={isDay} />

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
          <p className="text-[16px] mb-3" style={{ color: t.muted }}>7 días gratis. Desde {money(PRICE_RANGE.low)} MXN/mes. Cancela cuando quieras.</p>
          <p className="text-[13px] mb-10" style={{ color: t.subtle }}>Barberías · Spas · Psicología · Odontología · Fisioterapia · Laboratorios · Tatuajes · Charters · Restaurantes · y más</p>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <WhatsAppLink section="cierre" className="text-[14px] font-semibold px-6 py-3 rounded-md w-full sm:w-auto text-center text-white transition-opacity hover:opacity-90" style={{ background: '#25d366' }}>
              Escríbenos por WhatsApp
            </WhatsAppLink>
            <Link href="/register" className="w-full sm:w-auto">
              <button className="text-[14px] font-medium px-5 py-3 rounded-md w-full sm:w-auto" style={{ border: `1px solid ${t.border}`, color: t.text }}>Empezar 7 días gratis</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: `1px solid ${t.border}` }}>
        <div className="max-w-5xl mx-auto px-5 py-10 grid gap-8 sm:grid-cols-3">
          <div>
            <Link href="/">
              <TurnoLogo height={38} variant={isDay ? 'black' : 'dark'} />
            </Link>
            <p className="text-[13px] mt-3" style={{ color: t.subtle }}>Tu recepcionista en WhatsApp, las 24 horas.</p>
          </div>
          <div className="text-[13px] space-y-2" style={{ color: t.muted }}>
            <p className="font-semibold" style={{ color: t.text }}>Contacto</p>
            {SITE.contactEmail && <p><a href={`mailto:${SITE.contactEmail}`} className="hover:opacity-80">{SITE.contactEmail}</a></p>}
            <p><WhatsAppLink section="footer" className="hover:opacity-80">WhatsApp {SITE.whatsappDisplay}</WhatsAppLink></p>
            <p>Facturamos</p>
          </div>
          <div className="text-[13px] space-y-2" style={{ color: t.muted }}>
            <p className="font-semibold" style={{ color: t.text }}>Legal</p>
            <p><Link href="/privacidad" className="hover:opacity-80">Aviso de privacidad</Link></p>
            <p><Link href="/terminos" className="hover:opacity-80">Términos y condiciones</Link></p>
          </div>
        </div>
        <div className="max-w-5xl mx-auto px-5 pb-8 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ color: t.subtle }}>
          <p className="text-[13px]">© {new Date().getFullYear()} {SITE.brand} · Hecho en México</p>
          <a href="https://axelsandoval.dev" target="_blank" rel="noopener noreferrer" className="text-[13px] transition-colors hover:opacity-80">axelsandoval.dev</a>
        </div>
      </footer>

      <WhatsAppFloat />
    </div>
  )
}
