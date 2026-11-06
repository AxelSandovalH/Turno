import Link from 'next/link'

export default async function Gracias({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ donacion?: string }> }) {
  const { slug } = await params
  const { donacion } = await searchParams
  return (
    <main className="flex min-h-dvh items-center justify-center bg-[#070907] px-6 text-center text-white [font-family:-apple-system,BlinkMacSystemFont,'SF_Pro_Display',Inter,system-ui,sans-serif]">
      <div className="max-w-md space-y-4">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-[#ffd60a] text-3xl text-black">✓</div>
        <h1 className="text-[2.4rem] font-semibold leading-[1.05] tracking-[-0.035em]">{donacion ? 'Gracias por ayudar.' : 'Ya estás inscrito.'}</h1>
        <p className="text-[17px] leading-snug text-white/65">
          {donacion
            ? 'Recibimos tu donación. Te enviamos la confirmación por correo; si no la ves, revisa tu carpeta de spam.'
            : 'Te enviamos la confirmación por correo; si no la ves, revisa tu carpeta de spam. Presenta tu nombre el día del evento.'}
        </p>
        <Link href={`/carrera/${slug}`} className="inline-block pt-2 text-[17px] text-[#ffd60a]">Volver al evento ›</Link>
      </div>
    </main>
  )
}
