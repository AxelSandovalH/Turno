import { PenTool } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const tattoo: BusinessProfile = {
  type: 'tattoo',
  displayName: 'Estudio de tatuajes',
  emoji: '🎨',
  staffLabel: { singular: 'Tatuador', plural: 'Tatuadores' },
  staffIcon: PenTool,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits', 'variable-pricing']),
  modules: APPOINTMENT_MODULES,
}
