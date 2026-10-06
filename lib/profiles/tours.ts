import { Compass } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const tours: BusinessProfile = {
  type: 'tours',
  displayName: 'Tours y actividades',
  emoji: '🌴',
  staffLabel: { singular: 'Guía', plural: 'Guías' },
  staffIcon: Compass,
  // Fotos por tour, precio "desde" (varía por grupo) y anticipo para apartar salida
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits', 'variable-pricing', 'service-photos']),
  modules: APPOINTMENT_MODULES,
}
