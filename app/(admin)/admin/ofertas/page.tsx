import { OfferGenerator } from './offer-generator'

export default function OffersPage() {
  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold">Enlaces de oferta</h1>
      <p className="text-sm text-muted-foreground mt-1">
        25% de descuento en el primer mes. El contador de 24 horas empieza al generar el enlace.
      </p>
      <OfferGenerator />
    </div>
  )
}
