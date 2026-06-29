'use client'

/**
 * Campo numérico sem validação HTML5 de "step" (evita erro
 * "Insira um valor válido" com decimais longos ou vírgula local).
 */

interface ScientificNumberInputProps {
  id?: string
  label: string
  hint?: string
  unit?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function ScientificNumberInput({
  id,
  label,
  hint,
  unit,
  value,
  onChange,
  placeholder = 'Ex: 1250,5 ou 1250.5',
  required = false,
}: ScientificNumberInputProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {unit && <span className="text-gray-500 font-normal ml-1">({unit})</span>}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </div>
  )
}

/** Converte texto com vírgula ou ponto para número; vazio → null */
export function parseScientificNumber(raw: string): number | null {
  const trimmed = raw.trim()
  if (!trimmed) return null
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.')
  const n = Number(normalized)
  return Number.isFinite(n) ? n : null
}
