import type { DemoPhoto } from '@/lib/demo/types'

export const money = (n: number) => `$${n.toLocaleString('es-MX')}`

export function slugify(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 32) || 'tu-negocio'
}

/** Foto real de la biblioteca o, si no hay, un degradado con el color del negocio (nunca una imagen generada). */
export function Photo({ photo, accent, className = '', children }: { photo: DemoPhoto | null; accent: string; className?: string; children?: React.ReactNode }) {
  return (
    <div className={`relative overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}>
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo.src} alt={photo.alt} className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
      )}
      {children}
    </div>
  )
}

/** Marco de navegador para las vistas de escritorio. */
export function BrowserFrame({ url, isDay, children }: { url: string; isDay: boolean; children: React.ReactNode }) {
  const c = isDay ? { chrome: '#f0efe9', border: '#e0ddd8', url: '#ffffff', text: '#8a8a8a' } : { chrome: '#0c0c0c', border: '#1f1f1f', url: '#1a1a1a', text: '#8a8a8a' }
  return (
    <div className="mx-auto w-full max-w-[760px] overflow-hidden rounded-2xl border shadow-2xl" style={{ borderColor: c.border }}>
      <div className="flex items-center gap-3 border-b px-3.5 py-2.5" style={{ background: c.chrome, borderColor: c.border }}>
        <div className="flex shrink-0 gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#ff5f57' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#febc2e' }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: '#28c840' }} />
        </div>
        <div className="flex h-6 min-w-0 flex-1 items-center rounded-md border px-3" style={{ background: c.url, borderColor: c.border }}>
          <span className="truncate text-[11px]" style={{ color: c.text }}>{url}</span>
        </div>
      </div>
      {children}
    </div>
  )
}
