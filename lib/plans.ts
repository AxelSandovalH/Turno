// Precios de QuickTurno, armados con piezas ("átomos"): un plan BASE por tipo de negocio y
// COMPLEMENTOS que se suman (hoy: el asistente de WhatsApp). Los planes que usa el resto
// del código (agenda, asistente, menu, pedidos) se derivan de aquí, así que un precio se
// cambia en un solo lugar y el checkout, la landing y el registro lo reflejan.

export type Segment = 'citas' | 'tours' | 'pedidos'
export type PlanKey = 'agenda' | 'asistente' | 'tours' | 'menu' | 'pedidos'

// ── Piezas ───────────────────────────────────────────────────────────────────

export interface BasePlan {
  segment: Segment
  name: string
  description: string
  /** Centavos MXN por mes */
  amount: number
  features: string[]
}

export interface Addon {
  key: 'asistente'
  name: string
  description: string
  /** Centavos MXN por mes, según el tipo de negocio */
  amountBySegment: Record<Segment, number>
  featuresBySegment: Record<Segment, string[]>
}

export const BASES: Record<Segment, BasePlan> = {
  citas: {
    segment: 'citas',
    name: 'Agenda',
    description: 'Tu agenda en orden',
    amount: 70000,
    features: ['Calendario de citas', 'Página pública de reservas', 'Anticipos por Stripe', 'Recordatorios automáticos', 'Hasta 5 profesionales'],
  },
  tours: {
    segment: 'tours',
    name: 'Agenda para tours',
    description: 'Tus salidas y reservas en orden',
    amount: 70000,
    features: ['Calendario de salidas', 'Página de reservas con fotos de tus tours', 'Anticipos por Stripe', 'Recordatorios automáticos', 'Hasta 5 guías'],
  },
  pedidos: {
    segment: 'pedidos',
    name: 'Menú y pedidos',
    description: 'Tu menú, tu link de pedidos y tu tablero',
    amount: 70000,
    features: ['Menú con fotos, extras y notas', 'Link de pedidos con carrito', 'Cobro con tarjeta por Stripe', 'Tablero con avisos al cliente', 'Entrega a domicilio o para recoger'],
  },
}

export const ASSISTANT: Addon = {
  key: 'asistente',
  name: 'Asistente de WhatsApp',
  description: 'Tu WhatsApp contesta y atiende solo, 24/7',
  // Total con asistente: citas $1,200 · tours $1,700 · restaurantes $1,400 (base de $700 + complemento)
  amountBySegment: { citas: 50000, tours: 100000, pedidos: 70000 },
  featuresBySegment: {
    citas: ['Contesta WhatsApp 24/7', 'Agenda y reagenda citas por ti', 'Conversaciones en tu panel', 'Soporte prioritario'],
    tours: ['Contesta a turistas 24/7', 'Reserva salidas y manda el link con fotos', 'Conversaciones en tu panel', 'Soporte prioritario'],
    pedidos: ['Toma pedidos por WhatsApp 24/7', 'Manda las fotos de tus platillos', 'Conversaciones en tu panel', 'Soporte prioritario'],
  },
}

// ── Planes derivados (lo que se guarda y se cobra) ───────────────────────────

export interface Plan {
  key: PlanKey
  segment: Segment
  /** El plan incluye el asistente de WhatsApp (organizations.whatsapp_bot_enabled) */
  bot: boolean
  name: string
  /** Total en centavos MXN por mes */
  amount: number
  /** Cuánto de ese total es el plan base y cuánto el complemento */
  baseAmount: number
  addonAmount: number
  priceLabel: string
  description: string
  features: string[]
}

export const money = (centavos: number) => `$${(centavos / 100).toLocaleString('es-MX')}`

const PARTS: Record<PlanKey, { segment: Segment; assistant: boolean; name: string }> = {
  agenda:    { segment: 'citas',   assistant: false, name: 'Turno — Agenda' },
  asistente: { segment: 'citas',   assistant: true,  name: 'Turno — Agenda + Asistente' },
  tours:     { segment: 'tours',   assistant: true,  name: 'Turno — Tours + Asistente' },
  menu:      { segment: 'pedidos', assistant: false, name: 'Turno — Menú y pedidos' },
  pedidos:   { segment: 'pedidos', assistant: true,  name: 'Turno — Pedidos + Asistente' },
}

