import Link from 'next/link'

interface FancyButtonProps {
  href?: string
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
}

export function FancyButton({ href, children, onClick, type = 'button', disabled }: FancyButtonProps) {
  const inner = (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className="fb-btn"
      style={{ opacity: disabled ? 0.6 : 1 }}
    >
      {children}
      <div className="fb-btn-icon">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width={24} height={24}>
          <path d="M0 0h24v24H0z" fill="none" />
          <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" fill="currentColor" />
        </svg>
      </div>
    </button>
  )

  if (href) return <Link href={href}>{inner}</Link>
  return inner
}
