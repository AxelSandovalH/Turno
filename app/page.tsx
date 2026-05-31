import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ArrowRight, CheckCircle } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.organization_id) redirect('/appointments')

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1a1a1a] antialiased">

      {/* ── Nav ─────────────────────────────────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5">
        <span className="text-[15px] font-semibold tracking-tight">Turno</span>
        <div className="flex items-center gap-6">
          <Link href="/login" className="text-[13px] text-neutral-500 hover:text-neutral-800 transition-colors">
            Iniciar sesión
          </Link>
          <Link href="/register">
            <button className="text-[13px] bg-[#1a1a1a] text-white px-4 py-2 rounded-full hover:bg-neutral-800 transition-colors">
              Empezar gratis
            </button>
          </Link>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────────────────── */}
      <section className="pt-40 pb-32 px-6 max-w-5xl mx-auto">
        <div className="max-w-3xl">
          <p className="text-[13px] text-neutral-400 tracking-widest uppercase mb-8 font-medium">
            Recepcionista de WhatsApp con IA
          </p>
          <h1 className="text-[56px] sm:text-[72px] leading-[1.05] mb-8 text-[#1a1a1a]" style={{ fontFamily: 'var(--font-serif)' }}>
            Tu barbería,<br />
            siempre disponible.
          </h1>
          <p className="text-[18px] text-neutral-500 leading-relaxed max-w-xl mb-12">
            Turno responde tus WhatsApps, agenda citas y manda recordatorios —
            todo solo, las 24 horas. Tú solo cortas.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/register">
              <button className="flex items-center gap-2 bg-[#1a1a1a] text-white text-[14px] font-medium px-6 py-3 rounded-full hover:bg-neutral-800 transition-colors">
                Prueba 14 días gratis
                <ArrowRight className="h-4 w-4" />
              </button>
            </Link>
            <Link href="/login" className="text-[14px] text-neutral-500 hover:text-neutral-800 transition-colors">
              Ya tengo cuenta →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Dashboard mockup ────────────────────────────────── */}
      <section className="px-6 max-w-5xl mx-auto pb-32">
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_2px_40px_rgba(0,0,0,0.06)] overflow-hidden">
          {/* Top bar */}
          <div className="border-b border-neutral-100 px-6 py-4 flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
              <div className="h-2.5 w-2.5 rounded-full bg-neutral-200" />
            </div>
            <div className="h-5 rounded-md bg-neutral-100 w-48 text-[11px] text-neutral-400 flex items-center px-3">
              turno.app/appointments
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Citas hoy', value: '8' },
                { label: 'Completadas', value: '5' },
                { label: 'Ingresos', value: '$800' },
              ].map(s => (
                <div key={s.label} className="rounded-xl border border-neutral-100 bg-[#FAFAF8] p-5">
                  <p className="text-[11px] text-neutral-400 uppercase tracking-wider mb-2">{s.label}</p>
                  <p className="text-[28px] font-semibold text-[#1a1a1a] tracking-tight">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Table */}
            <div className="rounded-xl border border-neutral-100 overflow-hidden">
              <div className="grid grid-cols-[80px_1fr_140px_100px] gap-0 border-b border-neutral-100 px-5 py-3">
                {['Hora', 'Cliente', 'Servicio', 'Estado'].map(h => (
                  <span key={h} className="text-[11px] text-neutral-400 uppercase tracking-wider">{h}</span>
                ))}
              </div>
              {[
                { time: '10:00', name: 'Carlos M.', service: 'Corte + Barba', done: false },
                { time: '10:30', name: 'Luis R.', service: 'Corte', done: false },
                { time: '11:00', name: 'Miguel A.', service: 'Fade', done: true },
                { time: '11:30', name: 'Andrés V.', service: 'Corte + Barba', done: true },
              ].map((r, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr_140px_100px] gap-0 px-5 py-3.5 border-b border-neutral-50 last:border-0 hover:bg-neutral-50 transition-colors">
                  <span className="text-[13px] font-mono text-neutral-500">{r.time}</span>
                  <span className="text-[13px] font-medium text-[#1a1a1a]">{r.name}</span>
                  <span className="text-[13px] text-neutral-500">{r.service}</span>
                  <span className={`text-[11px] font-medium px-2.5 py-1 rounded-full w-fit ${
                    r.done
                      ? 'bg-neutral-100 text-neutral-500'
                      : 'bg-emerald-50 text-emerald-700'
                  }`}>
                    {r.done ? 'Completada' : 'Confirmada'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-32 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
          {[
            {
              num: '01',
              title: 'Bot que trabaja solo',
              desc: 'Responde WhatsApps, agenda citas y cancela — sin que tú hagas nada. Funciona de noche, fines de semana, cuando estés ocupado cortando.',
            },
            {
              num: '02',
              title: 'Sin doble booking',
              desc: 'Revisa disponibilidad en tiempo real antes de confirmar cada cita. Tus clientes nunca se van a topar con otro.',
            },
            {
              num: '03',
              title: 'Recordatorios automáticos',
              desc: 'Un WhatsApp 1 hora antes de cada cita. Tus clientes no se olvidan y tú no pierdes tiempo.',
            },
          ].map(f => (
            <div key={f.num} className="space-y-4">
              <p className="text-[11px] text-neutral-300 tracking-widest font-medium">{f.num}</p>
              <h3 className="text-[17px] font-semibold tracking-tight text-[#1a1a1a]">{f.title}</h3>
              <p className="text-[14px] text-neutral-500 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Pricing ─────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-32 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          <div>
            <p className="text-[11px] text-neutral-400 tracking-widest uppercase mb-6">Precio</p>
            <h2 className="text-[40px] leading-tight mb-4" style={{ fontFamily: 'var(--font-serif)' }}>
              $499 MXN<br />al mes.
            </h2>
            <p className="text-[15px] text-neutral-500 leading-relaxed">
              Sin comisiones por cita. Sin contratos. Sin letra chica.
              Cancela cuando quieras.
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-neutral-200 p-8 shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
            <ul className="space-y-4 mb-8">
              {[
                'Bot de WhatsApp 24/7',
                'Dashboard web y móvil',
                'Hasta 5 barberos',
                'Recordatorios automáticos',
                'Sin límite de citas',
                'Soporte directo',
              ].map(f => (
                <li key={f} className="flex items-center gap-3">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <span className="text-[14px] text-neutral-700">{f}</span>
                </li>
              ))}
            </ul>
            <Link href="/register" className="block">
              <button className="w-full bg-[#1a1a1a] text-white text-[14px] font-medium py-3.5 rounded-full hover:bg-neutral-800 transition-colors">
                Empezar — 14 días gratis
              </button>
            </Link>
            <p className="text-center text-[12px] text-neutral-400 mt-4">Sin tarjeta de crédito en la prueba</p>
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-32 max-w-5xl mx-auto">
        <p className="text-[11px] text-neutral-400 tracking-widest uppercase mb-12">Preguntas</p>
        <div className="grid md:grid-cols-2 gap-x-16 gap-y-10 max-w-4xl">
          {[
            {
              q: '¿Necesito un número nuevo de WhatsApp?',
              a: 'No. Puedes usar tu número actual de WhatsApp Business. Te ayudamos a configurarlo.',
            },
            {
              q: '¿Mis clientes tienen que instalar algo?',
              a: 'Nada. Usan el WhatsApp que ya tienen. Cero fricción.',
            },
            {
              q: '¿Qué pasa al terminar los 14 días?',
              a: 'Te pedimos una tarjeta para continuar. Si no, tu cuenta se pausa sin cargos.',
            },
            {
              q: '¿Puedo cancelar cuando quiera?',
              a: 'Sí, sin penalizaciones. Cancelas desde tu cuenta en un clic.',
            },
          ].map(({ q, a }) => (
            <div key={q} className="space-y-2">
              <h3 className="text-[15px] font-medium text-[#1a1a1a]">{q}</h3>
              <p className="text-[14px] text-neutral-500 leading-relaxed">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA final ───────────────────────────────────────── */}
      <section className="border-t border-neutral-100 px-6 py-32 max-w-5xl mx-auto text-center">
        <h2 className="text-[48px] sm:text-[64px] leading-tight mb-6" style={{ fontFamily: 'var(--font-serif)' }}>
          Empieza hoy,<br />gratis.
        </h2>
        <p className="text-[16px] text-neutral-500 mb-10">
          14 días sin tarjeta. Sin compromiso.
        </p>
        <Link href="/register">
          <button className="inline-flex items-center gap-2 bg-[#1a1a1a] text-white text-[15px] font-medium px-8 py-4 rounded-full hover:bg-neutral-800 transition-colors">
            Crear mi cuenta gratis
            <ArrowRight className="h-4 w-4" />
          </button>
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="border-t border-neutral-100 px-8 py-8 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-[13px] font-semibold">Turno</span>
        <p className="text-[12px] text-neutral-400">© 2026 · Hecho en México 🇲🇽</p>
        <div className="flex gap-6">
          <a href="#" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">Privacidad</a>
          <a href="#" className="text-[12px] text-neutral-400 hover:text-neutral-600 transition-colors">Términos</a>
        </div>
      </footer>

    </div>
  )
}
