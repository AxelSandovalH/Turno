import Link from 'next/link'
import { Clock } from 'lucide-react'

interface Props {
  status: string
  trialEndsAt: string | null
}

export function TrialBanner({ status, trialEndsAt }: Props) {
  if (status !== 'trialing' || !trialEndsAt) return null

  const msLeft = new Date(trialEndsAt).getTime() - Date.now()
  if (msLeft <= 0) return null // expired trials are handled by SubscriptionGate

  const daysLeft = Math.ceil(msLeft / (24 * 60 * 60 * 1000))
  const urgent = daysLeft <= 3

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2 border-b text-sm ${
      urgent
        ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
        : 'bg-violet-500/10 border-violet-500/30 text-violet-300'
    }`}>
      <div className="flex items-center gap-2 min-w-0">
        <Clock className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">
          {daysLeft === 1
            ? 'Tu prueba gratis termina mañana'
            : `Te quedan ${daysLeft} días de prueba gratis`}
        </span>
      </div>
      <Link
        href="/payment"
        className={`shrink-0 text-xs font-semibold rounded-lg px-3 py-1.5 transition-opacity hover:opacity-85 ${
          urgent ? 'bg-amber-500 text-black' : 'bg-violet-600 text-white'
        }`}
      >
        Elegir plan →
      </Link>
    </div>
  )
}
