'use client'

import { useState, useEffect } from 'react'
import { CheckCircle2, AlertCircle } from 'lucide-react'
import FormFieldLabel from '../FormFieldLabel'
import { logger } from '@/lib/logger'
import { getNormalizedApiUrl } from '@/lib/api'

interface PatternOption {
  id: string
  name: string
  description: string
}

interface PatternSelectProps {
  selectedPatterns: string[] // IDs dos padrões selecionados
  onChange: (patterns: string[]) => void
  onError?: (error: string | null) => void
}

// Padrões locais como fallback
const DEFAULT_PATTERNS: PatternOption[] = [
  { id: 'rectilinear', name: 'Rectilinear', description: 'Padrão retilíneo' },
  { id: 'grid', name: 'Grid', description: 'Padrão em grade' },
  { id: 'line', name: 'Line', description: 'Padrão em linhas' },
  { id: 'cubic', name: 'Cubic', description: 'Padrão cúbico' },
  { id: 'triangles', name: 'Triangles', description: 'Padrão triangular' },
  { id: 'gyroid', name: 'Gyroid', description: 'Padrão Gyroid' },
  { id: 'honeycomb', name: 'Honeycomb', description: 'Padrão em favo de mel' },
  { id: 'cross', name: 'Cross', description: 'Padrão em cruz' },
  { id: '3d_honeycomb', name: '3D Honeycomb', description: 'Favo de mel 3D' },
  { id: 'hilbert', name: 'Hilbert Curve', description: 'Curva de Hilbert' },
  { id: 'octagram', name: 'Octagram Spiral', description: 'Espiral Octagram' },
  { id: 'crosshatch', name: 'CrossHatch', description: 'Padrão cruzado' },
  { id: 'archimedean', name: 'Archimedean Chords', description: 'Cordas de Arquimedes' }
]

export default function PatternSelect({ selectedPatterns, onChange, onError }: PatternSelectProps) {
  const [patterns, setPatterns] = useState<PatternOption[]>(DEFAULT_PATTERNS)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Buscar padrões disponíveis
  useEffect(() => {
    const fetchPatterns = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`${getNormalizedApiUrl()}/experiments/patterns`)
        if (!response.ok) {
          throw new Error('Falha ao carregar padrões')
        }

        const data = await response.json()
        if (data.patterns && data.patterns.length > 0) {
          // Usar padrões do servidor
          setPatterns(data.patterns)
        } else {
          // Fallback para padrões locais
          setPatterns(DEFAULT_PATTERNS)
        }
      } catch (err) {
        logger.warn('PatternSelect', err instanceof Error ? err.message : 'Unknown error')
        // Usar padrões locais como fallback
        setPatterns(DEFAULT_PATTERNS)
      } finally {
        setLoading(false)
      }
    }

    fetchPatterns()
  }, [onError])

  const togglePattern = (patternId: string) => {
    setError(null)
    const newSelected = selectedPatterns.includes(patternId)
      ? selectedPatterns.filter(id => id !== patternId)
      : [...selectedPatterns, patternId]
    
    onChange(newSelected)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormFieldLabel 
          label="Padrões de Preenchimento" 
          required 
          hint="Selecione um ou mais padrões usados na amostra"
        />
        {selectedPatterns.length > 0 && (
          <CheckCircle2 className="w-5 h-5 text-primary" />
        )}
      </div>

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}

      {/* Grid de padrões - 5 colunas x 3 linhas */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-3">
        {patterns.map((pattern) => (
          <label
            key={pattern.id}
            className={`flex items-start gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-lg cursor-pointer transition-all min-h-11 ${
              selectedPatterns.includes(pattern.id)
                ? 'border-primary bg-primary-light'
                : 'border-border hover:border-gray-400'
            }`}
          >
            <input
              type="checkbox"
              checked={selectedPatterns.includes(pattern.id)}
              onChange={() => togglePattern(pattern.id)}
              className="w-5 h-5 text-primary rounded mt-0.5"
            />
            <div className="flex-1">
              <div className="font-medium text-sm text-foreground">
                {pattern.name}
              </div>
              {pattern.description && (
                <div className="text-xs text-muted mt-1">
                  {pattern.description}
                </div>
              )}
            </div>
          </label>
        ))}
      </div>

      {selectedPatterns.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <span className="font-semibold">⚠️ Atenção:</span> Selecione pelo menos um padrão de preenchimento.
          </p>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">ℹ️ Nota:</span> Se a amostra foi produzida com múltiplos padrões, 
          selecione todos eles. Cada padrão criará um registro separado vinculado ao mesmo experimento.
        </p>
        <p className="text-sm text-blue-900">
          Os padrões que você selecionará aqui serão usados para gerar automaticamente os formulários de infill 
          (40%, 60%, 80% e 100% para cada padrão). Preencha os dados de cada infill na próxima seção.
        </p>
      </div>
    </div>
  )
}
