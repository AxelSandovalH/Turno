import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  CalendarCheck, MessageCircle, Clock, BarChart3,
  CheckCircle, ArrowRight, Zap, Shield, Star,
} from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.organization_id) redirect('/appointments')

  return (
    <div className="min-h-screen bg-white text-neutral-900">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-neutral-100 bg-white/95 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-neutral-900 flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-bold text-lg tracking-tight">Turno</span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-500">
            <a href="#features" className="hover:text-neutral-900 transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-neutral-900 transition-colors">Precio</a>
            <a href="#faq" className="hover:text-neutral-900 transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="text-neutral-600 hover:text-neutral-900">
                Iniciar sesión
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm" className="bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg px-4">
                Empezar gratis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-24 text-center">
        <Badge variant="secondary" className="mb-6 bg-neutral-100 text-neutral-700 border-0 px-4 py-1.5 text-xs font-medium rounded-full">
          ✦ 14 días gratis · Sin tarjeta de crédito
        </Badge>

        <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tight leading-[1.1] mb-6 text-neutral-900">
          Tu barbería agenda<br />
          <span className="text-neutral-400">citas sola.</span>
        </h1>

        <p className="text-xl text-neutral-500 max-w-2xl mx-auto mb-10 leading-relaxed">
          Un asistente de IA responde WhatsApp 24/7, agenda citas sin errores
          y te muestra todo en un dashboard limpio. Tú solo cortas.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
          <Link href="/register">
            <Button size="lg" className="bg-neutral-900 hover:bg-neutral-800 text-white h-12 px-8 rounded-xl text-base font-medium gap-2">
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="h-12 px-8 rounded-xl text-base border-neutral-200 text-neutral-600 hover:border-neutral-300">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>

        {/* Social proof */}
        <div className="mt-12 flex items-center justify-center gap-6 text-sm text-neutral-400">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-2">
              {['A','B','C','D'].map(l => (
                <div key={l} className="h-7 w-7 rounded-full bg-neutral-200 border-2 border-white flex items-center justify-center text-xs font-bold text-neutral-600">
                  {l}
                </div>
              ))}
            </div>
            <span>+40 barberías</span>
          </div>
          <div className="h-4 w-px bg-neutral-200" />
          <div className="flex items-center gap-1">
            {[1,2,3,4,5].map(i => <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />)}
            <span className="ml-1">5.0</span>
          </div>
        </div>
      </section>

      {/* ── Dashboard preview ───────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="rounded-2xl border border-neutral-200 bg-neutral-50 overflow-hidden shadow-sm">
          {/* Fake browser bar */}
          <div className="border-b border-neutral-200 bg-white px-4 py-3 flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-neutral-200" />
              <div className="h-3 w-3 rounded-full bg-neutral-200" />
              <div className="h-3 w-3 rounded-full bg-neutral-200" />
            </div>
            <div className="flex-1 mx-4 h-6 rounded bg-neutral-100 max-w-xs flex items-center px-3">
              <span className="text-xs text-neutral-400">turno.app/appointments</span>
            </div>
          </div>
          {/* Fake dashboard */}
          <div className="p-6 space-y-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Citas hoy', value: '8', color: 'bg-white' },
                { label: 'Completadas', value: '5', color: 'bg-white' },
                { label: 'Ingresos', value: '$800', color: 'bg-white' },
              ].map(c => (
                <div key={c.label} className={`${c.color} rounded-xl border border-neutral-200 p-4`}>
                  <p className="text-xs text-neutral-500 mb-1">{c.label}</p>
                  <p className="text-2xl font-bold text-neutral-900">{c.value}</p>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-neutral-200 p-4 space-y-3">
              {[
                { time: '10:00', name: 'Carlos M.', service: 'Corte + Barba', status: 'Confirmada' },
                { time: '10:30', name: 'Luis R.', service: 'Corte', status: 'Confirmada' },
                { time: '11:00', name: 'Miguel A.', service: 'Corte + Barba', status: 'Completada' },
              ].map(a => (
                <div key={a.time} className="flex items-center gap-4 py-2 border-b border-neutral-100 last:border-0">
                  <span className="font-mono text-sm text-neutral-500 w-12">{a.time}</span>
                  <span className="font-medium text-sm flex-1">{a.name}</span>
                  <span className="text-sm text-neutral-400">{a.service}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    a.status === 'Completada'
                      ? 'bg-neutral-100 text-neutral-500'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>{a.status}</span>
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
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
              Todo lo que necesitas, nada de lo que no
            </h2>
            <p className="text-neutral-500 text-lg max-w-xl mx-auto">
              Diseñado específicamente para barberías. Sin configuraciones complicadas.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: MessageCircle,
                title: 'Bot de WhatsApp con IA',
                desc: 'Responde mensajes, agenda, cancela y reagenda citas automáticamente. Sin que tú tengas que tocar el teléfono.',
              },
              {
                icon: CalendarCheck,
                title: 'Cero doble booking',
                desc: 'Verifica disponibilidad en tiempo real antes de confirmar. Nunca dos clientes a la misma hora.',
              },
              {
                icon: Clock,
                title: 'Recordatorios automáticos',
                desc: 'Manda recordatorio por WhatsApp 1 hora antes. Reduce los no-shows hasta un 60%.',
              },
              {
                icon: BarChart3,
                title: 'Dashboard en tiempo real',
                desc: 'Ve tus citas del día, actualiza estados y gestiona tu equipo desde el celular o la compu.',
              },
              {
                icon: Shield,
                title: 'Sin instalar apps',
                desc: 'Tus clientes usan el WhatsApp que ya tienen. Sin descargas, sin registros, sin fricción.',
              },
              {
                icon: Zap,
                title: 'Lista en 5 minutos',
                desc: 'Crea tu cuenta, agrega tus servicios y horario. En 5 minutos tu recepcionista está activa.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-3">
                <div className="h-10 w-10 bg-neutral-900 rounded-xl flex items-center justify-center">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="font-semibold text-neutral-900">{title}</h3>
                <p className="text-sm text-neutral-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Así de simple funciona
          </h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-8">
          {[
            {
              step: '01',
              title: 'Crea tu cuenta',
              desc: 'Registra tu barbería, agrega tus servicios y configura tu horario en minutos.',
            },
            {
              step: '02',
              title: 'Conecta WhatsApp',
              desc: 'Vinculamos tu número de WhatsApp Business. El bot empieza a responder al instante.',
            },
            {
              step: '03',
              title: 'Listo, a cobrar',
              desc: 'Tus clientes agendan solos. Tú ves todo en el dashboard y te concentras en trabajar.',
            },
          ].map(({ step, title, desc }) => (
            <div key={step} className="text-center space-y-4">
              <div className="text-5xl font-bold text-neutral-100 tabular-nums">{step}</div>
              <h3 className="font-semibold text-lg text-neutral-900">{title}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section id="pricing" className="border-t border-neutral-100 bg-neutral-50">
        <div className="max-w-6xl mx-auto px-6 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-4">
            Un precio justo y claro
          </h2>
          <p className="text-neutral-500 mb-12 text-lg">Sin comisiones por cita. Sin sorpresas.</p>

          <div className="max-w-sm mx-auto bg-white border border-neutral-200 rounded-2xl p-8 shadow-sm space-y-8 text-left">
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-5xl font-bold text-neutral-900">$499</span>
                <span className="text-neutral-400 text-lg">MXN/mes</span>
              </div>
              <p className="text-neutral-500 text-sm mt-1">O paga anual y ahorra 2 meses</p>
            </div>

            <ul className="space-y-3">
              {[
                'Bot de WhatsApp 24/7 con IA',
                'Dashboard web y móvil',
                'Hasta 5 barberos',
                'Recordatorios automáticos',
                'Sin límite de citas',
                'Soporte por WhatsApp',
              ].map(f => (
                <li key={f} className="flex items-center gap-3 text-sm text-neutral-700">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>

            <Link href="/register" className="block">
              <Button className="w-full bg-neutral-900 hover:bg-neutral-800 text-white h-12 rounded-xl text-base font-medium">
                Empezar — 14 días gratis
              </Button>
            </Link>
            <p className="text-xs text-neutral-400 text-center">Sin tarjeta de crédito en la prueba</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold tracking-tight text-center mb-12">Preguntas frecuentes</h2>
        <div className="space-y-6">
          {[
            {
              q: '¿Necesito un número de WhatsApp nuevo?',
              a: 'No. Puedes usar tu número actual de WhatsApp Business o uno dedicado. Te ayudamos a configurarlo.',
            },
            {
              q: '¿Qué pasa cuando terminen los 14 días?',
              a: 'Te pedimos una tarjeta para continuar. Si decides no seguir, tu cuenta se desactiva sin cargos.',
            },
            {
              q: '¿Mis clientes tienen que instalar algo?',
              a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Cero fricción para ellos.',
            },
            {
              q: '¿Puedo cancelar cuando quiera?',
              a: 'Sí, sin penalizaciones. Cancelas desde tu cuenta y no se hace ningún cargo adicional.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="border-b border-neutral-100 pb-6">
              <h3 className="font-semibold text-neutral-900 mb-2">{q}</h3>
              <p className="text-neutral-500 text-sm leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────── */}
      <section className="border-t border-neutral-100">
        <div className="max-w-3xl mx-auto px-6 py-24 text-center space-y-6">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight">
            Empieza hoy, gratis.
          </h2>
          <p className="text-neutral-500 text-lg">
            14 días sin tarjeta. Cancela cuando quieras. Sin letra chica.
          </p>
          <Link href="/register">
            <Button size="lg" className="bg-neutral-900 hover:bg-neutral-800 text-white h-13 px-10 rounded-xl text-base font-medium gap-2 mt-2">
              Crear mi cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-400">
          <div className="flex items-center gap-2">
            <div className="h-5 w-5 rounded bg-neutral-900 flex items-center justify-center">
              <Zap className="h-3 w-3 text-white" />
            </div>
            <span className="font-medium text-neutral-600">Turno</span>
          </div>
          <p>© 2026 Turno · Hecho en México 🇲🇽</p>
          <div className="flex gap-6">
            <a href="#" className="hover:text-neutral-600 transition-colors">Privacidad</a>
            <a href="#" className="hover:text-neutral-600 transition-colors">Términos</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
