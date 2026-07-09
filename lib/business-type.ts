import { Scissors, Sparkles, Brain, Smile, Bone, Briefcase } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type BusinessType = 'barbershop' | 'spa' | 'psychology' | 'dentistry' | 'physiotherapy' | 'other'

interface StaffLabels { singular: string; plural: string }

const STAFF_LABELS: Record<BusinessType, StaffLabels> = {
  barbershop:    { singular: 'Barbero',        plural: 'Barberos' },
  spa:           { singular: 'Especialista',   plural: 'Especialistas' },
  psychology:    { singular: 'Terapeuta',      plural: 'Terapeutas' },
  dentistry:     { singular: 'Dentista',       plural: 'Dentistas' },
  physiotherapy: { singular: 'Fisioterapeuta', plural: 'Fisioterapeutas' },
  other:         { singular: 'Profesional',    plural: 'Profesionales' },
}

// Giros con expediente clínico (notas SOAP, NOM-004, planes de tratamiento, etc.)
// Barbería y spa quedan fuera: solo agendan servicios, sin historial médico.
const CLINICAL_TYPES = new Set<BusinessType>(['psychology', 'dentistry', 'physiotherapy', 'other'])

const STAFF_ICONS: Record<BusinessType, LucideIcon> = {
  barbershop:    Scissors,
  spa:           Sparkles,
  psychology:    Brain,
  dentistry:     Smile,
  physiotherapy: Bone,
  other:         Briefcase,
}

function normalize(type: string | null | undefined): BusinessType {
  return (type && type in STAFF_LABELS ? type : 'barbershop') as BusinessType
}

export function isMedicalVertical(type: string | null | undefined): boolean {
  return CLINICAL_TYPES.has(normalize(type))
}

export function staffLabel(type: string | null | undefined, plural = false): string {
  const entry = STAFF_LABELS[normalize(type)]
  return plural ? entry.plural : entry.singular
}

export function customerLabel(type: string | null | undefined, plural = false): string {
  const medical = isMedicalVertical(type)
  if (plural) return medical ? 'Pacientes' : 'Clientes'
  return medical ? 'Paciente' : 'Cliente'
}

export function staffIcon(type: string | null | undefined): LucideIcon {
  return STAFF_ICONS[normalize(type)]
}
