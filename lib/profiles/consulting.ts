import { Briefcase } from 'lucide-react'
import type { BusinessProfile } from './types'
import { APPOINTMENT_MODULES } from './shared'

export const consulting: BusinessProfile = {
  type: 'consulting',
  displayName: 'Consultoría / Servicios profesionales',
  emoji: '💼',
  staffLabel: { singular: 'Consultor', plural: 'Consultores' },
  staffIcon: Briefcase,
  // Sin expediente clínico ni comisiones — solo agenda de llamadas/sesiones.
  capabilities: new Set(['appointments', 'whatsapp-bot', 'booking-page', 'deposits']),
  modules: APPOINTMENT_MODULES,
}
