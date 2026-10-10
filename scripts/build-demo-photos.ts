// Indexa las fotos de public/demo-photos en lib/demo/photo-manifest.json.
// Estructura:   public/demo-photos/<giro>/<etiqueta>-<n>.jpg     (giro = barbershop, spa, dentistry, ...)
// La etiqueta "hero" son las fotos grandes de portada; el resto (corte, masaje, limpieza...) se asignan a servicios.
import { readdirSync, statSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = join(process.cwd(), 'public/demo-photos')
const OUT = join(process.cwd(), 'lib/demo/photo-manifest.json')
const EXT = /\.(jpe?g|png|webp)$/i
const manifest: Record<string, { hero: { src: string; alt: string }[]; tags: Record<string, { src: string; alt: string }[]> }> = {}

if (existsSync(ROOT)) {
  for (const seg of readdirSync(ROOT)) {
    const dir = join(ROOT, seg)
    if (!statSync(dir).isDirectory()) continue
    for (const file of readdirSync(dir).filter(f => EXT.test(f)).sort()) {
      const tag = file.replace(EXT, '').replace(/-\d+$/, '').toLowerCase()
      const photo = { src: `/demo-photos/${seg}/${file}`, alt: tag.replace(/[-_]/g, ' ') }
      manifest[seg] ??= { hero: [], tags: {} }
      if (tag === 'hero') manifest[seg].hero.push(photo)
      else (manifest[seg].tags[tag] ??= []).push(photo)
    }
  }
}
writeFileSync(OUT, JSON.stringify(manifest, null, 2) + '\n')
const n = Object.values(manifest).reduce((a, s) => a + s.hero.length + Object.values(s.tags).reduce((b, l) => b + l.length, 0), 0)
console.log(`Listo: ${n} fotos en ${Object.keys(manifest).length} giros -> lib/demo/photo-manifest.json`)
