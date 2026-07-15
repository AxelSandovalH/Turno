import { Bone } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const physiotherapy: BusinessProfile = {
  type: 'physiotherapy',
  displayName: 'Fisioterapia',
  emoji: '🏃',
  staffLabel: { singular: 'Fisioterapeuta', plural: 'Fisioterapeutas' },
  staffIcon: Bone,
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits', 'clinical-records', 'commissions']),
  modules: APPOINTMENT_MODULES,
}
