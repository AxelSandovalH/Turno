// Pasos del embudo, en el orden en que los recorre un visitante. Compartido por el navegador, el servidor y el admin.
export interface FunnelStep {
  id: string; label: string; source: 'client' | 'server'
  /** Paso del que viene (contra el que se calcula el %). Al registro se llega desde varios botones, no solo desde la demo. */
  parent?: string
  /** Rama opcional: se muestra sangrada y no entra en la "mayor caída" */
  branch?: boolean
}

export const FUNNEL_STEPS: FunnelStep[] = [
  { id: 'landing_view', label: 'Visitaron la página', source: 'client' },
  { id: 'demo_started', label: 'Escribieron su negocio en la demo', source: 'client', parent: 'landing_view' },
  { id: 'demo_ready', label: 'Vieron su demo', source: 'client', parent: 'demo_started' },
  { id: 'demo_refined', label: 'Pidieron un ajuste a la IA', source: 'client', parent: 'demo_ready', branch: true },
  { id: 'publish_click', label: 'Tocaron "Publicar mi sitio"', source: 'client', parent: 'demo_ready' },
  { id: 'register_view', label: 'Abrieron el registro (desde cualquier botón)', source: 'client', parent: 'landing_view' },
  { id: 'register_step2', label: 'Llegaron a los datos del negocio', source: 'client', parent: 'register_view' },
  { id: 'org_created', label: 'Crearon su negocio', source: 'server', parent: 'register_step2' },
  { id: 'payment_started', label: 'Llegaron al pago (Stripe)', source: 'server', parent: 'org_created' },
  { id: 'subscribed', label: 'Activaron (prueba gratis o pago)', source: 'server', parent: 'payment_started' },
  { id: 'setup_opened', label: 'Abrieron el asistente de configuración', source: 'client', parent: 'subscribed' },
  { id: 'setup_applied', label: 'La IA configuró su negocio', source: 'server', parent: 'setup_opened' },
]

export const CLIENT_STEPS = new Set(FUNNEL_STEPS.filter(s => s.source === 'client').map(s => s.id))
export const SESSION_RE = /^[a-z0-9]{12,40}$/
