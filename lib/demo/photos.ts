import manifest from './photo-manifest.json'
import type { DemoPhoto } from './types'

// Biblioteca de fotos REALES por giro (nunca generadas). Se llena soltando archivos en
// public/demo-photos/<giro>/<etiqueta>-<n>.jpg y corriendo: npx tsx scripts/build-demo-photos.ts
type Manifest = Record<string, { hero: DemoPhoto[]; tags: Record<string, DemoPhoto[]> }>
const LIB = manifest as Manifest

/** Etiquetas de foto disponibles por giro (lo único que la IA puede pedir). */
export function availableTags(): Record<string, string[]> {
  return Object.fromEntries(Object.entries(LIB).map(([seg, v]) => [seg, Object.keys(v.tags)]))
}

const pick = <T,>(list: T[] | undefined, seed: number): T | null => (list && list.length ? list[seed % list.length] : null)

export function heroPhoto(segment: string, seed = 0): DemoPhoto | null {
  return pick(LIB[segment]?.hero, seed)
}
export function servicePhoto(segment: string, tag: string | undefined, seed = 0): DemoPhoto | null {
  if (!tag) return null
  return pick(LIB[segment]?.tags[tag], seed)
}
