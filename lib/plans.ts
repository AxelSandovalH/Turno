// Planes de suscripción. Fuente única para el checkout, /comprar, el webhook
// y las pantallas — si cambia un precio, cambia aquí.
export type PlanKey = 'agenda' | 'asistente' | 'pedidos'

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
    amount: 270000,
    priceLabel: '$2,700',
    description: 'Tu WhatsApp contesta y agenda solo, 24/7',
    features: ['Todo lo de Agenda', 'Contesta WhatsApp 24/7', 'Agenda y reagenda citas por ti', 'Conversaciones en tu panel', 'Soporte prioritario'],
    bot: true,
  },
  // Negocios de comida: menú, link de pedidos, tablero y bot que toma pedidos.
  // Precio provisional: se ajusta aquí y en nada más.
  pedidos: {
    key: 'pedidos',
    name: 'Turno — Pedidos',
    amount: 280000,
    priceLabel: '$2,800',
    description: 'Pedidos y delivery por WhatsApp y link de menú',
    features: ['Menú con fotos, extras y notas', 'Link público de pedidos', 'Bot que toma pedidos por WhatsApp 24/7', 'Tablero de pedidos con avisos al cliente', 'Entrega a domicilio o para recoger'],
    bot: true,
  },
}

/** Días de prueba gratis en toda suscripción nueva. Stripe cobra el primer mes al terminar. */
export const TRIAL_DAYS = 7

/** Meses que se pueden prepagar con OXXO o SPEI (OXXO tiene tope de $10,000 por pago). */
export const PREPAID_MONTHS = [1, 3] as const
export type PrepaidMonths = (typeof PREPAID_MONTHS)[number]
export function isPrepaidMonths(v: unknown): v is PrepaidMonths {
  return PREPAID_MONTHS.includes(v as PrepaidMonths)
}

export const DEFAULT_PLAN: PlanKey = 'asistente'

export function isPlanKey(v: unknown): v is PlanKey {
  return v === 'agenda' || v === 'asistente' || v === 'pedidos'
}

export function resolvePlan(key: unknown): Plan {
  return PLANS[isPlanKey(key) ? key : DEFAULT_PLAN]
}

/** Solo 'agenda' apaga el bot — las suscripciones viejas ('turno-ai') lo conservan. */
export function planHasBot(key: unknown): boolean {
  return key !== 'agenda'
}
