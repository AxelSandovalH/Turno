import { createServiceClient } from '@/lib/supabase/service'

export interface SalesConfig {
  enabled: boolean
  run_until: string | null
  last_run_at: string | null
  last_run_result: string | null
  ultramsg_instance: string | null
  ultramsg_token: string | null
  owner_phone: string | null
  daily_limit: number
  send_start_hour: number
  send_end_hour: number
  timezone: string
  max_followups: number
  followup_after_days: number
}

export async function getSalesConfig(): Promise<SalesConfig | null> {
  const db = createServiceClient()
  const { data } = await db.from('sales_config').select('*').eq('id', 1).single()
  return (data as SalesConfig | null) ?? null
}

/** Credenciales de la línea de ventas (null si falta configurarla). */
export function salesCreds(cfg: SalesConfig): { instance: string; token: string } | null {
  return cfg.ultramsg_instance && cfg.ultramsg_token ? { instance: cfg.ultramsg_instance, token: cfg.ultramsg_token } : null
}

/** ¿La instancia que mandó el webhook es la línea de ventas? Acepta "173093" e "instance173093". */
export function isSalesInstance(webhookInstanceId: string, cfg: SalesConfig): boolean {
  const digits = (v: string) => v.replace(/\D/g, '')
  return !!cfg.ultramsg_instance && !!webhookInstanceId && digits(webhookInstanceId) === digits(cfg.ultramsg_instance)
}
