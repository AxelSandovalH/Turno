import type { Segment } from '@/lib/plans'

/** Landing por giro: misma página, distinto titular, dolor, plan y mensaje de WhatsApp (mejor Quality Score en Google Ads). */
export interface LandingVariant {
  slug: string
  /** Cómo se nombra el negocio en el mensaje de WhatsApp: "para mi barbería". */
  giro: string
  /** Plan (tipo de precio) que se muestra. */
  pricing: Segment
  /** Índice del giro en SEGMENTS para el mockup de WhatsApp. */
  segmentIndex: number
  badge: string
  headline: [string, string]
  subtitle: string
  title: string
  description: string
}

export const LANDING_VARIANTS: Record<string, LandingVariant> = {
  barberias: {
    slug: 'barberias',
    giro: 'barbería',
    pricing: 'citas',
    segmentIndex: 0,
    badge: 'Para barberías · las 24 horas',
    headline: ['Tu barbería agenda', 'sola por WhatsApp.'],
    subtitle: 'Se acabaron los no-shows y los mensajes sin contestar con las tijeras en la mano. QuickTurno agenda, confirma y recuerda cada cita, incluso a las 11 de la noche.',
    title: 'Tu barbería agenda sola por WhatsApp — QuickTurno',
    description: 'Software para barberías: un asistente en WhatsApp agenda citas 24/7, manda recordatorios para reducir no-shows y cobra anticipos. 7 días gratis.',
  },
  salones: {
    slug: 'salones',
    giro: 'salón de belleza',
    pricing: 'citas',
    segmentIndex: 1,
    badge: 'Para salones y spas · las 24 horas',
    headline: ['Tu salón se llena', 'solo por WhatsApp.'],
    subtitle: 'Las clientas escriben de noche y se van con quien contesta primero. QuickTurno responde al instante, aparta el horario con anticipo y recuerda cada cita para que no se cancele a última hora.',
    title: 'Tu salón se llena solo por WhatsApp — QuickTurno',
    description: 'Software para salones y spas: agenda citas por WhatsApp a cualquier hora, cobra anticipos con tarjeta y manda recordatorios automáticos. 7 días gratis.',
  },
  restaurantes: {
    slug: 'restaurantes',
    giro: 'restaurante',
    pricing: 'pedidos',
    segmentIndex: 8,
    badge: 'Para restaurantes · las 24 horas',
    headline: ['Tu restaurante recibe', 'pedidos solo por WhatsApp.'],
    subtitle: 'Deja de copiar pedidos a mano. QuickTurno toma el pedido por chat con extras y notas, manda las fotos de tus platillos y cobra con tarjeta, sin comisión por pedido.',
    title: 'Pedidos por WhatsApp para tu restaurante — QuickTurno',
    description: 'Software para restaurantes y taquerías: un asistente toma pedidos por WhatsApp, manda tu menú con fotos y cobra con tarjeta. Sin comisión por pedido. 7 días gratis.',
  },
}

export const LANDING_SLUGS = Object.keys(LANDING_VARIANTS)
