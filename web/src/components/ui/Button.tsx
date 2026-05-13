import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'ghost' | 'sharp'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  children: ReactNode
}

const VARIANT_CLASSES: Record<Variant, string> = {
  primary:
    'bg-polar-white text-midnight-charcoal rounded-lg px-4 py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent text-polar-white border border-polar-white/25 rounded-lg px-4 py-2 text-sm hover:bg-polar-white/5 transition-colors',
  sharp:
    'bg-transparent text-silver-dust rounded-md px-2 py-1 text-sm hover:text-polar-white transition-colors',
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={`${VARIANT_CLASSES[variant]} ${className}`} {...rest}>
      {children}
    </button>
  )
}
