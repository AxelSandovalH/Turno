import Stripe from 'stripe'
import { createServiceClient } from '@/lib/supabase/service'
import { stripe as platformStripe } from '@/lib/stripe'
import { decryptSecret } from '@/lib/secrets'

export interface OrgStripe { client: Stripe; webhookSecret: string; livemode: boolean }

/** Stripe propio del negocio, o null si cobra por la cuenta de la plataforma. */
export async function getOrgStripe(orgId: string): Promise<OrgStripe | null> {
  const db = createServiceClient()
  const { data } = await db.from('org_stripe_accounts').select('secret_key_enc, webhook_secret_enc, livemode').eq('organization_id', orgId).maybeSingle()
  if (!data) return null
  return {
    client: new Stripe(decryptSecret(data.secret_key_enc), { apiVersion: '2026-05-27.dahlia' as never }),
    webhookSecret: decryptSecret(data.webhook_secret_enc),
    livemode: !!data.livemode,
  }
}

/** Cliente de Stripe con el que debe cobrar este negocio: el suyo si lo configuró; si no, el de la plataforma. */
export async function stripeFor(orgId: string): Promise<Stripe> {
  return (await getOrgStripe(orgId))?.client ?? platformStripe
}

/** ¿Este negocio tiene su propia cuenta de Stripe? (sin descifrar nada) */
export async function hasOrgStripe(orgId: string): Promise<boolean> {
  const { data } = await createServiceClient().from('org_stripe_accounts').select('organization_id').eq('organization_id', orgId).maybeSingle()
  return !!data
}
