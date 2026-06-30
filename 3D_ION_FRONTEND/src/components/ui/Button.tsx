import { ButtonHTMLAttributes, forwardRef } from 'react'
import { cn } from '@/lib/cn'

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'admin'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white hover:bg-primary-hover focus-visible:ring-primary/40',
  secondary:
    'bg-slate-100 text-foreground hover:bg-slate-200 focus-visible:ring-slate-300',
  outline:
    'border border-border bg-surface text-foreground hover:bg-slate-50 focus-visible:ring-primary/30',
  ghost:
    'text-foreground hover:bg-slate-100 focus-visible:ring-slate-200',
  danger:
    'bg-danger text-white hover:bg-red-700 focus-visible:ring-red-300',
  admin:
    'bg-admin text-white hover:bg-admin-hover focus-visible:ring-orange-300',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-11 px-4 py-2 text-sm font-medium',
  lg: 'min-h-12 px-6 py-3 text-base font-semibold',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
)

Button.displayName = 'Button'
