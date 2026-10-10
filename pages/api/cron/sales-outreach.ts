import type { NextApiRequest, NextApiResponse } from 'next'
import { runOutreach } from '@/lib/sales/outreach'

// Cada hora: envía unos pocos mensajes en frío a prospectos cargados, dentro del horario y el tope diario
// que se configuran en /admin/ventas. Las pausas entre mensajes requieren más tiempo que el estándar.
export const config = { maxDuration: 120 }

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') return res.status(405).end()
  if (req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  try {
    return res.status(200).json(await runOutreach())
  } catch (err) {
    console.error('[sales-outreach] falló:', err)
    return res.status(500).json({ error: 'Falló el envío' })
  }
}
