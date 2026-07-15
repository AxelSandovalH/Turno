import type { LucideIcon } from 'lucide-react'

export type BusinessType =
  | 'barbershop'
  | 'spa'
  | 'psychology'
  | 'dentistry'
  | 'physiotherapy'
  | 'laboratory'
  | 'other'

/**
 * Capacidades que un perfil puede habilitar. Las features preguntan por
 * capacidad (hasCapability), nunca por business_type directamente — así un
 * perfil futuro puede combinar capacidades sin tocar el código de cada feature.
 */
export type Capability =
  /** Motor de citas: agenda, slots, horarios, recordatorios, confirmaciones */
  | 'appointments'
  /** Bot de WhatsApp que agenda (requiere appointments) */
  | 'whatsapp-bot'
  /** Página pública de reservas /book/[slug] */
  | 'booking-page'
  /** Expediente clínico: SOAP, NOM-004, planes de tratamiento, portal paciente */
  | 'clinical-records'
  /** Comisiones por profesional en Finanzas */
  | 'commissions'
  /** Anticipo por Stripe al agendar */
  | 'deposits'
  /** Módulo de laboratorio: catálogo de estudios, órdenes, captura de resultados */
  | 'lab-orders'

/** Entrada del sidebar. El orden del array define el orden en pantalla. */
export interface ProfileModule {
  id: string
  href: string
  /** Título fijo, o null para módulos cuyo label depende del perfil (staff/patients) */
  title: string | null
}

export interface BusinessProfile {
  type: BusinessType
  /** Nombre del giro para selectores de registro/onboarding */
  displayName: string
  emoji: string
  staffLabel: { singular: string; plural: string }
  staffIcon: LucideIcon
  capabilities: ReadonlySet<Capability>
  /** Módulos visibles en el sidebar, en orden */
  modules: readonly ProfileModule[]
}
