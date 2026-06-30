import { cn } from '@/lib/cn'

type BrandLogoProps = {
  className?: string
  priority?: boolean
}

export function BrandLogo({ className, priority = false }: BrandLogoProps) {
  return (
    <img
      src="/logo_amrad.png"
      alt="AMRAD"
      className={cn('h-12 w-auto', className)}
      fetchPriority={priority ? 'high' : undefined}
    />
  )
}
