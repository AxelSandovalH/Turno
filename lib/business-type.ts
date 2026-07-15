/**
 * Fachada de compatibilidad sobre lib/profiles/.
 * Los call sites existentes usan esta API; el código nuevo debería usar
 * getProfile()/hasCapability() de '@/lib/profiles/registry' directamente.
 */
import type { LucideIcon } from 'lucide-react'
import { getProfile, hasCapability } from './profiles/registry'
import type { BusinessType } from './profiles/types'

export type { BusinessType }

/** Giros con expediente clínico (SOAP, NOM-004, planes de tratamiento, etc.) */
export function isMedicalVertical(type: string | null | undefined): boolean {
  return hasCapability(type, 'clinical-records')
}

export function staffLabel(type: string | null | undefined, plural = false): string {
  const { staffLabel } = getProfile(type)
  return plural ? staffLabel.plural : staffLabel.singular
}

export function customerLabel(type: string | null | undefined, plural = false): string {
  const medical = isMedicalVertical(type)
  if (plural) return medical ? 'Pacientes' : 'Clientes'
  return medical ? 'Paciente' : 'Cliente'
}

export function staffIcon(type: string | null | undefined): LucideIcon {
  return getProfile(type).staffIcon
}
