import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-05-27.dahlia' as any,
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
