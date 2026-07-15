import { Briefcase } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const other: BusinessProfile = {
  type: 'other',
  displayName: 'Otro',
  emoji: '✨',
  staffLabel: { singular: 'Profesional', plural: 'Profesionales' },
  staffIcon: Briefcase,
  // Mantiene el comportamiento histórico: 'other' se trata como consultorio médico
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits', 'clinical-records', 'commissions']),
  modules: APPOINTMENT_MODULES,
}
