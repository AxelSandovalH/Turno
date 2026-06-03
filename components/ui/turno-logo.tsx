import Image from 'next/image'

interface TurnoLogoProps {
  height?: number
  className?: string
  /** 'dark' = logo blanco (para fondos oscuros) · 'light' = logo azul original (para fondos claros) */
  variant?: 'dark' | 'light'
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
        // dark variant → invertir a blanco; light variant → color original azul
        filter: variant === 'dark' ? 'brightness(0) invert(1)' : 'none',
      }}
    />
  )
}
