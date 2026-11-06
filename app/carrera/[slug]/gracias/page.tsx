import Link from 'next/link'

export default async function Gracias({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#14301a] px-4 text-center text-white">
      <div className="max-w-md space-y-3">
        <div className="text-5xl">🏁</div>
        <h1 className="text-2xl font-extrabold">¡Listo, ya estás inscrito!</h1>
        <p className="text-green-50/80">Te enviamos la confirmación por correo. Si no la ves, revisa tu carpeta de spam. Presenta tu nombre el día del evento.</p>
        <Link href={`/carrera/${slug}`} className="inline-block text-sm text-yellow-300 underline">Volver al evento</Link>
      </div>
    </main>
  )
}
