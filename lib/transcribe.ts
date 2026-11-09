// Voz a texto: Claude no procesa audio, así que la nota de voz del cliente se transcribe con
// Whisper (OpenAI) y el texto entra al mismo flujo que un mensaje escrito (~$0.006 USD por minuto).
const MAX_BYTES = 20 * 1024 * 1024 // Whisper acepta hasta 25 MB

/** Devuelve el texto del audio, o null si no se pudo (sin llave, descarga fallida, vacío…). Nunca lanza. */
export async function transcribeAudio(url: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY
  if (!key) {
    console.error('[transcribe] falta OPENAI_API_KEY')
    return null
  }
  try {
    const u = new URL(url)
    if (u.protocol !== 'https:') return null
    const r = await fetch(u, { signal: AbortSignal.timeout(30_000) })
    if (!r.ok) throw new Error(`descarga ${r.status}`)
    const buf = await r.arrayBuffer()
    if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) return null
    const type = (r.headers.get('content-type') ?? 'audio/ogg').split(';')[0].trim()
    const ext = /mp4|m4a/.test(type) ? 'm4a' : /mpeg|mp3/.test(type) ? 'mp3' : /wav/.test(type) ? 'wav' : 'ogg'
    const form = new FormData()
    form.append('file', new Blob([buf], { type }), `nota.${ext}`)
    form.append('model', 'whisper-1')
    // Sin idioma fijo: Whisper detecta español o inglés por sí solo
    const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form, signal: AbortSignal.timeout(60_000),
    })
    if (!res.ok) throw new Error(`Whisper ${res.status}: ${(await res.text()).slice(0, 200)}`)
    const text = (((await res.json()) as { text?: string }).text ?? '').trim()
    return text || null
  } catch (err) {
    console.error('[transcribe] falló:', err)
    return null
  }
}
