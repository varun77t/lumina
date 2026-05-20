import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-12 w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 text-sm text-white placeholder:text-white/20',
        'transition-all duration-300 focus:border-white/20 focus:bg-white/[0.06] focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  ),
)

Input.displayName = 'Input'
