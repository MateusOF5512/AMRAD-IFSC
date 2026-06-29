import React from 'react'

interface FormFieldLabelProps {
  label: string
  required?: boolean
  optional?: boolean
  hint?: string
}

/**
 * Rótulo padronizado para campos de formulário
 * Com indicação clara se é obrigatório/opcional
 */
export default function FormFieldLabel({
  label,
  required = false,
  optional = false,
  hint,
}: FormFieldLabelProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 font-bold ml-1">*</span>}
        {optional && <span className="text-gray-500 text-xs ml-1">(opcional)</span>}
      </label>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
    </div>
  )
}
