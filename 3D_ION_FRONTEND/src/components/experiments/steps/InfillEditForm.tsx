'use client'

/**
 * InfillEditForm — componente de EDIÇÃO de medições de infill existentes.
 *
 * Diferente de PredefinedInfillsForm (que é para cadastro novo), este componente:
 * - Recebe diretamente as linhas do banco (já com id, pattern_type, infill_pct, hu_mean, …)
 * - Inicializa estado SINCRONAMENTE no useState() — sem useEffect de init que pode disparar
 *   fora de hora e apagar os valores
 * - No save, chama PUT /{experimentId}/update-infills que faz UPDATE WHERE id para cada linha
 * - Não cria novas linhas, nunca
 * - Permite edição de A e B com rastreamento de modo manual vs automático
 */

import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import FormFieldLabel from '../FormFieldLabel'
import { getNormalizedApiUrl } from '@/lib/api'
import { logger } from '@/lib/logger'

const API_BASE_URL = getNormalizedApiUrl()

interface InfillRow {
  id: string
  pattern_type: string
  infill_pct: number
  hu_mean: number
  sd_value: number | null
  has_homogeneity_issues: boolean
  image_urls: string[]
  notes: string | null
  dimension_a: number | null
  dimension_b: number | null
}

interface InfillEditFormProps {
  experimentId: string
  initialMeasurements: any[]          // linhas brutas vindas do banco via /detalhes
  onSaved: () => void                  // chamado após salvar com sucesso
  onCancel: () => void
}

/** Converte uma linha bruta do banco em InfillRow normalizada */
function normalizeRow(m: any): InfillRow {
  const dimA = m.dimension_a != null ? Number(m.dimension_a) : null
  const dimB = m.dimension_b != null ? Number(m.dimension_b) : null
  
  // Converter visual_homogeneity (boolean ou numeric) para has_homogeneity_issues (boolean)
  let hasHomogeneityIssues = false
  if (m.has_homogeneity_issues != null) {
    hasHomogeneityIssues = Boolean(m.has_homogeneity_issues)
  } else if (m.visual_homogeneity != null) {
    // Backward compatibility: se for número, > 50 = true; se for boolean, use direto
    hasHomogeneityIssues = typeof m.visual_homogeneity === 'boolean'
      ? m.visual_homogeneity
      : m.visual_homogeneity > 50
  }
  
  return {
    id: m.id,
    pattern_type: m.pattern_type || '',
    infill_pct: Number(m.infill_pct),
    hu_mean: m.hu_mean != null ? Number(m.hu_mean) : 0,
    sd_value: m.sd_value != null ? Number(m.sd_value) : null,
    has_homogeneity_issues: hasHomogeneityIssues,
    image_urls: m.image_urls
      ? (Array.isArray(m.image_urls) ? m.image_urls : [m.image_urls])
      : m.image_url
        ? [m.image_url]
        : [],
    notes: m.notes ?? null,
    dimension_a: dimA,
    dimension_b: dimB,
  }
}

/** Remove linhas duplicadas baseado em id */
function deduplicateRows(measurements: any[]): any[] {
  if (!measurements || measurements.length === 0) return []
  
  const seenIds = new Set<string>()
  const deduped: any[] = []
  
  for (const m of measurements) {
    if (m.id && !seenIds.has(m.id)) {
      seenIds.add(m.id)
      deduped.push(m)
    }
  }
  
  return deduped
}

