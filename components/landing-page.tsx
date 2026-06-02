'use client'

import { useLayoutEffect, useRef } from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { StarField } from '@/components/star-field'
import { FancyButton } from '@/components/ui/fancy-button'
import { TurnoLogo } from '@/components/ui/turno-logo'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

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
  { q: '¿Qué pasa al terminar los 14 días?', a: 'Te pedimos una tarjeta para continuar. Si decides no seguir, tu cuenta se pausa sin ningún cargo.' },
  { q: '¿Puedo cancelar cuando quiera?', a: 'Sí. Sin penalizaciones ni letras chicas. Cancelas desde tu cuenta en menos de un minuto.' },
]

export function LandingPage() {
  const root = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {

      // ── Nav ─────────────────────────────────────────────
      gsap.fromTo('[data-nav]',
        { y: -30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }
      )

      // ── Hero stagger ─────────────────────────────────────
      gsap.fromTo('[data-hero-badge]',
        { y: 24, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', delay: 0.2 }
      )
      gsap.fromTo('[data-hero-h1]',
        { y: 40, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out', delay: 0.35 }
      )
      gsap.fromTo('[data-hero-p]',
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.65, ease: 'power3.out', delay: 0.5 }
      )
      gsap.fromTo('[data-hero-cta]',
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.55, ease: 'power3.out', delay: 0.65 }
      )
      gsap.fromTo('[data-hero-note]',
        { opacity: 0 },
        { opacity: 1, duration: 0.5, delay: 0.8 }
      )

      // ── Section heads (scroll) ───────────────────────────
      gsap.utils.toArray<HTMLElement>('[data-section-head]').forEach(el => {
        gsap.fromTo(el,
          { y: 40, opacity: 0 },
          {
            y: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
            scrollTrigger: { trigger: el, start: 'top 88%' },
          }
        )
      })

      // ── Feature cards stagger ────────────────────────────
      gsap.fromTo('[data-feature]',
        { y: 40, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: '[data-features-grid]', start: 'top 82%' },
        }
      )

      // ── Pricing card ─────────────────────────────────────
      gsap.fromTo('[data-pricing-card]',
        { x: -50, opacity: 0 },
        {
          x: 0, opacity: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: '[data-pricing-card]', start: 'top 85%' },
        }
      )

      // ── FAQ ──────────────────────────────────────────────
      gsap.fromTo('[data-faq]',
        { y: 24, opacity: 0 },
        {
          y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', stagger: 0.1,
          scrollTrigger: { trigger: '[data-faq-list]', start: 'top 85%' },
        }
      )

      // ── CTA ──────────────────────────────────────────────
      gsap.fromTo('[data-cta]',
        { y: 30, opacity: 0, scale: 0.97 },
        {
          y: 0, opacity: 1, scale: 1, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: '[data-cta]', start: 'top 88%' },
        }
      )

    }, root)

    return () => ctx.revert()
  }, [])

  return (
    <div ref={root} className="min-h-screen bg-[#0c0c0c] text-[#ebebeb]" style={{ fontFamily: 'var(--font-geist-sans)' }}>

      {/* Nav */}
      <header data-nav className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#0c0c0c]/90 backdrop-blur-md" style={{ opacity: 0 }}>
        <div className="max-w-5xl mx-auto px-5 flex items-center justify-between" style={{ height: '56px' }}>
          <Link href="/" style={{ color: '#ffffff' }}>
            <TurnoLogo height={36} />
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[#6b6b6b]">
            <a href="#features" className="hover:text-[#ebebeb] transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-[#ebebeb] transition-colors">Precio</a>
            <a href="#faq" className="hover:text-[#ebebeb] transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login" className="text-[13px] text-[#6b6b6b] hover:text-[#ebebeb] transition-colors">Entrar</Link>
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
            <p data-hero-badge className="text-[12px] font-semibold text-[#7c3aed] mb-5 tracking-widest uppercase" style={{ opacity: 0 }}>
              Asistente de WhatsApp con IA · Agenda 24/7
            </p>
            <h1 data-hero-h1 className="text-[40px] sm:text-[58px] lg:text-[72px] font-bold leading-[1.06] tracking-[-0.03em] text-[#ebebeb] mb-6" style={{ opacity: 0 }}>
              Tu consulta agenda<br />citas sola.
            </h1>
            <p data-hero-p className="text-[16px] sm:text-[19px] text-[#6b6b6b] leading-relaxed mb-9 max-w-xl" style={{ opacity: 0 }}>
              Un asistente de IA responde WhatsApp 24/7, agenda sin errores y
              muestra todo en un dashboard limpio. Para barberías, consultorios,
              clínicas dentales y más.
            </p>
            <div data-hero-cta className="flex flex-col sm:flex-row items-start sm:items-center gap-3" style={{ opacity: 0 }}>
              <FancyButton href="/register">Prueba 14 días gratis</FancyButton>
              <Link href="/login">
                <button className="text-[14px] font-medium px-5 py-3 rounded-md border border-[#2a2a2a] text-[#6b6b6b] hover:text-[#ebebeb] hover:border-[#3a3a3a] transition-colors w-full sm:w-auto">
                  Iniciar sesión
                </button>
              </Link>
            </div>
            <p data-hero-note className="text-[12px] text-[#3d3d3d] mt-5" style={{ opacity: 0 }}>
              Sin tarjeta de crédito · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-14 sm:mb-20" style={{ opacity: 0 }}>
            <p className="text-[12px] font-semibold text-[#7c3aed] uppercase tracking-widest mb-4">Funciones</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] text-[#ebebeb] mb-4">Todo lo que necesitas.</h2>
            <p className="text-[16px] text-[#6b6b6b] max-w-lg">Diseñado para cualquier negocio de citas. Sin configuraciones complicadas.</p>
          </div>
          <div data-features-grid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-12">
            {FEATURES.map(({ title, desc }) => (
              <div key={title} data-feature style={{ opacity: 0 }}>
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
          <div data-section-head className="mb-12 sm:mb-16" style={{ opacity: 0 }}>
            <p className="text-[12px] font-semibold text-[#7c3aed] uppercase tracking-widest mb-4">Precio</p>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] text-[#ebebeb] mb-4">Elige tu plan.</h2>
            <p className="text-[16px] text-[#6b6b6b] max-w-lg">Sin comisiones. Sin contratos. Sin letra chica.</p>
          </div>

          {/* Individual plans */}
          <div data-pricing-card style={{ opacity: 0 }}>
            <p className="text-[11px] font-semibold text-[#3d3d3d] uppercase tracking-widest mb-5">Planes individuales</p>
            <div className="grid sm:grid-cols-3 gap-4 mb-10">
              {[
                {
                  name: 'Landing',
                  price: '$899',
                  desc: 'Presencia digital para tu negocio',
                  features: ['Página web profesional', 'Formulario de contacto', 'SEO básico', 'Dominio incluido 1 año'],
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
                <div key={name} className={`rounded-xl border p-6 ${highlight ? 'border-[#7c3aed] bg-[#7c3aed]/5' : 'border-[#1f1f1f] bg-[#111111]'}`}>
                  {highlight && (
                    <span className="inline-block text-[10px] font-semibold text-[#7c3aed] uppercase tracking-widest border border-[#7c3aed]/40 rounded-full px-2.5 py-0.5 mb-3">Popular</span>
                  )}
                  <p className="text-[13px] font-semibold text-[#ebebeb] mb-1">{name}</p>
                  <p className="text-[11px] text-[#6b6b6b] mb-4">{desc}</p>
                  <div className="flex items-baseline gap-1 mb-5">
                    <span className="text-[32px] font-bold text-[#ebebeb] tracking-tight">{price}</span>
                    <span className="text-[13px] text-[#6b6b6b]">MXN/mes</span>
                  </div>
                  <ul className="space-y-2.5 mb-6">
                    {features.map(f => (
                      <li key={f} className="flex items-center gap-2.5">
                        <Check className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                        <span className="text-[13px] text-[#6b6b6b]">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/register" className="block">
                    <button className={`w-full py-2.5 rounded-md text-[13px] font-medium transition-colors ${highlight ? 'bg-[#7c3aed] hover:bg-[#6d28d9] text-white' : 'border border-[#2a2a2a] text-[#6b6b6b] hover:text-[#ebebeb] hover:border-[#3a3a3a]'}`}>
                      Empezar gratis
                    </button>
                  </Link>
                </div>
              ))}
            </div>

            {/* Bundle plans */}
            <p className="text-[11px] font-semibold text-[#3d3d3d] uppercase tracking-widest mb-5">Combos (ahorra más)</p>
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
                <div key={name} className="rounded-xl border border-[#1f1f1f] bg-[#111111] p-6 flex flex-col sm:flex-row gap-6 items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[13px] font-semibold text-[#ebebeb]">{name}</p>
                      <span className="text-[10px] font-medium text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full">{saving}</span>
                    </div>
                    <ul className="space-y-2 mt-3">
                      {features.map(f => (
                        <li key={f} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-[#7c3aed] shrink-0" />
                          <span className="text-[12px] text-[#6b6b6b]">{f}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="flex items-baseline gap-1 justify-end mb-3">
                      <span className="text-[28px] font-bold text-[#ebebeb] tracking-tight">{price}</span>
                      <span className="text-[12px] text-[#6b6b6b]">MXN/mes</span>
                    </div>
                    <Link href="/register">
                      <button className="px-4 py-2 rounded-md bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-[13px] font-medium transition-colors whitespace-nowrap">
                        Empezar gratis
                      </button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[12px] text-[#3d3d3d] mt-6 text-center">14 días gratis en todos los planes · Sin tarjeta · Cancela cuando quieras</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5 py-20 sm:py-28">
          <div data-section-head className="mb-12 sm:mb-16" style={{ opacity: 0 }}>
            <h2 className="text-[30px] sm:text-[42px] font-bold tracking-[-0.02em] text-[#ebebeb]">Preguntas frecuentes.</h2>
          </div>
          <div data-faq-list className="max-w-2xl">
            {FAQ.map(({ q, a }, i) => (
              <div key={q} data-faq className={`py-6 sm:py-7 ${i < FAQ.length - 1 ? 'border-b border-[#1f1f1f]' : ''}`} style={{ opacity: 0 }}>
                <p className="font-semibold text-[15px] text-[#ebebeb] mb-2">{q}</p>
                <p className="text-[14px] text-[#6b6b6b] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1f1f1f]">
        <div data-cta className="max-w-5xl mx-auto px-5 py-20 sm:py-28" style={{ opacity: 0 }}>
          <h2 className="text-[38px] sm:text-[56px] font-bold tracking-[-0.03em] text-[#ebebeb] mb-4">Empieza hoy.</h2>
          <p className="text-[16px] text-[#6b6b6b] mb-3">14 días sin tarjeta. Sin compromiso.</p>
          <p className="text-[13px] text-[#3d3d3d] mb-10">Barberías · Psicología · Odontología · Fisioterapia · y más</p>
          <FancyButton href="/register">Crear cuenta gratis</FancyButton>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-5 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <Link href="/" style={{ color: '#ffffff' }}>
            <TurnoLogo height={28} />
          </Link>
          <p className="text-[13px] text-[#3d3d3d]">© 2026 Turno · Hecho en México</p>
          <a
            href="https://axelsandoval.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] text-[#3d3d3d] hover:text-[#6b6b6b] transition-colors"
          >
            axelsandoval.dev
          </a>
        </div>
      </footer>

    </div>
  )
}
