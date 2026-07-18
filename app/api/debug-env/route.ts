import { NextResponse } from 'next/server'
import { createHash } from 'crypto'

// ⚠️ TEMPORAL — diagnóstico de STRIPE_WEBHOOK_SECRET en producción. BORRAR después.
export async function GET() {
  const v = process.env.STRIPE_WEBHOOK_SECRET ?? ''
  return NextResponse.json({
    set: !!v,
    length: v.length,
    prefix: v.slice(0, 6),
    sha256: createHash('sha256').update(v).digest('hex').slice(0, 16),
  })
}
