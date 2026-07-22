import Stripe from 'stripe'

// El SDK de Stripe lanza al construirse si falta la API key. Si eso pasa a
// nivel de módulo, tumba el import completo de cualquier ruta que use esto
// (ej. /api/stripe-checkout) ANTES de que exista un handler que pueda
// atrapar el error — Next.js responde con una página de error genérica en
// vez de JSON, y el fetch del cliente se queda colgado sin nunca resolver
// su try/catch. Con un Proxy, la construcción real se difiere hasta el
// primer uso real (dentro del handler), donde sí hay un try/catch que
// puede convertirlo en una respuesta JSON de error normal.
let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error('STRIPE_SECRET_KEY no configurada — no se puede procesar el pago')
    }
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: '2026-05-27.dahlia' as any,
    })
  }
  return _stripe
}

export const stripe: Stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver)
  },
})

interface DepositCheckoutParams {
  organizationId: string
  appointmentId: string
  amountPesos: number
  businessName: string
  serviceName: string
}

/**
 * One-time payment (no subscription) checkout session for a booking deposit.
 * Distinguished from subscription checkouts via mode:'payment' + metadata.type.
 */
export async function createDepositCheckoutSession({
  organizationId, appointmentId, amountPesos, businessName, serviceName,
}: DepositCheckoutParams) {
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    line_items: [{
      quantity: 1,
      price_data: {
        currency: 'mxn',
        unit_amount: Math.round(amountPesos * 100),
        product_data: {
          name: `Anticipo — ${serviceName}`,
          description: `Anticipo para tu cita en ${businessName}`,
        },
      },
    }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/deposit/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/deposit/cancelled`,
    metadata: { type: 'deposit', organization_id: organizationId, appointment_id: appointmentId },
  })
  return { url: session.url!, sessionId: session.id }
}
