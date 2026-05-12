import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'sharp'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-pure-white text-charcoal-canvas rounded-pill px-8 py-2.5 font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-pure-white border border-pure-white rounded-pill px-4 py-1.5 hover:bg-pure-white/10 transition-colors',
  sharp:
    'bg-transparent text-pure-white rounded-sm px-2 hover:bg-pure-white/10 transition-colors',
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