function buildPlan(key: PlanKey): Plan {
  const { segment, assistant, name } = PARTS[key]
  const base = BASES[segment]
  const addonAmount = assistant ? ASSISTANT.amountBySegment[segment] : 0
  const amount = base.amount + addonAmount
  return {
    key,
    segment,
    bot: assistant,
    name,
    amount,
    baseAmount: base.amount,
    addonAmount,
    priceLabel: money(amount),
    description: assistant ? ASSISTANT.description : base.description,
    features: assistant ? [...base.features, ...ASSISTANT.featuresBySegment[segment]] : base.features,
  }
}

export const PLANS: Record<PlanKey, Plan> = {
  agenda: buildPlan('agenda'),
  asistente: buildPlan('asistente'),
  tours: buildPlan('tours'),
  menu: buildPlan('menu'),
  pedidos: buildPlan('pedidos'),
}

/** Días de prueba gratis en toda suscripción nueva. Stripe cobra el primer mes al terminar. */
export const TRIAL_DAYS = 7

/** Meses que se pueden prepagar con OXXO o SPEI (OXXO tiene tope de $10,000 por pago). */
export const PREPAID_MONTHS = [1, 3] as const
export type PrepaidMonths = (typeof PREPAID_MONTHS)[number]
export function isPrepaidMonths(v: unknown): v is PrepaidMonths {
  return PREPAID_MONTHS.includes(v as PrepaidMonths)
}

export const DEFAULT_PLAN: PlanKey = 'agenda'

export function isPlanKey(v: unknown): v is PlanKey {
  return v === 'agenda' || v === 'asistente' || v === 'tours' || v === 'menu' || v === 'pedidos'
}

export function resolvePlan(key: unknown): Plan {
  return PLANS[isPlanKey(key) ? key : DEFAULT_PLAN]
}

/** Tipo de precio que le toca a un giro: restaurantes, tours o el general de citas. */
export function segmentForType(businessType: string | null | undefined): Segment {
  return businessType === 'restaurant' ? 'pedidos' : businessType === 'tours' ? 'tours' : 'citas'
}

/** Plan que corresponde a un tipo de negocio con o sin el complemento del asistente.
 *  Sin asistente, citas y tours comparten el plan básico (Agenda, $700). */
export function planKeyFor(segment: Segment, assistant: boolean): PlanKey {
  if (segment === 'pedidos') return assistant ? 'pedidos' : 'menu'
  if (segment === 'tours') return assistant ? 'tours' : 'agenda'
  return assistant ? 'asistente' : 'agenda'
}

/** Plan de un negocio ya creado, a partir de su giro y de si tiene el asistente. */
export function planKeyForOrg(businessType: string | null | undefined, botEnabled: boolean): PlanKey {
  return planKeyFor(segmentForType(businessType), botEnabled)
}

/** La prueba gratis es solo para el plan básico: el asistente (WhatsApp y IA) tiene costo desde el primer día. */
export function trialEligible(plan: Plan): boolean {
  return !plan.bot
}

/** Solo 'agenda' y 'menu' no incluyen el bot — las suscripciones viejas ('turno-ai') lo conservan. */
export function planHasBot(key: unknown): boolean {
  return key !== 'agenda' && key !== 'menu'
}

/**
 * Renglones de cobro de un plan: el plan base y, si lo incluye, el complemento por separado.
 * En la factura de Stripe se ve cada pieza; sumados dan exactamente el precio del plan.
 * `months` multiplica el monto (prepago); sin `recurring` el cobro es de una sola vez.
 */
export function planLineItems(plan: Plan, opts: { recurring: boolean; months?: number }) {
  const months = opts.months ?? 1
  const base = BASES[plan.segment]
  const mk = (name: string, description: string, unit: number) => ({
    quantity: 1,
    price_data: {
      currency: 'mxn',
      unit_amount: unit * months,
      ...(opts.recurring ? { recurring: { interval: 'month' as const } } : {}),
      product_data: { name, description },
    },
  })
  return [
    mk(base.name, base.description, plan.baseAmount),
    ...(plan.bot ? [mk(ASSISTANT.name, ASSISTANT.description, plan.addonAmount)] : []),
  ]
}
