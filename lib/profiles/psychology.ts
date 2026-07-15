import { Brain } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const psychology: BusinessProfile = {
  type: 'psychology',
  displayName: 'Psicología',
  emoji: '🧠',
  staffLabel: { singular: 'Terapeuta', plural: 'Terapeutas' },
  staffIcon: Brain,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits', 'clinical-records', 'commissions']),
  modules: APPOINTMENT_MODULES,
}
