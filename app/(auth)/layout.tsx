export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight">Turno</h1>
          <p className="text-sm text-muted-foreground mt-1">Recepcionista digital para tu negocio</p>
        </div>
        {children}
      </div>
    </div>
  )
}
