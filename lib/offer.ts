import { createHmac, timingSafeEqual } from 'crypto'
import { isPlanKey, type PlanKey } from '@/lib/plans'

// Enlaces de oferta con vencimiento real: el token lleva plan + fecha límite
// firmados, así que el contador no se puede reiniciar ni alterar desde el link.
export const OFFER_PERCENT_OFF = 25
export const OFFER_HOURS = 24
export const OFFER_COUPON_ID = 'qt-primer-mes-25'

function secret(): string {
  const s = process.env.OFFER_SECRET ?? process.env.CRON_SECRET
  if (!s) throw new Error('Falta OFFER_SECRET o CRON_SECRET para firmar ofertas')
  return s
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url')
}

export function createOfferToken(plan: PlanKey, hours = OFFER_HOURS): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + hours * 3600_000
  const payload = `${plan}.${expiresAt}`
  return { token: `${payload}.${sign(payload)}`, expiresAt }
}

export type OfferCheck =
  | { valid: true; plan: PlanKey; expiresAt: number }
  | { valid: false; reason: 'invalid' | 'expired' }

export function verifyOfferToken(token: string): OfferCheck {
  const [plan, exp, sig] = token.split('.')
  if (!plan || !exp || !sig || !isPlanKey(plan) || !/^\d+$/.test(exp)) return { valid: false, reason: 'invalid' }
  const expected = Buffer.from(sign(`${plan}.${exp}`))
  const given = Buffer.from(sig)
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return { valid: false, reason: 'invalid' }
  const expiresAt = Number(exp)
  if (Date.now() >= expiresAt) return { valid: false, reason: 'expired' }
  return { valid: true, plan, expiresAt }
}
