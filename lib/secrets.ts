import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto'

/** Cifrado AES-256-GCM para llaves de terceros guardadas en la base. La clave sale de ORG_SECRETS_KEY (solo en Vercel). */
function key(): Buffer {
  const raw = process.env.ORG_SECRETS_KEY
  if (!raw || raw.length < 16) throw new Error('Falta ORG_SECRETS_KEY en Vercel (genera una con: openssl rand -hex 32)')
  return createHash('sha256').update(raw).digest()
}

export const secretsConfigured = () => !!process.env.ORG_SECRETS_KEY && process.env.ORG_SECRETS_KEY.length >= 16

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12)
  const c = createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([c.update(plain, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), enc].map(b => b.toString('base64')).join('.')
}

export function decryptSecret(payload: string): string {
  const [iv, tag, enc] = payload.split('.').map(p => Buffer.from(p, 'base64'))
  const d = createDecipheriv('aes-256-gcm', key(), iv)
  d.setAuthTag(tag)
  return Buffer.concat([d.update(enc), d.final()]).toString('utf8')
}
