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
    <div className="min-h-screen bg-[#0a0010] text-white" style={{ fontFamily: 'var(--font-geist-sans)' }}>

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0010]/80 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Turno" width={32} height={32} priority style={{ filter: 'brightness(0) invert(1)' }} />
            <span className="font-bold text-lg tracking-tight">Turno</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-white/50">
            <a href="#features" className="hover:text-white transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-white transition-colors">Precio</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register">
              <button className="text-sm font-semibold px-5 py-2.5 rounded-full text-white"
                style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)' }}>
                Empezar gratis
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="relative pt-40 pb-32 px-6 max-w-6xl mx-auto text-center overflow-hidden">
        {/* Glow background */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full blur-[120px] opacity-30 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse, #A91079 0%, #2E0249 60%, transparent 100%)' }} />

        <div className="relative">
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/5 text-white/70 text-xs font-medium px-4 py-2 rounded-full mb-8 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Bot activo 24/7 · Sin instalaciones
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[80px] font-bold leading-[1.05] tracking-tight mb-6">
            Tu barbería agenda<br />
            <span className="relative inline-block">
              <span style={{ background: 'linear-gradient(135deg, #A91079, #F806CC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                citas sola.
              </span>
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-white/50 max-w-2xl mx-auto mb-10 leading-relaxed">
            Un asistente de IA responde WhatsApp 24/7, agenda citas sin errores
            y te muestra todo en un dashboard. Tú solo cortas.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Link href="/register">
              <button className="flex items-center gap-2 text-white font-semibold px-8 py-4 rounded-full text-base shadow-lg shadow-purple-900/40 hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)' }}>
                Prueba 14 días gratis
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/login" className="text-sm text-white/40 hover:text-white/70 transition-colors">
              Ya tengo cuenta →
            </Link>
          </div>

          <p className="text-xs text-white/30 mt-5">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* ── Dashboard mockup ────────────────────────────────── */}
      <section className="px-6 max-w-5xl mx-auto pb-32">
        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-[0_0_80px_rgba(169,16,121,0.15)]">
          {/* Browser bar */}
          <div className="bg-[#12001a] border-b border-white/10 px-5 py-3 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
              <div className="h-3 w-3 rounded-full bg-white/10" />
            </div>
            <div className="h-6 rounded-md bg-white/5 border border-white/10 flex-1 max-w-xs flex items-center px-3">
              <span className="text-[11px] text-white/30">turno.app/appointments</span>
            </div>
          </div>
          {/* Dashboard UI */}
          <div className="bg-[#0d0018] p-6 space-y-4">
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: 'Citas hoy', value: '8' },
                { label: 'Completadas', value: '5' },
                { label: 'Ingresos', value: '$800' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[11px] text-white/40 uppercase tracking-wider mb-2">{s.label}</p>
                  <p className="text-3xl font-bold">{s.value}</p>
                </div>
              ))}
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_160px_110px] px-5 py-3 border-b border-white/10">
                {['Hora', 'Cliente', 'Servicio', 'Estado'].map(h => (
                  <span key={h} className="text-[11px] text-white/30 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {[
                { time: '10:00', name: 'Carlos M.', service: 'Corte + Barba', done: false },
                { time: '10:30', name: 'Luis R.', service: 'Corte', done: false },
                { time: '11:00', name: 'Miguel A.', service: 'Fade', done: true },
                { time: '11:30', name: 'Andrés V.', service: 'Corte + Barba', done: true },
              ].map((r, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_160px_110px] px-5 py-3.5 border-b border-white/5 last:border-0">
                  <span className="text-sm font-mono text-white/40">{r.time}</span>
                  <span className="text-sm font-medium">{r.name}</span>
                  <span className="text-sm text-white/40">{r.service}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full w-fit ${
                    r.done ? 'bg-white/10 text-white/40' : 'text-white'
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
      <section id="features" className="border-t border-white/10 px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 tracking-widest uppercase mb-4">Funciones</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Todo lo que necesitas,<br />nada de lo que no.
          </h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[
            { icon: MessageCircle, title: 'Bot de WhatsApp 24/7', desc: 'Responde mensajes, agenda, cancela y reagenda citas automáticamente. Sin que tú hagas nada.' },
            { icon: CalendarCheck, title: 'Cero doble booking', desc: 'Verifica disponibilidad en tiempo real antes de confirmar. Nunca dos clientes a la misma hora.' },
            { icon: Clock, title: 'Recordatorios automáticos', desc: 'WhatsApp 1 hora antes de cada cita. Reduce no-shows hasta 60%.' },
            { icon: BarChart3, title: 'Dashboard en tiempo real', desc: 'Ve tus citas del día, actualiza estados y gestiona tu equipo desde el celular.' },
            { icon: Shield, title: 'Sin instalar apps', desc: 'Tus clientes usan el WhatsApp que ya tienen. Sin descargas, sin fricción.' },
            { icon: Zap, title: 'Lista en 5 minutos', desc: 'Crea tu cuenta, agrega servicios y horario. Tu recepcionista está activa al instante.' },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-white/5 p-6 hover:border-white/20 hover:bg-white/[0.07] transition-all">
              <div className="h-10 w-10 rounded-xl mb-4 flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #2E0249, #A91079)' }}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 tracking-widest uppercase mb-4">Cómo funciona</p>
          <h2 className="text-4xl font-bold tracking-tight">En 3 pasos y listo.</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-10">
          {[
            { num: '01', title: 'Crea tu cuenta', desc: 'Registra tu barbería, agrega tus servicios y configura tu horario en minutos.' },
            { num: '02', title: 'Conecta WhatsApp', desc: 'Vinculamos tu número de WhatsApp Business. El bot empieza a responder al instante.' },
            { num: '03', title: 'Listo, a cobrar', desc: 'Tus clientes agendan solos. Tú ves todo en el dashboard y te concentras en trabajar.' },
          ].map(({ num, title, desc }) => (
            <div key={num} className="relative pl-12">
              <span className="absolute left-0 top-0 text-5xl font-black"
                style={{ background: 'linear-gradient(135deg, #570A57, #F806CC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                {num}
              </span>
              <div className="pt-12">
                <h3 className="font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-white/40 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-white/10 px-6 py-32 max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 tracking-widest uppercase mb-4">Precio</p>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">Un precio justo y claro.</h2>
          <p className="text-white/40 mt-4">Sin comisiones por cita. Sin contratos. Sin sorpresas.</p>
        </div>
        <div className="max-w-sm mx-auto relative">
          {/* Glow */}
          <div className="absolute inset-0 rounded-3xl blur-2xl opacity-20 pointer-events-none"
            style={{ background: 'linear-gradient(135deg, #570A57, #F806CC)' }} />
          <div className="relative rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm p-8 space-y-8">
            <div>
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-6xl font-black">$499</span>
                <span className="text-white/40">MXN/mes</span>
              </div>
              <p className="text-white/30 text-sm">14 días gratis, sin tarjeta</p>
            </div>
            <ul className="space-y-3">
              {[
                'Bot de WhatsApp 24/7 con IA',
                'Dashboard web y móvil',
                'Hasta 5 barberos',
                'Recordatorios automáticos',
                'Sin límite de citas',
                'Soporte directo por WhatsApp',
              ].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm">
                  <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#F806CC' }} />
                  <span className="text-white/70">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="block">
              <button className="w-full py-4 rounded-full font-bold text-white hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)' }}>
                Empezar — 14 días gratis
              </button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="border-t border-white/10 px-6 py-32 max-w-4xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-xs text-white/30 tracking-widest uppercase mb-4">FAQ</p>
          <h2 className="text-4xl font-bold tracking-tight">Preguntas frecuentes.</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-10">
          {[
            { q: '¿Necesito un número nuevo de WhatsApp?', a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo.' },
            { q: '¿Mis clientes tienen que instalar algo?', a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Cero fricción.' },
            { q: '¿Qué pasa al terminar los 14 días?', a: 'Te pedimos una tarjeta para continuar. Si no, tu cuenta se pausa sin cargos.' },
            { q: '¿Puedo cancelar cuando quiera?', a: 'Sí, sin penalizaciones. Cancelas desde tu cuenta en un clic.' },
          ].map(({ q, a }) => (
            <div key={q} className="space-y-2 border-b border-white/10 pb-8">
              <h3 className="font-semibold">{q}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────── */}
      <section className="border-t border-white/10 px-6 py-32 text-center relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 100%, rgba(169,16,121,0.2) 0%, transparent 70%)' }} />
        <div className="relative max-w-3xl mx-auto">
          <h2 className="text-5xl sm:text-7xl font-black tracking-tight mb-6">
            Empieza hoy,<br />
            <span style={{ background: 'linear-gradient(135deg, #A91079, #F806CC)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              gratis.
            </span>
          </h2>
          <p className="text-white/40 text-lg mb-10">14 días sin tarjeta. Sin compromiso. Sin letra chica.</p>
          <Link href="/register">
            <button className="inline-flex items-center gap-2 text-white font-bold px-10 py-5 rounded-full text-lg hover:opacity-90 transition-opacity shadow-xl shadow-purple-900/40"
              style={{ background: 'linear-gradient(135deg, #570A57, #A91079, #F806CC)' }}>
              Crear mi cuenta gratis
              <ArrowRight className="h-5 w-5" />
            </button>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-white/10 px-8 py-8">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="Turno" width={24} height={24} className="invert opacity-60" />
            <span className="text-sm font-semibold text-white/60">Turno</span>
          </div>
          <p className="text-xs text-white/20">© 2026 Turno · Hecho en México 🇲🇽</p>
          <div className="flex gap-6">
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Privacidad</a>
            <a href="#" className="text-xs text-white/30 hover:text-white/60 transition-colors">Términos</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
