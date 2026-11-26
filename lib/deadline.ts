/** Minutos de colchón por debajo de los cuales una entrega se marca como apretada. */
export const TIGHT_MINUTES = 60

/** 'late' si el servicio termina después de la hora límite; 'tight' si queda menos de una hora de colchón. */
export function deadlineRisk(endsAt: string, deadlineAt: string | null): 'late' | 'tight' | null {
  if (!deadlineAt) return null
  const margin = (new Date(deadlineAt).getTime() - new Date(endsAt).getTime()) / 60_000
  return margin < 0 ? 'late' : margin < TIGHT_MINUTES ? 'tight' : null
}
