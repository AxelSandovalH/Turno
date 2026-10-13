import type { MetadataRoute } from 'next'

const SITE = 'https://www.quickturno.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/register'],
      // Enlaces por negocio o por cliente, panel y rutas internas: no son para buscadores
      disallow: ['/api/', '/admin', '/login', '/payment', '/onboarding', '/setup', '/auth/', '/book/', '/p/', '/r/', '/oferta/', '/deposit/', '/pedir/', '/comprar'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
