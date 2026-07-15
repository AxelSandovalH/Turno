import { Sparkles } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const spa: BusinessProfile = {
  type: 'spa',
  displayName: 'Spa / Belleza',
  emoji: '💅',
  staffLabel: { singular: 'Especialista', plural: 'Especialistas' },
  staffIcon: Sparkles,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits']),
  modules: APPOINTMENT_MODULES,
}
