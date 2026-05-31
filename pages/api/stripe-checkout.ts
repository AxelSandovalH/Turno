import type { NextApiRequest, NextApiResponse } from 'next'
import { stripe } from '@/lib/stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { createClient } from '@/lib/supabase/server'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return res.status(401).json({ error: 'No autorizado' })

  const organizationId = user.user_metadata?.organization_id
  if (!organizationId) return res.status(400).json({ error: 'Sin organización' })

  const service = createServiceClient()
  const { data: org } = await service
    .from('organizations')
    .select('id, name, email, stripe_customer_id')
    .eq('id', organizationId)
    .single()

  if (!org) return res.status(404).json({ error: 'Organización no encontrada' })

  // Get or create Stripe customer
  let customerId = org.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: org.email ?? user.email ?? undefined,
      name: org.name,
      metadata: { organization_id: org.id },
    })
    customerId = customer.id
    await service
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', org.id)
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    payment_method_types: ['card'],
    line_items: [{ price: process.env.STRIPE_PRICE_ID!, quantity: 1 }],
    success_url: `${appUrl}/settings?success=1`,
    cancel_url: `${appUrl}/settings?cancelled=1`,
    metadata: { organization_id: org.id },
    subscription_data: {
      metadata: { organization_id: org.id },
    },
  })

  return res.status(200).json({ url: session.url })
}
