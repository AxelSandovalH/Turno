import { LandingPage } from '@/components/landing-page'

// Datos estructurados: describen el producto, su precio y sus funciones para buscadores y herramientas que leen la página
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'QuickTurno',
  url: 'https://www.quickturno.app',
  image: 'https://www.quickturno.app/opengraph-image',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, WhatsApp',
  inLanguage: 'es-MX',
  description: 'Recepcionista por WhatsApp para negocios: contesta a tus clientes las 24 horas, agenda citas, confirma y recuerda, cobra anticipos con tarjeta y toma pedidos con entrega a domicilio. Para barberías, spas, consultorios, tours, restaurantes y farmacias.',
  featureList: [
    'Responde por WhatsApp las 24 horas',
    'Agenda, confirma y recuerda citas',
    'Cobra anticipos con tarjeta',
    'Toma pedidos con menú y entrega a domicilio',
    'Panel para ver citas, pedidos, clientes y finanzas',
  ],
  offers: {
    '@type': 'AggregateOffer',
    priceCurrency: 'MXN',
    lowPrice: 700,
    highPrice: 1700,
    offerCount: 4,
    url: 'https://www.quickturno.app/#pricing',
    description: '7 días gratis en el plan básico. Cancela cuando quieras.',
  },
}

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <LandingPage />
    </>
  )
}
