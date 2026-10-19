/** Descarga una foto que mandó el cliente para que el asistente pueda verla. Devuelve null si no es una imagen válida o es muy grande. */
const MAX_BYTES = 5 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const
export type ImageMediaType = (typeof TYPES)[number]

export async function fetchImage(url: string): Promise<{ mediaType: ImageMediaType; data: string } | null> {
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    const res = await fetch(u, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) return null
    const mediaType = (res.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase() as ImageMediaType
    if (!TYPES.includes(mediaType)) return null
    const buf = Buffer.from(await res.arrayBuffer())
    if (buf.length === 0 || buf.length > MAX_BYTES) return null
    return { mediaType, data: buf.toString('base64') }
  } catch {
    return null
  }
}
