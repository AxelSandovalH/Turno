import { Anchor } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const charter: BusinessProfile = {
  type: 'charter',
  displayName: 'Charter de yates / pesca',
  emoji: '⛵',
  staffLabel: { singular: 'Capitán', plural: 'Capitanes' },
  staffIcon: Anchor,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits']),
  modules: APPOINTMENT_MODULES,
}
