import { HTMLAttributes } from 'react'
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/cn'

type AlertVariant = 'info' | 'success' | 'warning' | 'danger'

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant
  title?: string
}

const config: Record<AlertVariant, { bg: string; icon: typeof Info }> = {
  info: { bg: 'bg-blue-50 border-blue-200 text-blue-800', icon: Info },
  success: { bg: 'bg-primary-light border-primary/30 text-primary', icon: CheckCircle2 },
  warning: { bg: 'bg-amber-50 border-amber-200 text-amber-800', icon: AlertTriangle },
  danger: { bg: 'bg-red-50 border-red-200 text-red-800', icon: AlertCircle },
}

export function Alert({ className, variant = 'info', title, children, ...props }: AlertProps) {
  const { bg, icon: Icon } = config[variant]

  return (
    <div className={cn('flex gap-3 rounded-lg border p-4 text-sm', bg, className)} {...props}>
      <Icon className="h-5 w-5 shrink-0 mt-0.5" />
      <div>
        {title && <p className="font-semibold mb-1">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  )
}
