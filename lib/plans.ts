// Planes de suscripción. Fuente única para el checkout, /comprar, el webhook
// y las pantallas — si cambia un precio, cambia aquí.
export type PlanKey = 'agenda' | 'asistente'

export interface Plan {
  key: PlanKey
  name: string
  /** Centavos MXN */
  amount: number
  /** Precio para mostrar */
  priceLabel: string
  description: string
  features: string[]
  /** Si el plan incluye el bot de WhatsApp (organizations.whatsapp_bot_enabled) */
  bot: boolean
}

export const PLANS: Record<PlanKey, Plan> = {
  agenda: {
    key: 'agenda',
    name: 'Turno — Agenda',
    amount: 150000,
    priceLabel: '$1,500',
    description: 'Tu agenda en orden, sin bot de WhatsApp',
    features: ['Calendario de citas', 'Página pública de reservas', 'Anticipos por Stripe', 'Recordatorios automáticos', 'Hasta 5 profesionales'],
    bot: false,
  },
  asistente: {
    key: 'asistente',
    name: 'Turno — Agenda + Asistente',
    amount: 200000,
    priceLabel: '$2,000',
    description: 'Tu WhatsApp contesta y agenda solo, 24/7',
    features: ['Todo lo de Agenda', 'Contesta WhatsApp 24/7', 'Agenda y reagenda citas por ti', 'Conversaciones en tu panel', 'Soporte prioritario'],
    bot: true,
  },
}

export const DEFAULT_PLAN: PlanKey = 'asistente'

export function isPlanKey(v: unknown): v is PlanKey {
  return v === 'agenda' || v === 'asistente'
}

export function resolvePlan(key: unknown): Plan {
  return PLANS[isPlanKey(key) ? key : DEFAULT_PLAN]
}

/** Solo 'agenda' apaga el bot — las suscripciones viejas ('turno-ai') lo conservan. */
export function planHasBot(key: unknown): boolean {
  return key !== 'agenda'
}
