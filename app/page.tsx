import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, CheckCircle, CalendarCheck, MessageCircle, Clock, BarChart3, Zap, Shield } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.organization_id) redirect('/appointments')

  return (
    <div className="min-h-screen bg-white text-[#0a0010]" style={{ fontFamily: 'var(--font-geist-sans)' }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Turno" width={28} height={28} priority />
            <span className="font-bold text-lg tracking-tight">Turno</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-500">
            <a href="#features" className="hover:text-neutral-900 transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-neutral-900 transition-colors">Precio</a>
            <a href="#faq" className="hover:text-neutral-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-neutral-500 hover:text-neutral-900 transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register">
              <button className="text-sm font-semibold px-4 py-2 rounded-lg text-white transition-opacity hover:opacity-90"
                style={{ background: 'linear-gradient(135deg, #570A57, #A91079)' }}>
                Empezar gratis
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 text-center">
        <div className="inline-flex items-center gap-2 bg-[#f5f0ff] text-[#A91079] text-xs font-semibold px-3 py-1.5 rounded-full mb-8">
          <span className="w-1.5 h-1.5 rounded-full bg-[#A91079]" />
          Bot activo 24/7 · Sin instalaciones
        </div>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-[1.08] tracking-tight mb-6 text-neutral-900">
          Tu barbería agenda<br />
          <span style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            citas sola.
          </span>
        </h1>

        <p className="text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Un asistente de IA responde WhatsApp 24/7, agenda citas sin errores
          y te muestra todo en un dashboard limpio. Tú solo cortas.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/register">
            <button className="flex items-center gap-2 text-white font-semibold px-7 py-3.5 rounded-xl text-base hover:opacity-90 transition-opacity shadow-lg shadow-purple-200"
              style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)' }}>
              Prueba 14 días gratis
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
          <Link href="/login">
            <button className="flex items-center gap-2 text-neutral-600 font-medium px-7 py-3.5 rounded-xl text-base border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 transition-all">
              Ya tengo cuenta
            </button>
          </Link>
        </div>
        <p className="text-xs text-neutral-400 mt-4">Sin tarjeta de crédito · Cancela cuando quieras</p>
      </section>

      {/* ── Dashboard mockup ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 pb-28">
        <div className="rounded-2xl border border-neutral-200 overflow-hidden shadow-[0_8px_60px_rgba(169,16,121,0.08)]">
          <div className="bg-neutral-50 border-b border-neutral-200 px-5 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-neutral-300" />
              <div className="h-3 w-3 rounded-full bg-neutral-300" />
              <div className="h-3 w-3 rounded-full bg-neutral-300" />
            </div>
            <div className="h-6 rounded-md bg-white border border-neutral-200 flex-1 max-w-xs flex items-center px-3">
              <span className="text-[11px] text-neutral-400">turno.app/appointments</span>
            </div>
          </div>
          <div className="bg-white p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Citas hoy', value: '8' },
                { label: 'Completadas', value: '5' },
                { label: 'Ingresos', value: '$800' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-neutral-100 bg-neutral-50 p-4">
                  <p className="text-xs text-neutral-400 mb-1">{s.label}</p>
                  <p className="text-2xl font-bold text-neutral-900">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-neutral-100 overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_160px_110px] px-5 py-2.5 bg-neutral-50 border-b border-neutral-100">
                {['Hora', 'Cliente', 'Servicio', 'Estado'].map(h => (
                  <span key={h} className="text-xs text-neutral-400 font-medium uppercase tracking-wide">{h}</span>
                ))}
              </div>
              {[
                { time: '10:00', name: 'Carlos M.', service: 'Corte + Barba', done: false },
                { time: '10:30', name: 'Luis R.', service: 'Corte', done: false },
                { time: '11:00', name: 'Miguel A.', service: 'Fade', done: true },
                { time: '11:30', name: 'Andrés V.', service: 'Corte + Barba', done: true },
              ].map((r, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_160px_110px] px-5 py-3.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors">
                  <span className="text-sm font-mono text-neutral-400">{r.time}</span>
                  <span className="text-sm font-medium text-neutral-900">{r.name}</span>
                  <span className="text-sm text-neutral-400">{r.service}</span>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full w-fit ${
                    r.done ? 'bg-neutral-100 text-neutral-500' : 'text-white'
                  }`} style={!r.done ? { background: 'linear-gradient(135deg, #570A57, #A91079)' } : {}}>
                    {r.done ? 'Completada' : 'Confirmada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section id="features" className="border-t border-neutral-100 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4 text-neutral-900">
              Todo lo que necesitas,<br />nada de lo que no.
            </h2>
            <p className="text-neutral-500 max-w-xl mx-auto">Diseñado para barberías. Sin configuraciones complicadas.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: MessageCircle, title: 'Bot de WhatsApp 24/7', desc: 'Responde mensajes, agenda y cancela citas automáticamente. Sin que tú hagas nada.' },
              { icon: CalendarCheck, title: 'Cero doble booking', desc: 'Verifica disponibilidad en tiempo real. Nunca dos clientes a la misma hora.' },
              { icon: Clock, title: 'Recordatorios automáticos', desc: 'WhatsApp 1 hora antes de cada cita. Reduce no-shows hasta 60%.' },
              { icon: BarChart3, title: 'Dashboard en tiempo real', desc: 'Ve tus citas del día y gestiona tu equipo desde el celular o compu.' },
              { icon: Shield, title: 'Sin instalar apps', desc: 'Tus clientes usan el WhatsApp que ya tienen. Cero fricción.' },
              { icon: Zap, title: 'Lista en 5 minutos', desc: 'Crea cuenta, agrega servicios y horario. Tu recepcionista activa al instante.' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-neutral-200 p-6 hover:shadow-md hover:border-neutral-300 transition-all">
                <div className="h-9 w-9 rounded-lg mb-4 flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #2E0249, #A91079)' }}>
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900 mb-1.5">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3 text-neutral-900">Un precio justo y claro.</h2>
          <p className="text-neutral-500">Sin comisiones por cita. Sin contratos. Sin sorpresas.</p>
        </div>
        <div className="max-w-sm mx-auto border border-neutral-200 rounded-2xl p-8 shadow-sm bg-white">
          <div className="mb-6">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-black text-neutral-900">$499</span>
              <span className="text-neutral-400 text-lg">MXN/mes</span>
            </div>
            <p className="text-sm text-neutral-400 mt-1">14 días gratis, sin tarjeta</p>
          </div>
          <ul className="space-y-3 mb-8">
            {[
              'Bot de WhatsApp 24/7 con IA',
              'Dashboard web y móvil',
              'Hasta 5 barberos',
              'Recordatorios automáticos',
              'Sin límite de citas',
              'Soporte directo por WhatsApp',
            ].map(f => (
              <li key={f} className="flex items-center gap-3 text-sm text-neutral-700">
                <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#A91079' }} />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/register" className="block">
            <button className="w-full py-3.5 rounded-xl font-semibold text-white hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)' }}>
              Empezar — 14 días gratis
            </button>
          </Link>
          <p className="text-center text-xs text-neutral-400 mt-3">Sin tarjeta de crédito en la prueba</p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="border-t border-neutral-100 bg-neutral-50">
        <div className="max-w-3xl mx-auto px-6 py-24">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12 text-neutral-900">Preguntas frecuentes.</h2>
          <div className="grid md:grid-cols-2 gap-x-12 gap-y-8">
            {[
              { q: '¿Necesito un número nuevo de WhatsApp?', a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo.' },
              { q: '¿Mis clientes tienen que instalar algo?', a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Cero fricción.' },
              { q: '¿Qué pasa al terminar los 14 días?', a: 'Te pedimos una tarjeta para continuar. Si no, tu cuenta se pausa sin cargos.' },
              { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin penalizaciones. Cancelas desde tu cuenta en un clic.' },
            ].map(({ q, a }) => (
              <div key={q} className="border-b border-neutral-200 pb-6">
                <h3 className="font-semibold text-neutral-900 mb-2">{q}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-24 text-center">
        <h2 className="text-4xl sm:text-5xl font-black tracking-tight mb-4 text-neutral-900">
          Empieza hoy, gratis.
        </h2>
        <p className="text-neutral-500 mb-8 text-lg">14 días sin tarjeta. Sin compromiso.</p>
        <Link href="/register">
          <button className="inline-flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-xl text-base hover:opacity-90 transition-opacity shadow-lg shadow-purple-100"
            style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)' }}>
            Crear mi cuenta gratis
            <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Turno" width={22} height={22} priority />
            <span className="text-sm font-semibold text-neutral-600">Turno</span>
          </div>
          <p className="text-xs text-neutral-400">© 2026 Turno · Hecho en México 🇲🇽</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">Privacidad</a>
            <a href="#" className="text-xs text-neutral-400 hover:text-neutral-600 transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
