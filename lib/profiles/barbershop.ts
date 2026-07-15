import { Scissors } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const barbershop: BusinessProfile = {
  type: 'barbershop',
  displayName: 'Barbería',
  emoji: '💈',
  staffLabel: { singular: 'Barbero', plural: 'Barberos' },
  staffIcon: Scissors,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits']),
  modules: APPOINTMENT_MODULES,
}
