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
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1">
        {label}
        {unit && <span className="text-muted font-normal ml-1">({unit})</span>}
        {required && <span className="text-danger ml-0.5">*</span>}
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
        className="ion-input"
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
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