export default function InfillEditForm({
  experimentId,
  initialMeasurements,
  onSaved,
  onCancel,
}: InfillEditFormProps) {
  const { t } = useTranslation()
  
  // Remove duplicates baseado em id - proteção contra carga duplicada
  const dedupedMeasurements = deduplicateRows(initialMeasurements)
  
  // Estado inicializado SINCRONAMENTE — nunca fica em branco ao montar
  const [rows, setRows] = useState<InfillRow[]>(
    () => dedupedMeasurements.map(normalizeRow)
  )
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  
  // Estado de regressão por padrão: { a, b, manualA, manualB }
  // Initialize EMPTY - will be populated by useEffect with normalized row data
  const [patternRegression, setPatternRegression] = useState<Record<string, {
    a: number | null
    b: number | null
    manualA: boolean
    manualB: boolean
  }>>({})

  // Sync patternRegression with loaded dimension_a/dimension_b values from NORMALIZED rows
  // This ensures A/B values from database are always reflected in the regression panel
  useEffect(() => {
    if (rows.length === 0) {
      setPatternRegression({})
      return
    }
    
    const init: Record<string, { a: number | null, b: number | null, manualA: boolean, manualB: boolean }> = {}
    
    const patterns = new Set<string>()
    rows.forEach(r => patterns.add(r.pattern_type))
    
    for (const pattern of patterns) {
      const patternRows = rows.filter(r => r.pattern_type === pattern)
      if (patternRows.length > 0) {
        const firstRow = patternRows[0]
        const dimA = firstRow.dimension_a
        const dimB = firstRow.dimension_b
        
        init[pattern] = {
          a: dimA,
          b: dimB,
          manualA: dimA !== null,
          manualB: dimB !== null,
        }
      }
    }
    
    setPatternRegression(init)
  }, [rows])

  // Atualizar campo de uma linha pelo id
  const updateRow = useCallback((id: string, field: keyof InfillRow, value: any) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      return { ...r, [field]: value }
    }))
  }, [])

  const updateImageUrls = useCallback((id: string, urls: string[]) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, image_urls: urls } : r))
  }, [])

  // Função para calcular A e B via OLS (requer ≥ 2 pares válidos)
  const calculateRegression = useCallback((data: InfillRow[]) => {
    const validPairs = data.filter(d => d.infill_pct > 0 && d.hu_mean !== 0)
    if (validPairs.length < 2) return null

    const n = validPairs.length
    const sumX  = validPairs.reduce((s, d) => s + d.infill_pct, 0)
    const sumY  = validPairs.reduce((s, d) => s + d.hu_mean,   0)
    const sumXY = validPairs.reduce((s, d) => s + d.infill_pct * d.hu_mean, 0)
    const sumXX = validPairs.reduce((s, d) => s + d.infill_pct * d.infill_pct, 0)
    const denom = n * sumXX - sumX * sumX
    if (denom === 0) return null

    const a = parseFloat(((n * sumXY - sumX * sumY) / denom).toFixed(6))
    const b = parseFloat(((sumY - a * sumX) / n).toFixed(6))
    return { a, b }
  }, [])

  // Atualizar A ou B manualmente no painel de resumo do padrão
  const updatePatternField = (pattern: string, field: 'a' | 'b', value: string) => {
    const parsed = value === '' ? null : parseFloat(value)
    setPatternRegression(prev => ({
      ...prev,
      [pattern]: {
        ...prev[pattern],
        [field]: (parsed !== null && isNaN(parsed)) ? null : parsed,
        ...(field === 'a' ? { manualA: value !== '' } : { manualB: value !== '' }),
      },
    }))
    
    // Also update all rows of this pattern to keep dimension_a/dimension_b in sync
    if (value !== '') {
      setRows(prev => prev.map(r => {
        if (r.pattern_type !== pattern) return r
        return {
          ...r,
          [field === 'a' ? 'dimension_a' : 'dimension_b']: parsed
        }
      }))
    }
  }

  // Voltar ao modo automático (apagar edição manual)
  const resetPatternField = (pattern: string, field: 'a' | 'b') => {
    const patternItems = rows.filter(d => d.pattern_type === pattern)
    const regression = calculateRegression(patternItems)
    setPatternRegression(prev => ({
      ...prev,
      [pattern]: {
        ...prev[pattern],
        a: field === 'a' ? (regression?.a ?? null) : (prev[pattern]?.a ?? null),
        b: field === 'b' ? (regression?.b ?? null) : (prev[pattern]?.b ?? null),
        ...(field === 'a' ? { manualA: false } : { manualB: false }),
      },
    }))
    
    // Also update all rows of this pattern with calculated value
    const newValue = field === 'a' ? regression?.a : regression?.b
    if (newValue !== undefined && newValue !== null) {
      setRows(prev => prev.map(r => {
        if (r.pattern_type !== pattern) return r
        return {
          ...r,
          [field === 'a' ? 'dimension_a' : 'dimension_b']: newValue
        }
      }))
    }
  }

  // Agrupar por pattern_type para exibição
  const { byPattern, patterns } = useMemo(() => {
    const grouped: Record<string, InfillRow[]> = {}
    for (const r of rows) {
      if (!grouped[r.pattern_type]) grouped[r.pattern_type] = []
      grouped[r.pattern_type].push(r)
    }
    return {
      byPattern: grouped,
      patterns: Object.keys(grouped).sort()
    }
  }, [rows])

  // Salvar: PUT /{experimentId}/update-infills → UPDATE WHERE id para cada linha
  const handleSave = async () => {
    setIsSaving(true)
    setSaveError(null)
    try {
      const userData = localStorage.getItem('user')
      if (!userData) throw new Error('Não autenticado')
      const { access_token } = JSON.parse(userData)

      const payload = rows.map(r => ({
        id: r.id,
        pattern_type: r.pattern_type,
        infill_pct: r.infill_pct,
        hu_mean: r.hu_mean,
        sd_value: r.sd_value,
        has_homogeneity_issues: r.has_homogeneity_issues,
        notes: r.notes || '',
        image_url: r.image_urls[0] ?? null,
        // Usar valores de A e B do estado de regressão (pode ser manual ou auto)
        dimension_a: patternRegression[r.pattern_type]?.a ?? null,
        dimension_b: patternRegression[r.pattern_type]?.b ?? null,
      }))

      // 🆕 Enviar também os flags indicando quais padrões têm A/B manuais
      const patternManualFlags = Object.entries(patternRegression).reduce(
        (acc, [pattern, reg]) => ({
          ...acc,
          [pattern]: {
            manual_a: reg.manualA ?? false,
            manual_b: reg.manualB ?? false,
          }
        }),
        {}
      )

      // Validar pattern_type no frontend antes de enviar
      const invalidRows = payload.filter(m => !m.pattern_type || !m.pattern_type.trim())
      if (invalidRows.length > 0) {
        throw new Error(`${invalidRows.length} medição(ões) sem pattern_type definido`)
      }

      const res = await fetch(`${API_BASE_URL}/experiments/${experimentId}/update-infills`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          measurements: payload,
          pattern_manual_flags: patternManualFlags  // 🆕 Enviar flags
        }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        logger.error('InfillEditForm', 'Failed to save infill measurements')
        throw new Error(err.detail || `Erro ao salvar (${res.status})`)
      }

      onSaved()
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Erro desconhecido'
      logger.error('InfillEditForm', e instanceof Error ? e.message : 'Unknown error')
      setSaveError(errorMsg)
    } finally {
      setIsSaving(false)
    }
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        ⚠️ Nenhuma medição de infill encontrada para este experimento.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-cyan-200 bg-cyan-50 p-3 text-sm text-cyan-900">
        <strong>📊 {rows.length} medição(ões) carregadas.</strong> Edite os valores e clique em Salvar.
      </div>

      {patterns.map((pattern, idx) => {
        const patternRows = byPattern[pattern]
        const filled = patternRows.filter(r => r.hu_mean > 0).length
        // Ordenar infills por porcentagem para exibição
        const sortedRows = [...patternRows].sort((a, b) => a.infill_pct - b.infill_pct)

        return (
          <div key={pattern} className={`border-2 border-teal-300 rounded-xl bg-gradient-to-br from-teal-50 to-cyan-50 shadow-md overflow-hidden ${idx < patterns.length - 1 ? 'mb-12' : ''}`}>
            {/* Header do padrão - mais destacado */}
            <div className="px-6 py-4 bg-gradient-to-r from-teal-600 to-cyan-600">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-white">📋 {pattern || '(sem padrão)'}</h3>
                  <p className="text-sm text-teal-100 mt-1">4 medições: 40% • 60% • 80% • 100%</p>
                </div>
                <div className="text-right">
                  <span className="inline-block px-4 py-2 rounded-full bg-surface/20 text-white font-semibold">
                    {filled}/{patternRows.length} preenchido(s)
                  </span>
                </div>
              </div>
            </div>

            {/* Cards de infill - agrupados por padrão */}
            <div className="p-6 space-y-4">
              {sortedRows.map(row => {
                const isExpanded = expandedId === row.id
                const isFilled = row.hu_mean > 0

                return (
                  <div
                    key={row.id}
                    className={`overflow-hidden rounded-lg border-2 transition-all ${
                      isFilled ? 'border-green-400 bg-primary-light' : 'border-border bg-surface'
                    }`}
                  >
                    {/* Header do card - acessível para click */}
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                      className={`w-full flex items-center justify-between px-5 py-4 transition-all hover:shadow-md ${
                        isFilled ? 'bg-gradient-to-r from-green-100 to-green-50 border-b-2 border-primary/30' : 'bg-gradient-to-r from-gray-50 to-white border-b border-border'
                      }`}
                    >
                      <div className="flex flex-1 items-center gap-4 text-left">
                        <div className="font-bold text-lg text-teal-600 min-w-[3rem]">{row.infill_pct}%</div>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Infill Medição</p>
                          <p className="text-sm text-muted mt-0.5">
                            HU: {row.hu_mean > 0 ? row.hu_mean : 'vazio'}
                            {row.sd_value != null ? ` | SD: ${row.sd_value}` : ''}
                          </p>
                        </div>
                        {isFilled && <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-primary" />}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-teal-600 font-bold" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-muted" />
                      )}
                    </button>

                    {/* Conteúdo expandido */}
                    {isExpanded && (
                      <div className="space-y-5 border-t border-border bg-surface px-4 py-3">
                        {/* HU Mean */}
                        <div>
                          <FormFieldLabel label="HU Mean" required />
                          <input
                            type="number"
                            step="0.01"
                            value={row.hu_mean}
                            onChange={e => updateRow(row.id, 'hu_mean',
                              e.target.value === '' ? 0 : parseFloat(e.target.value) || 0
                            )}
                            className={`mt-1 w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                              row.hu_mean > 0 ? 'border-green-300 bg-primary-light' : 'border-border'
                            }`}
                            placeholder="0.00"
                          />
                        </div>

                        {/* SD Value + Visual Homogeneity */}
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div>
                            <FormFieldLabel label="SD Value" />
                            <input
                              type="number"
                              step="0.01"
                              value={row.sd_value ?? ''}
                              onChange={e => updateRow(row.id, 'sd_value',
                                e.target.value === '' ? null : parseFloat(e.target.value)
                              )}
                              className="mt-1 w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>

                          <div>
                            <FormFieldLabel label={t('experimentWizard.infill.visualHomogeneity')} />
                            <div className="mt-2 flex items-center gap-3">
                              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-4 py-2 transition-all hover:bg-background">
                                <input
                                  type="checkbox"
                                  checked={row.has_homogeneity_issues}
                                  onChange={e => updateRow(row.id, 'has_homogeneity_issues', e.target.checked)}
                                  className="h-4 w-4 cursor-pointer accent-green-600"
                                />
                                <span className="font-medium">
                                  {row.has_homogeneity_issues ? '✅ Sim (houve buracos)' : '❌ Não (sem buracos)'}
                                </span>
                              </label>
                            </div>
                          </div>
                        </div>

                        {/* Imagens */}
                        <div>
                          <FormFieldLabel label="Imagens (URLs)" />
                          <button
                            type="button"
                            onClick={() => updateImageUrls(row.id, [...row.image_urls, ''])}
                            className="mb-2 mt-1 w-full rounded-lg border-2 border-dashed border-green-400 bg-primary-light py-2 text-sm font-semibold text-primary hover:bg-primary-muted"
                          >
                            + Adicionar imagem
                          </button>
                          {row.image_urls.length === 0 && (
                            <p className="text-xs italic text-slate-400">Nenhuma imagem.</p>
                          )}
                          <div className="space-y-2">
                            {row.image_urls.map((url, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <input
                                  type="url"
                                  value={url}
                                  onChange={e => {
                                    const updated = [...row.image_urls]
                                    updated[i] = e.target.value
                                    updateImageUrls(row.id, updated)
                                  }}
                                  className="flex-1 rounded-lg border border-border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                  placeholder={`https://... (imagem ${i + 1})`}
                                />
                                <button
                                  type="button"
                                  onClick={() => updateImageUrls(row.id, row.image_urls.filter((_, j) => j !== i))}
                                  className="px-1 text-lg font-bold leading-none text-red-400 hover:text-red-600"
                                >✕</button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Notas */}
                        <div>
                          <FormFieldLabel label="Notas / Observações" />
                          <textarea
                            value={row.notes || ''}
                            onChange={e => updateRow(row.id, 'notes', e.target.value || null)}
                            className="mt-1 w-full rounded-lg border border-border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-400"
                            rows={3}
                            placeholder="Observações, condições de teste..."
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Painel de Resumo de Regressão por Padrão */}
            {(() => {
              const reg = patternRegression[pattern] || { a: null, b: null, manualA: false, manualB: false }
              const validCount = patternRows.filter(i => i.hu_mean !== 0 && i.infill_pct > 0).length
              const hasRegression = reg.a !== null && reg.b !== null
              
              return (
                <div className={`mt-2 p-4 rounded-lg border-2 ${
                  hasRegression
                    ? 'border-teal-300 bg-teal-50'
                    : 'border-dashed border-border bg-background'
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-sm font-bold text-teal-900">📊 Regressão Linear — {pattern}</span>
                    {!hasRegression && (
                      <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                        {validCount < 2
                          ? `Aguardando ${2 - validCount} medição(ões) para calcular...`
                          : 'Dados insuficientes'}
                      </span>
                    )}
                    {hasRegression && (
                      <span className="text-xs text-teal-600 font-mono bg-surface border border-teal-200 px-2 py-0.5 rounded-full">
                        HU = {Number(reg.a).toFixed(4)} × % + ({Number(reg.b).toFixed(4)})
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {/* Termo A */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-foreground">Termo A (Angular)</label>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            reg.manualA ? 'bg-orange-100 text-orange-700' : 'bg-primary-muted text-primary'
                          }`}>
                            {reg.manualA ? '✏️ Manual' : '⚡ Auto'}
                          </span>
                          {reg.manualA && (
                            <button
                              type="button"
                              onClick={() => resetPatternField(pattern, 'a')}
                              className="text-xs text-slate-400 hover:text-red-500 ml-1 font-bold"
                              title="Voltar ao automático"
                            >✕</button>
                          )}
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.000001"
                        value={reg.a !== null ? reg.a : ''}
                        onChange={(e) => updatePatternField(pattern, 'a', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 ${
                          reg.a !== null
                            ? (reg.manualA ? 'border-orange-300 bg-orange-50' : 'border-teal-300 bg-teal-50')
                            : 'border-dashed border-border bg-surface'
                        }`}
                        placeholder="Aguardando 2ª medição..."
                      />
                    </div>
                    {/* Termo B */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-foreground">Termo B (Linear)</label>
                        <div className="flex items-center gap-1">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                            reg.manualB ? 'bg-orange-100 text-orange-700' : 'bg-primary-muted text-primary'
                          }`}>
                            {reg.manualB ? '✏️ Manual' : '⚡ Auto'}
                          </span>
                          {reg.manualB && (
                            <button
                              type="button"
                              onClick={() => resetPatternField(pattern, 'b')}
                              className="text-xs text-slate-400 hover:text-red-500 ml-1 font-bold"
                              title="Voltar ao automático"
                            >✕</button>
                          )}
                        </div>
                      </div>
                      <input
                        type="number"
                        step="0.000001"
                        value={reg.b !== null ? reg.b : ''}
                        onChange={(e) => updatePatternField(pattern, 'b', e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-teal-400 ${
                          reg.b !== null
                            ? (reg.manualB ? 'border-orange-300 bg-orange-50' : 'border-teal-300 bg-teal-50')
                            : 'border-dashed border-border bg-surface'
                        }`}
                        placeholder="Aguardando 2ª medição..."
                      />
                    </div>
                  </div>
                </div>
              )
            })()}
          </div>
        )
      })}

      {/* Erro de save */}
      {saveError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          ❌ {saveError}
        </div>
      )}

      {/* Botões */}
      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 font-semibold text-white hover:bg-primary-hover disabled:opacity-60"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : '✅'}
          {isSaving ? 'Salvando…' : 'Salvar Infill'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg bg-slate-200 px-5 py-2 font-semibold text-foreground hover:bg-slate-300 disabled:opacity-60"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
