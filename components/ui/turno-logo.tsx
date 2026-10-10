import Image from 'next/image'

interface TurnoLogoProps {
  height?: number
  className?: string
  /** 'dark' = logo blanco (fondos oscuros) · 'light' = logo azul original · 'black' = logo negro (fondos claros) */
  variant?: 'dark' | 'light' | 'black'
}

export function TurnoLogo({ height = 32, className = '', variant = 'dark' }: TurnoLogoProps) {
  // aspect ratio del SVG: 2816 / 1536 ≈ 1.833
  const width = Math.round(height * (2816 / 1536))

  return (
    <Image
      src="/logotrans.svg"
      alt="Turno"
      height={height}
      width={width}
      className={className}
      style={{
        display: 'block',
        height,
        width,
        // dark → blanco; black → negro; light → color original azul
        filter: variant === 'dark' ? 'brightness(0) invert(1)' : variant === 'black' ? 'brightness(0)' : 'none',
      }}
    />
  )
}
