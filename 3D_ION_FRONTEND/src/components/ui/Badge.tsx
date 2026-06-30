import { HTMLAttributes } from 'react'
import { cn } from '@/lib/cn'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'admin'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-slate-100 text-slate-700',
  success: 'bg-primary-muted text-primary',
  warning: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-blue-100 text-blue-700',
  admin: 'bg-orange-100 text-orange-700',
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
