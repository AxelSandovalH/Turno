/**
 * Video del bot debajo del hero. La URL va en NEXT_PUBLIC_BOT_VIDEO_URL: un link de YouTube (watch, youtu.be o embed) o un .mp4.
 * Sin URL no se muestra nada en producción (en desarrollo, un espacio reservado).
 */
function youtubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/)
  return m ? m[1] : null
}

export function BotVideo({ t }: { t: { text: string; muted: string; border: string; card: string } }) {
  const url = process.env.NEXT_PUBLIC_BOT_VIDEO_URL
  const yt = url ? youtubeId(url) : null
  const mp4 = url && !yt && /\.mp4(\?|$)/i.test(url) ? url : null
  if (!yt && !mp4 && process.env.NODE_ENV === 'production') return null
  return (
    <section style={{ borderTop: `1px solid ${t.border}` }}>
      <div className="max-w-3xl mx-auto px-5 py-12 sm:py-16">
        <h2 className="text-[22px] sm:text-[28px] font-bold tracking-[-0.02em] text-center mb-6" style={{ color: t.text }}>Míralo contestar en 30 segundos</h2>
        <div className="relative w-full overflow-hidden rounded-xl" style={{ aspectRatio: '16 / 9', border: `1px solid ${t.border}`, background: t.card }}>
          {yt ? (
            <iframe src={`https://www.youtube-nocookie.com/embed/${yt}`} title="QuickTurno en acción" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" />
          ) : mp4 ? (
            <video src={mp4} controls playsInline preload="metadata" className="absolute inset-0 h-full w-full" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-[13px] text-center px-6" style={{ color: t.muted }}>
              TODO: define NEXT_PUBLIC_BOT_VIDEO_URL con el link de YouTube o .mp4 del video del bot
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
