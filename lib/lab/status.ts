import type { LabOrderStatus } from '@/types/database'

export const LAB_STATUS_LABEL: Record<LabOrderStatus, string> = {
  registered:    'Registrada',
  in_process:    'En proceso',
  results_ready: 'Resultados capturados',
  delivered:     'Entregada',
  cancelled:     'Cancelada',
}

export const LAB_STATUS_CLASS: Record<LabOrderStatus, string> = {
  registered:    'text-sky-500 bg-sky-500/10 border-sky-500/30',
  in_process:    'text-amber-500 bg-amber-500/10 border-amber-500/30',
  results_ready: 'text-violet-500 bg-violet-500/10 border-violet-500/30',
  delivered:     'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  cancelled:     'text-muted-foreground bg-muted border-border',
}

/** Transiciones válidas desde cada estado */
export const LAB_STATUS_NEXT: Record<LabOrderStatus, LabOrderStatus[]> = {
  registered:    ['in_process', 'cancelled'],
  in_process:    ['results_ready', 'cancelled'],
  results_ready: ['delivered'],
  delivered:     [],
  cancelled:     [],
}
