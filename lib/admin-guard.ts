import { createClient } from '@/lib/supabase/server'

/** ¿Quien hace la petición es administrador de la plataforma? */
export async function isPlatformAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user?.user_metadata?.is_platform_admin
}
