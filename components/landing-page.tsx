'use client'

import { useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { StarField } from '@/components/star-field'
import { FancyButton } from '@/components/ui/fancy-button'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

const FEATURES = [
  { title: 'Bot de WhatsApp 24/7', desc: 'Responde mensajes, agenda y cancela citas automáticamente. Tus clientes siempre tienen respuesta.' },
  { title: 'Cero doble booking', desc: 'Verifica disponibilidad en tiempo real. Nunca dos clientes a la misma hora.' },
  { title: 'Recordatorios automáticos', desc: 'Envía WhatsApp antes de cada cita para reducir cancelaciones de último momento.' },
  { title: 'Dashboard en tiempo real', desc: 'Ve tus citas del día y gestiona tu equipo desde el celular o computadora.' },
  { title: 'Sin instalar apps', desc: 'Tus clientes usan el WhatsApp que ya tienen. Cero fricción, cero confusión.' },
  { title: 'Lista en 5 minutos', desc: 'Crea cuenta, agrega servicios y horario. Tu recepcionista activa al instante.' },
]

const FAQ = [
  { q: '¿Necesito un número nuevo de WhatsApp?', a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo sin costo adicional.' },
  { q: '¿Mis clientes tienen que instalar algo?', a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Cero fricción, cero confusión.' },
  { q: '¿Qué pasa al terminar los 14 días?', a: 'Te pedimos una tarjeta para continuar. Si decides no seguir, tu cuenta se pausa sin ningún cargo.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Sin penalizaciones ni letras chicas. Cancelas desde tu cuenta en menos de un minuto.' },
]

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      // ── Nav ──────────────────────────────────────────────
      gsap.from('[data-nav]', {
        y: -24, opacity: 0, duration: 0.6, ease: 'power3.out',
      })

      // ── Hero ─────────────────────────────────────────────
      gsap.from('[data-hero-badge]', {
        y: 20, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.15,
      })
      gsap.from('[data-hero-h1]', {
        y: 40, opacity: 0, duration: 0.7, ease: 'power3.out', delay: 0.28,
      })
      gsap.from('[data-hero-p]', {
        y: 30, opacity: 0, duration: 0.6, ease: 'power3.out', delay: 0.42,
      })
      gsap.from('[data-hero-cta]', {
        y: 20, opacity: 0, duration: 0.5, ease: 'power3.out', delay: 0.54,
      })
      gsap.from('[data-hero-note]', {
        opacity: 0, duration: 0.5, delay: 0.68,
      })

      // ── Section headers (scroll) ──────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-section-head]').forEach(el => {
        gsap.from(el, {
          scrollTrigger: { trigger: el, start: 'top 88%' },
          y: 36, opacity: 0, duration: 0.65, ease: 'power3.out',
        })
      })

      // ── Feature cards (scroll stagger) ───────────────────
      gsap.from('[data-feature]', {
        scrollTrigger: { trigger: '[data-features-grid]', start: 'top 82%' },
        y: 40, opacity: 0, duration: 0.55, ease: 'power3.out',
        stagger: 0.09,
      })

      // ── Pricing card ─────────────────────────────────────
      gsap.from('[data-pricing-card]', {
        scrollTrigger: { trigger: '[data-pricing-card]', start: 'top 85%' },
        x: -40, opacity: 0, duration: 0.65, ease: 'power3.out',
      })

      // ── FAQ items (scroll stagger) ────────────────────────
      gsap.from('[data-faq]', {
        scrollTrigger: { trigger: '[data-faq-list]', start: 'top 85%' },
        y: 24, opacity: 0, duration: 0.5, ease: 'power3.out',
        stagger: 0.1,
      })

      // ── CTA section ───────────────────────────────────────
      gsap.from('[data-cta]', {
        scrollTrigger: { trigger: '[data-cta]', start: 'top 88%' },
        y: 30, opacity: 0, scale: 0.97, duration: 0.65, ease: 'power3.out',
      })
    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="min-h-screen bg-[#0c0c0c] text-[#ebebeb]" style={{ fontFamily: 'var(--font-geist-sans)' }}>

      {/* Nav */}
      <header data-nav className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#0c0c0c]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logotrans.png" alt="Turno" style={{ height: 36, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[#6b6b6b]">
            <a href="#features" className="hover:text-[#ebebeb] transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-[#ebebeb] transition-colors">Precio</a>
            <a href="#faq" className="hover:text-[#ebebeb] transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-[13px] text-[#6b6b6b] hover:text-[#ebebeb] transition-colors">
              Entrar
            </Link>
            <Link href="/register">
              <button className="text-[13px] font-medium px-3.5 py-1.5 rounded-md bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors">
                Empezar gratis
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-5 pt-24 pb-24 sm:pt-32 sm:pb-32" style={{ background: 'radial-gradient(ellipse at bottom, #1b2735 0%, #090a0f 100%)' }}>
        <StarField />
        <div className="relative z-10 max-w-5xl mx-auto">
          <div className="max-w-3xl">
            <p data-hero-badge className="text-[12px] font-semibold text-[#7c3aed] mb-5 tracking-widest uppercase">
              Asistente de WhatsApp para barberías
            </p>
            <h1 data-hero-h1 className="text-[40px] sm:text-[58px] lg:text-[72px] font-bold leading-[1.06] tracking-[-0.03em] text-[#ebebeb] mb-6">
              Tu barbería agenda<br />citas sola.
            </h1>
            <p data-hero-p className="text-[16px] sm:text-[19px] text-[#6b6b6b] leading-relaxed mb-9 max-w-xl">
              Un asistente de IA responde WhatsApp 24/7, agenda sin errores
              y te muestra todo en un dashboard limpio. Tú solo cortas.
            </p>
            <div data-hero-cta className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <FancyButton href="/register">Prueba 14 días gratis</FancyButton>
              <Link href="/login">
                <button className="text-[14px] font-medium px-5 py-3 rounded-md border border-[#2a2a2a] text-[#6b6b6b] hover:text-[#ebebeb] hover:border-[#3a3a3a] transition-colors w-full sm:w-auto">
                  Iniciar sesión
                </button>
              </Link>
            </div>
            <p data-hero-note className="text-[12px] text-[#3d3d3d] mt-5">Sin tarjeta de crédito · Cancela cuando quieras</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-14 sm:mb-20">
            <p className="text-[12px] font-semibold text-[#7c3aed] uppercase tracking-widest mb-4">Funciones</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] text-[#ebebeb] mb-4">Todo lo que necesitas.</h2>
            <p className="text-[16px] text-[#6b6b6b] max-w-lg">Diseñado para barberías. Sin configuraciones complicadas.</p>
          </div>
          <div data-features-grid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {FEATURES.map(({ title, desc }) => (
              <div key={title} data-feature>
                <div className="h-1 w-6 bg-[#7c3aed] rounded-full mb-5" />
                <h3 className="font-semibold text-[15px] text-[#ebebeb] mb-2">{title}</h3>
                <p className="text-[14px] text-[#6b6b6b] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-12 sm:mb-16">
            <p className="text-[12px] font-semibold text-[#7c3aed] uppercase tracking-widest mb-4">Precio</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] text-[#ebebeb] mb-4">Un precio. Sin sorpresas.</h2>
            <p className="text-[16px] text-[#6b6b6b]">Sin comisiones por cita. Sin contratos. Sin letra chica.</p>
          </div>
          <div data-pricing-card className="max-w-sm border border-[#1f1f1f] rounded-xl bg-[#111111] p-7 sm:p-8">
            <div className="mb-8">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[48px] sm:text-[52px] font-bold text-[#ebebeb] tracking-tight">$499</span>
                <span className="text-[16px] text-[#6b6b6b] font-normal">MXN / mes</span>
              </div>
              <p className="text-[13px] text-[#3d3d3d]">14 días gratis, sin tarjeta de crédito</p>
            </div>
            <ul className="space-y-3.5 mb-8">
              {['Bot de WhatsApp 24/7 con IA', 'Dashboard web y móvil', 'Hasta 5 barberos', 'Recordatorios automáticos', 'Sin límite de citas', 'Soporte directo por WhatsApp'].map(f => (
                <li key={f} className="flex items-center gap-3">
                  <Check className="h-4 w-4 text-[#7c3aed] shrink-0" />
                  <span className="text-[14px] text-[#ebebeb]">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="block">
              <button className="w-full py-3 rounded-md bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium text-[15px] transition-colors">
                Empezar — 14 días gratis
              </button>
            </Link>
            <p className="text-center text-[12px] text-[#3d3d3d] mt-4">Sin tarjeta en la prueba · Cancela cuando quieras</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-12 sm:mb-16">
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] text-[#ebebeb]">Preguntas frecuentes.</h2>
          </div>
          <div data-faq-list className="max-w-2xl">
            {FAQ.map(({ q, a }, i) => (
              <div key={q} data-faq className={`py-6 sm:py-7 ${i < FAQ.length - 1 ? 'border-b border-[#1f1f1f]' : ''}`}>
                <p className="font-semibold text-[15px] text-[#ebebeb] mb-2">{q}</p>
                <p className="text-[14px] text-[#6b6b6b] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1f1f1f]">
        <div data-cta className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <h2 className="text-[38px] sm:text-[56px] font-bold tracking-[-0.03em] text-[#ebebeb] mb-4">Empieza hoy.</h2>
          <p className="text-[16px] text-[#6b6b6b] mb-10">14 días sin tarjeta. Sin compromiso.</p>
          <FancyButton href="/register">Crear cuenta gratis</FancyButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logotrans.png" alt="Turno" style={{ height: 28, width: 'auto', filter: 'brightness(0) invert(1)' }} />
          </Link>
          <p className="text-[13px] text-[#3d3d3d]">© 2026 Turno · Hecho en México</p>
        </div>
      </footer>

    </div>
  )
}
