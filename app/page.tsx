import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowRight, Check } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.organization_id) redirect('/appointments')

  return (
    <div className="min-h-screen bg-[#0c0c0c] text-[#ebebeb]" style={{ fontFamily: 'var(--font-geist-sans)' }}>

      {/* Nav */}
      <header className="sticky top-0 z-50 border-b border-[#1f1f1f] bg-[#0c0c0c]/90 backdrop-blur-md">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between" style={{ height: '60px' }}>
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/logo.png" alt="Turno" width={28} height={28} priority />
            <span className="font-semibold text-[15px] text-[#ebebeb]">Turno</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-[13px] text-[#6b6b6b]">
            <a href="#features" className="hover:text-[#ebebeb] transition-colors">Funciones</a>
            <a href="#pricing" className="hover:text-[#ebebeb] transition-colors">Precio</a>
            <a href="#faq" className="hover:text-[#ebebeb] transition-colors">FAQ</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-[13px] text-[#6b6b6b] hover:text-[#ebebeb] transition-colors">
              Iniciar sesión
            </Link>
            <Link href="/register">
              <button className="text-[13px] font-medium px-4 py-1.5 rounded-md bg-[#7c3aed] text-white hover:bg-[#6d28d9] transition-colors">
                Empezar gratis
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 pt-32 pb-28">
        <div className="max-w-3xl">
          <p className="text-[13px] font-medium text-[#7c3aed] mb-6 tracking-wide uppercase">
            Asistente de WhatsApp para barberías
          </p>
          <h1 className="text-[52px] sm:text-[64px] lg:text-[76px] font-bold leading-[1.04] tracking-[-0.03em] text-[#ebebeb] mb-7">
            Tu barbería agenda<br />
            citas sola.
          </h1>
          <p className="text-[18px] sm:text-[20px] text-[#6b6b6b] leading-relaxed mb-10 max-w-xl font-normal">
            Un asistente de IA responde WhatsApp 24/7, agenda sin errores
            y te muestra todo en un dashboard limpio. Tú solo cortas.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/register">
              <button className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium px-6 py-3 rounded-md text-[15px] transition-colors">
                Prueba 14 días gratis
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/login">
              <button className="text-[15px] font-medium px-6 py-3 rounded-md border border-[#1f1f1f] text-[#6b6b6b] hover:text-[#ebebeb] hover:border-[#2e2e2e] transition-colors">
                Iniciar sesión
              </button>
            </Link>
          </div>
          <p className="text-[12px] text-[#3d3d3d] mt-5">Sin tarjeta de crédito · Cancela cuando quieras</p>
        </div>
      </section>

      {/* Dashboard preview */}
      <section className="max-w-5xl mx-auto px-6 pb-32">
        <div className="rounded-xl border border-[#1f1f1f] overflow-hidden">
          {/* Browser chrome */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#111111] border-b border-[#1f1f1f]">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#3d3d3d]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#3d3d3d]" />
              <div className="h-2.5 w-2.5 rounded-full bg-[#3d3d3d]" />
            </div>
            <div className="flex-1 max-w-xs mx-auto">
              <div className="h-5 rounded bg-[#1a1a1a] flex items-center justify-center">
                <span className="text-[11px] text-[#3d3d3d]">turno.app/appointments</span>
              </div>
            </div>
          </div>
          {/* Dashboard body */}
          <div className="bg-[#0c0c0c] p-6 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Citas hoy', value: '8' },
                { label: 'Completadas', value: '5' },
                { label: 'Ingresos', value: '$1,600' },
              ].map(s => (
                <div key={s.label} className="rounded-lg border border-[#1f1f1f] bg-[#111111] p-4">
                  <p className="text-[11px] font-medium text-[#3d3d3d] uppercase tracking-widest mb-2">{s.label}</p>
                  <p className="text-2xl font-semibold text-[#ebebeb]">{s.value}</p>
                </div>
              ))}
            </div>
            {/* Table */}
            <div className="rounded-lg border border-[#1f1f1f] overflow-hidden">
              <div className="grid grid-cols-[72px_1fr_160px_100px] px-4 py-2.5 border-b border-[#1f1f1f] bg-[#111111]">
                {['Hora', 'Cliente', 'Servicio', 'Estado'].map(h => (
                  <span key={h} className="text-[11px] font-medium text-[#3d3d3d] uppercase tracking-widest">{h}</span>
                ))}
              </div>
              {[
                { time: '10:00', name: 'Carlos M.', service: 'Corte + Barba', done: false },
                { time: '10:30', name: 'Luis R.', service: 'Corte', done: false },
                { time: '11:00', name: 'Miguel A.', service: 'Fade', done: true },
                { time: '11:30', name: 'Andrés V.', service: 'Corte + Barba', done: true },
              ].map((r, i) => (
                <div key={i} className="grid grid-cols-[72px_1fr_160px_100px] px-4 py-3.5 border-b border-[#1a1a1a] last:border-0 hover:bg-[#111111] transition-colors">
                  <span className="text-[13px] font-mono text-[#3d3d3d]">{r.time}</span>
                  <span className="text-[13px] font-medium text-[#ebebeb]">{r.name}</span>
                  <span className="text-[13px] text-[#6b6b6b]">{r.service}</span>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded w-fit ${
                    r.done
                      ? 'text-[#3d3d3d] bg-[#161616]'
                      : 'text-[#7c3aed] bg-[#7c3aed]/10'
                  }`}>
                    {r.done ? 'Completada' : 'Confirmada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-6 py-28">
          <div className="mb-20">
            <p className="text-[12px] font-semibold text-[#7c3aed] uppercase tracking-widest mb-4">Funciones</p>
            <h2 className="text-[36px] sm:text-[44px] font-bold tracking-[-0.02em] text-[#ebebeb] mb-4">
              Todo lo que necesitas.
            </h2>
            <p className="text-[17px] text-[#6b6b6b] max-w-lg">Diseñado para barberías. Sin configuraciones complicadas.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-14">
            {[
              {
                title: 'Bot de WhatsApp 24/7',
                desc: 'Responde mensajes, agenda y cancela citas automáticamente. Tus clientes siempre tienen respuesta.',
              },
              {
                title: 'Cero doble booking',
                desc: 'Verifica disponibilidad en tiempo real. Nunca dos clientes a la misma hora.',
              },
              {
                title: 'Recordatorios automáticos',
                desc: 'Envía WhatsApp 1 hora antes de cada cita. Reduce no-shows hasta 60%.',
              },
              {
                title: 'Dashboard en tiempo real',
                desc: 'Ve tus citas del día y gestiona tu equipo desde el celular o computadora.',
              },
              {
                title: 'Sin instalar apps',
                desc: 'Tus clientes usan el WhatsApp que ya tienen. Cero fricción, cero confusión.',
              },
              {
                title: 'Lista en 5 minutos',
                desc: 'Crea cuenta, agrega servicios y horario. Tu recepcionista activa al instante.',
              },
            ].map(({ title, desc }) => (
              <div key={title}>
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
        <div className="max-w-5xl mx-auto px-6 py-28">
          <div className="mb-16">
            <p className="text-[12px] font-semibold text-[#7c3aed] uppercase tracking-widest mb-4">Precio</p>
            <h2 className="text-[36px] sm:text-[44px] font-bold tracking-[-0.02em] text-[#ebebeb] mb-4">
              Un precio. Sin sorpresas.
            </h2>
            <p className="text-[17px] text-[#6b6b6b]">Sin comisiones por cita. Sin contratos. Sin letra chica.</p>
          </div>
          <div className="max-w-sm border border-[#1f1f1f] rounded-xl bg-[#111111] p-8">
            <div className="mb-8">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-[52px] font-bold text-[#ebebeb] tracking-tight">$499</span>
                <span className="text-[16px] text-[#6b6b6b] font-normal">MXN / mes</span>
              </div>
              <p className="text-[13px] text-[#3d3d3d]">14 días gratis, sin tarjeta de crédito</p>
            </div>
            <ul className="space-y-3.5 mb-8">
              {[
                'Bot de WhatsApp 24/7 con IA',
                'Dashboard web y móvil',
                'Hasta 5 barberos',
                'Recordatorios automáticos',
                'Sin límite de citas',
                'Soporte directo por WhatsApp',
              ].map(f => (
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
            <p className="text-center text-[12px] text-[#3d3d3d] mt-4">
              Sin tarjeta en la prueba · Cancela cuando quieras
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-6 py-28">
          <div className="mb-16">
            <h2 className="text-[36px] sm:text-[44px] font-bold tracking-[-0.02em] text-[#ebebeb]">
              Preguntas frecuentes.
            </h2>
          </div>
          <div className="max-w-2xl space-y-0">
            {[
              {
                q: '¿Necesito un número nuevo de WhatsApp?',
                a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo sin costo adicional.',
              },
              {
                q: '¿Mis clientes tienen que instalar algo?',
                a: 'Nada. Usan el WhatsApp que ya tienen en su teléfono. Cero fricción, cero confusión.',
              },
              {
                q: '¿Qué pasa al terminar los 14 días?',
                a: 'Te pedimos una tarjeta para continuar. Si decides no seguir, tu cuenta se pausa sin ningún cargo.',
              },
              {
                q: '¿Puedo cancelar cuando quiera?',
                a: 'Sí. Sin penalizaciones ni letras chicas. Cancelas desde tu cuenta en menos de un minuto.',
              },
            ].map(({ q, a }, i, arr) => (
              <div key={q} className={`py-7 ${i < arr.length - 1 ? 'border-b border-[#1f1f1f]' : ''}`}>
                <p className="font-semibold text-[15px] text-[#ebebeb] mb-2">{q}</p>
                <p className="text-[14px] text-[#6b6b6b] leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-6 py-28">
          <h2 className="text-[48px] sm:text-[60px] font-bold tracking-[-0.03em] text-[#ebebeb] mb-4">
            Empieza hoy.
          </h2>
          <p className="text-[17px] text-[#6b6b6b] mb-10">14 días sin tarjeta. Sin compromiso.</p>
          <Link href="/register">
            <button className="flex items-center gap-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white font-medium px-6 py-3 rounded-md text-[15px] transition-colors">
              Crear cuenta gratis
              <ArrowRight className="h-4 w-4" />
            </button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[#1f1f1f]">
        <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="Turno" width={22} height={22} priority />
            <span className="text-[14px] font-semibold text-[#ebebeb]">Turno</span>
          </Link>
          <p className="text-[13px] text-[#3d3d3d]">© 2026 Turno · Hecho en México</p>
          <div className="flex gap-6">
            <a href="#" className="text-[13px] text-[#3d3d3d] hover:text-[#6b6b6b] transition-colors">Privacidad</a>
            <a href="#" className="text-[13px] text-[#3d3d3d] hover:text-[#6b6b6b] transition-colors">Términos</a>
          </div>
        </div>
      </footer>

    </div>
  )
}
