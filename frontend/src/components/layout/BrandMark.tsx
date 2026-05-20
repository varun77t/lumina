import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

export function BrandMark({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/10 backdrop-blur-sm">
        <Sparkles className="h-4 w-4 text-white/80" />
      </div>
      <span className="text-base font-semibold tracking-tight text-white">Lumina AI</span>
    </div>
  )
}
