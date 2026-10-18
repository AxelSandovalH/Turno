import { Pill } from 'lucide-react'
import type { BusinessProfile } from './types'
import { PHARMACY_MODULES } from './shared'

export const pharmacy: BusinessProfile = {
  type: 'pharmacy',
  displayName: 'Farmacia',
  emoji: '💊',
  staffLabel: { singular: 'Farmacéutico', plural: 'Farmacéuticos' },
  staffIcon: Pill,
  // Citas (IV therapy, consultorio), expediente clínico y pedidos de productos por WhatsApp o por su link
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'orders', 'clinical-records']),
  modules: PHARMACY_MODULES,
}
