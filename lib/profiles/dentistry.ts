import { Smile } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const dentistry: BusinessProfile = {
  type: 'dentistry',
  displayName: 'Odontología',
  emoji: '🦷',
  staffLabel: { singular: 'Dentista', plural: 'Dentistas' },
  staffIcon: Smile,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits', 'clinical-records', 'commissions']),
  modules: APPOINTMENT_MODULES,
}
