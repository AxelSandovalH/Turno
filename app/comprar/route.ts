import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'

// Compra directa desde el anuncio: 1 clic → Stripe Checkout, sin cuenta previa.
// Al pagar, el success_url manda a /register?session_id=... y el onboarding
// reclama la sesión (ver app/api/onboarding/route.ts) para activar la org.
// Mantener plan y cupón en sync con app/api/stripe-checkout/route.ts.
const PLAN = { name: 'Turno — Agenda + Asistente', amount: 249900, description: 'Tu WhatsApp contesta y agenda solo, 24/7' }
const LAUNCH_COUPON_ID = '3ZuBBrZd'

export async function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'mxn',
          unit_amount: PLAN.amount,
          recurring: { interval: 'month' },
          product_data: { name: PLAN.name, description: PLAN.description },
        },
      }],
      discounts: [{ coupon: LAUNCH_COUPON_ID }],
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/register?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata: { source: 'direct-ad', plan: 'turno-ai' },
    })
    return NextResponse.redirect(session.url!, 303)
  } catch (err) {
    console.error('[comprar]', err)
    return NextResponse.redirect(`${baseUrl}/register`, 303)
  }
}
