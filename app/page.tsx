import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { CalendarCheck, MessageCircle, Clock, BarChart3, CheckCircle } from 'lucide-react'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user?.user_metadata?.organization_id) redirect('/appointments')

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <span className="font-bold text-xl tracking-tight">Turno</span>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Iniciar sesión</Button>
          </Link>
          <Link href="/register">
            <Button size="sm">Comenzar gratis</Button>
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-6">
          <MessageCircle className="h-4 w-4" />
          Recepcionista de WhatsApp con IA
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6 leading-tight">
          Tu barbería agenda citas<br />
          <span className="text-primary">sola, por WhatsApp</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Un asistente de IA responde a tus clientes 24/7, agenda citas y te muestra todo en un dashboard. Sin apps, sin llamadas.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/register">
            <Button size="lg" className="w-full sm:w-auto px-8">
              Prueba 14 días gratis
            </Button>
          </Link>
          <Link href="/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto px-8">
              Ya tengo cuenta
            </Button>
          </Link>
        </div>
        <p className="text-sm text-muted-foreground mt-4">Sin tarjeta de crédito · Cancela cuando quieras</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              icon: MessageCircle,
              title: 'Bot de WhatsApp',
              desc: 'Responde mensajes, agenda y cancela citas automáticamente. 24 horas, 7 días.',
            },
            {
              icon: CalendarCheck,
              title: 'Sin doble booking',
              desc: 'El sistema verifica disponibilidad en tiempo real. Nunca dos citas al mismo tiempo.',
            },
            {
              icon: Clock,
              title: 'Recordatorios',
              desc: 'Manda recordatorio automático antes de la cita. Reduce los no-shows.',
            },
            {
              icon: BarChart3,
              title: 'Dashboard',
              desc: 'Ve todas tus citas del día, gestiona servicios y horarios desde cualquier lugar.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div key={title} className="border rounded-xl p-5 space-y-3">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-semibold">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Un precio simple</h2>
        <p className="text-muted-foreground mb-10">Sin sorpresas. Sin comisiones por cita.</p>
        <div className="max-w-sm mx-auto border rounded-2xl p-8 space-y-6">
          <div>
            <p className="text-5xl font-bold">$499</p>
            <p className="text-muted-foreground">MXN / mes</p>
          </div>
          <ul className="space-y-3 text-sm text-left">
            {[
              'Bot de WhatsApp con IA ilimitado',
              'Dashboard para tu negocio',
              'Hasta 5 barberos',
              'Recordatorios automáticos',
              'Soporte por WhatsApp',
            ].map(f => (
              <li key={f} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/register" className="block">
            <Button className="w-full" size="lg">
              Empezar — 14 días gratis
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 Turno · Hecho en México 🇲🇽</p>
      </footer>
    </div>
  )
}
