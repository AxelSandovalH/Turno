// Registro de pasos del embudo desde el navegador. Solo manda el paso, el giro (si aplica) y un id aleatorio de este
// navegador. No envía lo que la persona escribe ni ningún dato personal.
const KEY = 'qt-fid'
let memory: string | null = null

export function getFunnelSession(): string {
  try {
    let id = localStorage.getItem(KEY)
    if (!id) { id = crypto.randomUUID().replace(/-/g, '').slice(0, 24); localStorage.setItem(KEY, id) }
    return id
  } catch {
    return (memory ??= Math.random().toString(36).slice(2, 14).padEnd(12, '0'))
  }
}

export function track(step: string, segment?: string) {
  try {
    fetch('/api/track', {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ session: getFunnelSession(), step, segment }),
    }).catch(() => {})
  } catch { /* medir nunca debe romper la página */ }
}
