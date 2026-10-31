// Medición de Google Ads / Analytics. Un solo helper para todos los eventos de la landing.
// Es seguro llamarlo sin gtag (bloqueadores, sin ID configurado): no hace nada.

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

export function track(event: string, params: Record<string, unknown> = {}) {
  if (typeof window === 'undefined') return
  try { window.gtag?.('event', event, params) } catch { /* medición nunca debe romper la página */ }
}
