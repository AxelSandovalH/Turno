import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { resolvePlan } from '@/lib/plans'

// Compra directa desde el anuncio: 1 clic → Stripe Checkout, sin cuenta previa.
// /comprar → plan con asistente; /comprar?plan=agenda → solo agenda.
// Al pagar, el success_url manda a /register?session_id=... y el onboarding
// reclama la sesión (ver app/api/onboarding/route.ts) para activar la org.
export async function GET(req: Request) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
  const plan = resolvePlan(new URL(req.url).searchParams.get('plan'))
  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'mxn',
          unit_amount: plan.amount,
          recurring: { interval: 'month' },
          product_data: { name: plan.name, description: plan.description },
        },
      }],
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/register?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/`,
      metadata: { source: 'direct-ad', plan: plan.key },
    })
    return NextResponse.redirect(session.url!, 303)
  } catch (err) {
    console.error('[comprar]', err)
    return NextResponse.redirect(`${baseUrl}/register`, 303)
  }
}
