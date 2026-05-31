interface SpinnerProps {
  size?: number
  color?: string
}

export function Spinner({ size = 32, color = '#7c3aed' }: SpinnerProps) {
  return (
    <div
      className="tb-spinner"
      style={{ '--uib-size': `${size}px`, '--uib-color': color } as React.CSSProperties}
    >
      <div className="tb-dot" />
      <div className="tb-dot" />
      <div className="tb-dot" />
    </div>
  )
}
