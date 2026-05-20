import * as React from 'react'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
type ButtonSize = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-white text-black border-white/80 hover:bg-white/90 hover:shadow-[0_0_28px_rgba(255,255,255,0.14)]',
  secondary:
    'bg-white/[0.04] text-white/80 border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.14]',
  ghost:
    'bg-transparent text-white/45 border-transparent hover:bg-white/[0.05] hover:text-white/80',
  danger:
    'bg-red-500/10 text-red-300 border-red-400/15 hover:bg-red-500/15 hover:text-red-200',
}

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs rounded-xl',
  md: 'h-11 px-5 text-sm rounded-xl',
  lg: 'h-12 px-7 text-sm rounded-2xl',
  icon: 'h-10 w-10 rounded-xl p-0',
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 border font-medium transition-all duration-300',
        'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/25',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
)

Button.displayName = 'Button'
