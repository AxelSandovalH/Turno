import { redirect } from 'next/navigation'

// El alta del negocio vive ahora en /register (también para quien entra con Google)
export default function OnboardingPage() {
  redirect('/register')
}
