import * as React from 'react'
import { cn } from '@/lib/utils'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'min-h-24 w-full resize-none rounded-2xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-white/20',
        'transition-all duration-300 focus:border-white/20 focus:bg-white/[0.06] focus-visible:outline-none',
        className,
      )}
      {...props}
    />
  ),
)

Textarea.displayName = 'Textarea'
