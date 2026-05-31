'use client'

interface AnimatedCheckboxProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  disabled?: boolean
}

export function AnimatedCheckbox({ id, checked, onChange, disabled }: AnimatedCheckboxProps) {
  return (
    <div className="ac-wrap">
      <div className="ac-cbx">
        <input
          type="checkbox"
          id={id}
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        <label htmlFor={id} />
        <svg fill="none" viewBox="0 0 15 14" height={14} width={15}>
          <path d="M2 8.36364L6.23077 12L13 2" stroke="white" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={19} strokeDashoffset={checked ? 0 : 19} style={{ transition: 'stroke-dashoffset 0.3s ease 0.2s' }} />
        </svg>
      </div>
      {/* SVG filter for the splash goo effect */}
      <svg style={{ position: 'absolute', top: '-130%', left: '-170%', width: 110, pointerEvents: 'none' }}>
        <defs>
          <filter id={`goo-${id}`}>
            <feGaussianBlur result="blur" stdDeviation={4} in="SourceGraphic" />
            <feColorMatrix result="goo" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -7" mode="matrix" in="blur" />
            <feBlend in2="goo" in="SourceGraphic" />
          </filter>
        </defs>
      </svg>
    </div>
  )
}
