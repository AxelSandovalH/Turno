import Link from 'next/link'
import { Check, Rocket, ArrowRight } from 'lucide-react'

interface Step {
  label: string
  description: string
  href: string
  done: boolean
}

interface Props {
  hasServices: boolean
  hasSchedules: boolean
  hasConversations: boolean
  hasSlug: boolean
}

export function SetupChecklist({ hasServices, hasSchedules, hasConversations, hasSlug }: Props) {
  const steps: Step[] = [
    {
      label: 'Agrega tus servicios',
      description: 'Nombre, duración y precio de lo que ofreces',
      href: '/services',
      done: hasServices,
    },
    {
      label: 'Configura los horarios',
      description: 'Días y horas en que tu equipo atiende',
      href: '/schedule',
      done: hasSchedules,
    },
    {
      label: 'Configura tu página de reservas',
      description: 'Define el enlace público de tu negocio en Ajustes',
      href: '/settings',
      done: hasSlug,
    },
    {
      label: 'Prueba el bot',
      description: 'Usa el chat de prueba (abajo a la derecha) o mándale un WhatsApp a tu número de negocio',
      href: '/conversations',
      done: hasConversations,
    },
  ]

  const pending = steps.filter(s => !s.done).length
  if (pending === 0) return null

  const doneCount = steps.length - pending

  return (
    <div className="rounded-xl border border-violet-500/30 bg-violet-500/5 overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-violet-500/20">
        <div className="flex items-center gap-2.5">
          <Rocket className="h-4 w-4 text-violet-400" />
          <p className="text-sm font-semibold text-foreground">Configura tu negocio</p>
        </div>
        <span className="text-xs text-muted-foreground">{doneCount} de {steps.length}</span>
      </div>

      <div className="divide-y divide-border/50">
        {steps.map((step, i) => (
          <Link
            key={step.href}
            href={step.href}
            className={`flex items-center gap-3.5 px-5 py-3 transition-colors ${
              step.done ? 'opacity-50 pointer-events-none' : 'hover:bg-violet-500/10'
            }`}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold shrink-0 ${
              step.done
                ? 'bg-emerald-500/20 text-emerald-400'
                : 'bg-violet-500/15 text-violet-400 border border-violet-500/40'
            }`}>
              {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {step.label}
              </p>
              <p className="text-xs text-muted-foreground truncate">{step.description}</p>
            </div>
            {!step.done && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
          </Link>
        ))}
      </div>
    </div>
  )
}
