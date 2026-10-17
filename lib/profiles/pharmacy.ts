import { Pill } from 'lucide-react'
import type { BusinessProfile } from './types'
import { PHARMACY_MODULES } from './shared'

export const pharmacy: BusinessProfile = {
  type: 'pharmacy',
  displayName: 'Farmacia',
  emoji: '💊',
  staffLabel: { singular: 'Farmacéutico', plural: 'Farmacéuticos' },
  staffIcon: Pill,
  // Citas (inyecciones, toma de presión, consulta) y pedidos de productos por WhatsApp o por su link
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'orders']),
  modules: PHARMACY_MODULES,
}
