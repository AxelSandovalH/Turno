import { NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { PLANS, TRIAL_DAYS } from '@/lib/plans'
import { OFFER_COUPON_ID, OFFER_PERCENT_OFF, verifyOfferToken } from '@/lib/offer'

// Crea el checkout con 25% de descuento solo en el primer mes (cupón duration: once).
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quickturno.app'
  const check = verifyOfferToken(token)
  if (!check.valid) return NextResponse.redirect(`${baseUrl}/oferta/${token}`, 303)

  const plan = PLANS[check.plan]
  try {
    try {
      await stripe.coupons.retrieve(OFFER_COUPON_ID)
    } catch {
      await stripe.coupons.create({
        id: OFFER_COUPON_ID,
        percent_off: OFFER_PERCENT_OFF,
        duration: 'once',
        name: `${OFFER_PERCENT_OFF}% primer mes`,
      })
    }
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
      discounts: [{ coupon: OFFER_COUPON_ID }],
      phone_number_collection: { enabled: true },
      success_url: `${baseUrl}/register?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/oferta/${token}`,
      subscription_data: { trial_period_days: TRIAL_DAYS },
      metadata: { source: 'offer-25', plan: plan.key },
    })
    return NextResponse.redirect(session.url!, 303)
  } catch (err) {
    console.error('[oferta]', err)
    return NextResponse.redirect(`${baseUrl}/oferta/${token}`, 303)
  }
}
