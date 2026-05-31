import type { NextApiRequest, NextApiResponse } from 'next'
import { createServiceClient } from '@/lib/supabase/service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { userId, name, slug, whatsappNumber, email } = req.body

  if (!userId || !name || !slug || !whatsappNumber) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  const service = createServiceClient()

  const trialEndsAt = new Date()
  trialEndsAt.setDate(trialEndsAt.getDate() + 14)

  const { data: org, error: orgError } = await service
    .from('organizations')
    .insert({
      name,
      slug,
      whatsapp_number: whatsappNumber,
      email,
      trial_ends_at: trialEndsAt.toISOString(),
      subscription_status: 'trialing',
    })
    .select()
    .single()

  if (orgError) {
    if (orgError.code === '23505') {
      return res.status(409).json({ error: 'El número de WhatsApp ya está registrado' })
    }
    return res.status(500).json({ error: orgError.message })
  }

  await service.from('branches').insert({ organization_id: org.id, name })

  const { error: metaError } = await service.auth.admin.updateUserById(userId, {
    user_metadata: { organization_id: org.id },
  })

  if (metaError) return res.status(500).json({ error: metaError.message })

  await service.from('staff').insert({
    organization_id: org.id,
    user_id: userId,
    name,
    role: 'owner',
  })

  return res.status(200).json({ organizationId: org.id })
}
