import type { BusinessProfile, BusinessType, Capability } from './types'
import { barbershop } from './barbershop'
import { spa } from './spa'
import { psychology } from './psychology'
import { dentistry } from './dentistry'
import { physiotherapy } from './physiotherapy'
import { laboratory } from './laboratory'
import { other } from './other'

const REGISTRY: Record<BusinessType, BusinessProfile> = {
  barbershop,
  spa,
  psychology,
  dentistry,
  physiotherapy,
  laboratory,
  other,
}

/** Perfiles en el orden en que aparecen en registro/onboarding. */
export const ALL_PROFILES: readonly BusinessProfile[] = [
  barbershop, spa, psychology, dentistry, physiotherapy, laboratory, other,
]

/**
 * Resuelve el perfil de un business_type. Fallback a barbershop para valores
 * desconocidos/null — mismo comportamiento histórico de lib/business-type.ts.
 */
export function getProfile(type: string | null | undefined): BusinessProfile {
  return (type && type in REGISTRY ? REGISTRY[type as BusinessType] : REGISTRY.barbershop)
}

export function hasCapability(type: string | null | undefined, capability: Capability): boolean {
  return getProfile(type).capabilities.has(capability)
}
