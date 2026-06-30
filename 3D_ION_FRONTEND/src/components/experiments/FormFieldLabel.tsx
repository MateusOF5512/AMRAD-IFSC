interface FormFieldLabelProps {
  label: string
  required?: boolean
  optional?: boolean
  hint?: string
}

export default function FormFieldLabel({
  label,
  required = false,
  optional = false,
  hint,
}: FormFieldLabelProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">
        {label}
        {required && <span className="text-danger font-bold ml-1">*</span>}
        {optional && <span className="text-muted text-xs ml-1">(opcional)</span>}
      </label>
      {hint && <p className="text-xs text-muted mb-2">{hint}</p>}
    </div>
  )
}
