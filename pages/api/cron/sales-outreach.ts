import type { NextApiRequest, NextApiResponse } from 'next'
import { runOutreach } from '@/lib/sales/outreach'
import { syncProspectsToNotion } from '@/lib/sales/notion-sync'
import { createServiceClient } from '@/lib/supabase/service'

// Cada hora: envía unos pocos mensajes en frío a prospectos cargados, dentro del horario y el tope diario
// que se configuran en /admin/ventas. Las pausas entre mensajes requieren más tiempo que el estándar.
export const config = { maxDuration: 120 }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    const outreach = await runOutreach()
    // Queda registrado qué pasó en esta pasada para mostrarlo en /admin/ventas
    await createServiceClient().from('sales_config').update({
      last_run_at: new Date().toISOString(),
      last_run_result: outreach.skipped ? `No envió: ${outreach.skipped}` : `${outreach.sent} enviados`,
    }).eq('id', 1)
    // El CRM de Notion se mantiene al día cada hora; si falla no afecta al envío
    const notion = await syncProspectsToNotion().catch(err => { console.error('[sales-outreach] sync Notion falló:', err); return null })
    return res.status(200).json({ ...outreach, notion })
  } catch (err) {
    console.error('[sales-outreach] falló:', err)
    return res.status(500).json({ error: 'Falló el envío' })
  }
}
