import type { MetadataRoute } from 'next'

const SITE = 'https://www.quickturno.app'

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/register`, changeFrequency: 'monthly', priority: 0.6 },
    ...['barberias', 'salones', 'restaurantes'].map(g => ({ url: `${SITE}/${g}`, changeFrequency: 'weekly' as const, priority: 0.8 })),
    { url: `${SITE}/privacidad`, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${SITE}/terminos`, changeFrequency: 'yearly', priority: 0.3 },
  ]
}
