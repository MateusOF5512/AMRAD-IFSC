'use client'

import { useState, useMemo, useEffect, memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp } from 'lucide-react'
import FormFieldLabel from '../FormFieldLabel'

interface InfillData {
  id?: string          // UUID da linha na DB — preservado para UPDATE correto na edição
  pattern_type: string
  infill_pct: number
  hu_mean: number
  notes: string | null
  sd_value: number | null
  has_homogeneity_issues: boolean  // true = Sim (houve buracos), false = Não (sem buracos)
  image_urls: string[]
  dimension_a: number | null
  dimension_b: number | null
}

interface SelectedInfill {
  pattern_type: string
  infill_pct: number
}

/** Normaliza visual_homogeneity (pode vir como boolean ou number) para has_homogeneity_issues (boolean) */
function normalizeHomogeneityIssues(data: any): boolean {
  if (data?.has_homogeneity_issues != null) {
    return Boolean(data.has_homogeneity_issues)
  }
  if (data?.visual_homogeneity != null) {
    const val = data.visual_homogeneity
    return typeof val === 'boolean' ? val : (val > 50)
  }
  return false
}

interface PredefinedInfillsFormProps {
  selectedInfills: SelectedInfill[]
  onDataChange: (data: InfillData[]) => void
  onRegressionChange?: (a: number | null, b: number | null) => void
  initialRegressionA?: number | null
  initialRegressionB?: number | null
  initialMeasurements?: any[]
}

export default memo(function PredefinedInfillsForm({ selectedInfills, onDataChange, onRegressionChange, initialRegressionA, initialRegressionB, initialMeasurements }: PredefinedInfillsFormProps) {
  const { t } = useTranslation()
  const [infillData, setInfillData] = useState<InfillData[]>([])
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showAddNewInfill, setShowAddNewInfill] = useState<string | null>(null) // padrão que está adicionando novo infill
  const [newInfillForm, setNewInfillForm] = useState({ 
    infill_pct: '', 
    hu_mean: '', 
    notes: '',
    sd_value: null as number | null,
    has_homogeneity_issues: false,
    image_urls: [] as string[]
  })

  // Função para adicionar novo infill customizado
  const handleAddNewInfill = (pattern: string) => {
    // Validação rigorosa
    const infill_pct = parseFloat(newInfillForm.infill_pct)
    const hu_mean = parseFloat(newInfillForm.hu_mean)

    if (isNaN(infill_pct) || isNaN(hu_mean)) {
      setError('Porcentagem e HU Mean devem ser números válidos')
      return
    }

    if (infill_pct < 0 || infill_pct > 100) {
      setError('Porcentagem deve estar entre 0 e 100')
      return
    }

    if (hu_mean <= 0) {
      setError('HU Mean deve ser um valor maior que 0')
      return
    }

    const newInfill: InfillData = {
      pattern_type: pattern,
      infill_pct: infill_pct,
      hu_mean: hu_mean,
      notes: newInfillForm.notes || null,
      sd_value: newInfillForm.sd_value || null,
      has_homogeneity_issues: newInfillForm.has_homogeneity_issues,
      image_urls: newInfillForm.image_urls.filter(url => url.trim() !== ''),
      dimension_a: null,
      dimension_b: null,
    }

    setInfillData([...infillData, newInfill])
    setNewInfillForm({ infill_pct: '', hu_mean: '', notes: '', sd_value: null, has_homogeneity_issues: false, image_urls: [] })
    setShowAddNewInfill(null)
    setError(null)
  }

  // Estado de regressão por padrão: { a, b, manualA, manualB }
  const [patternRegression, setPatternRegression] = useState<Record<string, {
    a: number | null
    b: number | null
    manualA: boolean
    manualB: boolean
  }>>({})

  // Inicializar dados quando infills selecionados mudam
  useEffect(() => {
    // Se selectedInfills está vazio mas temos initialMeasurements (modo edição)
    if (selectedInfills.length === 0 && initialMeasurements && initialMeasurements.length > 0) {
      const newData = initialMeasurements.map((m: any) => ({
        id: m.id,
        pattern_type: m.pattern_type,
        infill_pct: m.infill_pct,
        hu_mean: m.hu_mean ?? 0,
        notes: m.notes ?? null,
        sd_value: m.sd_value ?? null,
        has_homogeneity_issues: normalizeHomogeneityIssues(m),
        image_urls: m.image_urls ?? (m.image_url ? [m.image_url] : []),
        dimension_a: m.dimension_a ?? null,
        dimension_b: m.dimension_b ?? null,
      }))
      setInfillData(newData)
      setExpandedIndex(null)
      return
    }
    
    const newData = selectedInfills.map((sel) => {
      const existing = initialMeasurements?.find(m =>
        m.pattern_type === sel.pattern_type && Number(m.infill_pct) === sel.infill_pct
      )
      
      return {
        id: existing?.id ?? undefined,
        pattern_type: sel.pattern_type,
        infill_pct: sel.infill_pct,
        hu_mean: existing?.hu_mean ?? 0,
        notes: existing?.notes ?? null,
        sd_value: existing?.sd_value ?? null,
        has_homogeneity_issues: normalizeHomogeneityIssues(existing),
        image_urls: existing?.image_urls ?? (existing?.image_url ? [existing.image_url] : []),
        dimension_a: existing?.dimension_a ?? null,
        dimension_b: existing?.dimension_b ?? null,
      }
    })
    
    setInfillData(newData)
    setExpandedIndex(null)
    
    // Inicializar patternRegression a partir dos dados carregados APENAS se ainda não há regressão
    // Se há valores manuais já definidos, não sobrescrever
    setPatternRegression(prev => {
      const initializeRegression = { ...prev }
      newData.forEach(item => {
        if (!initializeRegression[item.pattern_type]) {
          // Novo padrão - inicializar com dados do banco se existirem
          initializeRegression[item.pattern_type] = {
            a: item.dimension_a ?? null,
            b: item.dimension_b ?? null,
            manualA: item.dimension_a !== null && item.dimension_a !== undefined,
            manualB: item.dimension_b !== null && item.dimension_b !== undefined,
          }
        }
        // Se padrão já existe, não sobrescrever (preserva edições manuais do usuário)
      })
      return initializeRegression
    })
  }, [selectedInfills, initialMeasurements])

  // Emitir dados: espalha A e B do painel de resumo para todos os cards do mesmo padrão
  useEffect(() => {
    const merged = infillData
      .filter(item => item.pattern_type && item.pattern_type.trim() !== '')
      .map(item => ({
        ...item,
        dimension_a: patternRegression[item.pattern_type]?.a ?? null,
        dimension_b: patternRegression[item.pattern_type]?.b ?? null,
      }))
    onDataChange(merged)
  }, [infillData, patternRegression])

  // Função para calcular A e B via OLS (requer ≥ 2 pares válidos)
  const calculateRegression = useCallback((data: InfillData[]) => {
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

  // Validar que hu_mean foi preenchido E padrão não é nulo
  const isFormValid = useMemo(() => {
    if (infillData.length === 0) return false
    return infillData.every(inf => inf.hu_mean > 0 && inf.pattern_type && inf.pattern_type.trim() !== '')
  }, [infillData])

  const updateField = useCallback((index: number, field: keyof InfillData, value: any) => {
    setInfillData(prev => {
      const newData = [...prev]
      const editedItem = newData[index]
      newData[index] = {
        ...editedItem,
        [field]: field === 'hu_mean'
          ? (value === '' || value === null ? 0 : parseFloat(value) || 0)
          : field === 'sd_value'
            ? (value === '' || value === null ? null : parseFloat(value) || 0)
            : value,
      }
      return newData
    })
    setError(null)
  }, [])

  // Atualizar lista de URLs de imagens de um card
  const updateImageUrls = (index: number, urls: string[]) => {
    setInfillData(prev => {
      const newData = [...prev]
      newData[index] = { ...newData[index], image_urls: urls }
      return newData
    })
  }

  // Atualizar A ou B manualmente no painel de resumo do padrão
  const updatePatternField = (pattern: string, field: 'a' | 'b', value: string) => {
    const parsed = value === '' ? null : parseFloat(value)
    const isManual = value !== ''
    setPatternRegression(prev => {
      const updated = {
        ...prev,
        [pattern]: {
          ...prev[pattern],
          [field]: (parsed !== null && isNaN(parsed)) ? null : parsed,
          ...(field === 'a' ? { manualA: isManual } : { manualB: isManual }),
        },
      }
      return updated
    })
  }

  // Voltar ao modo automático (apagar edição manual)
  const resetPatternField = (pattern: string, field: 'a' | 'b') => {
    const patternItems = infillData.filter(d => d.pattern_type === pattern)
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
  }

  // Recalcular regressão automaticamente após mudanças em infillData (só sobrescreve campos não-manuais)
  useEffect(() => {
    if (infillData.length === 0) return
    const patterns = [...new Set(infillData.map(d => d.pattern_type))]
    setPatternRegression(prev => {
      const updated = { ...prev }
      patterns.forEach(pattern => {
        const patternItems = infillData.filter(d => d.pattern_type === pattern)
        const regression = calculateRegression(patternItems)
        const current = prev[pattern] || { a: null, b: null, manualA: false, manualB: false }
        
        // IMPORTANTE: Se está em Manual, NUNCA sobrescreva com cálculo automático
        const newA = current.manualA ? current.a : (regression?.a ?? null)
        const newB = current.manualB ? current.b : (regression?.b ?? null)
        
        updated[pattern] = {
          a: newA,
          b: newB,
          manualA: current.manualA,
          manualB: current.manualB,
        }
      })
      return updated
    })
  }, [infillData])

  // Notificar o pai dos coeficientes do primeiro padrão (para uso externo)
  useEffect(() => {
    const firstPattern = infillData[0]?.pattern_type
    if (!firstPattern) return
    const reg = patternRegression[firstPattern]
    if (reg?.a !== null && reg?.b !== null && reg?.a !== undefined) {
      onRegressionChange?.(reg.a, reg.b)
    }
  }, [patternRegression])

  // Agrupar infills por padrão para melhor visualização
  const infillsByPattern = useMemo(() => {
    const grouped: Record<string, InfillData[]> = {}
    infillData.forEach(infill => {
      if (!grouped[infill.pattern_type]) {
        grouped[infill.pattern_type] = []
      }
      grouped[infill.pattern_type].push(infill)
    })
    // Ordenar padrões alfabeticamente E ordenar infills dentro de cada padrão por percentual
    return Object.entries(grouped)
      .sort(([patternA], [patternB]) => patternA.localeCompare(patternB))
      .map(([pattern, infills]) => [
        pattern,
        infills.sort((a, b) => a.infill_pct - b.infill_pct)
      ] as [string, InfillData[]])
  }, [infillData])

  const getCompletionPercentage = (infill: InfillData) => {
    const fields = [
      infill.hu_mean > 0,
      infill.notes,
      infill.sd_value !== null && infill.sd_value > 0,
      infill.has_homogeneity_issues !== undefined,
    ]
    const filled = fields.filter(Boolean).length
    return Math.round((filled / fields.length) * 100)
  }

  if (selectedInfills.length === 0 && (!initialMeasurements || initialMeasurements.length === 0)) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <p className="text-sm text-amber-900">
          ⚠️ Nenhum infill selecionado. Volte à seção anterior e selecione pelo menos um infill.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-900">
          <span className="font-semibold">📊 Você tem {infillData.length} infill(s) para preencher.</span>
          <br />
          Preencha as informações de cada um dos campos. O campo <span className="font-bold">HU Mean</span> é obrigatório.
        </p>
      </div>

      {/* Cards de Infill agrupados por Padrão */}
      <div className="space-y-6">
        {infillsByPattern.map(([pattern, patternInfills]) => {
          const patternCompletion = patternInfills.filter(i => i.hu_mean > 0).length
          const patternIsComplete = patternCompletion === patternInfills.length

          return (
            <div key={pattern} className="space-y-3">
              {/* Header do Grupo de Padrão */}
              <div className={`px-4 py-3 rounded-lg border-l-4 ${
                patternIsComplete
                  ? 'border-l-green-500 bg-primary-light'
                  : 'border-l-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-foreground">📋 {pattern}</h3>
                    <p className="text-xs text-muted mt-1">💡 Preencha HU Mean para gerar automaticamente A e B</p>
                  </div>
                  <span className="text-sm font-semibold text-muted">
                    {patternCompletion}/{patternInfills.length} preenchido(s)
                  </span>
                </div>
              </div>

              {/* Cards de Infill deste Padrão */}
              <div className="space-y-3 pl-4">
                {patternInfills.map((infill, idx) => {
                  const globalIdx = infillData.findIndex(i => i.pattern_type === pattern && i.infill_pct === infill.infill_pct)
                  const completion = getCompletionPercentage(infill)
                  const isExpanded = expandedIndex === globalIdx
                  const isMinimallyFilled = infill.hu_mean > 0

                  return (
                    <div
                      key={`${infill.pattern_type}-${infill.infill_pct}`}
                      className={`border-2 rounded-lg overflow-hidden transition-all ${
                        isMinimallyFilled
                          ? 'border-green-300 bg-primary-light'
                          : 'border-border bg-background'
                      }`}
                    >
                      {/* Header do Card */}
                      <button
                        onClick={() => setExpandedIndex(expandedIndex === globalIdx ? null : globalIdx)}
                        className={`w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-80 transition-colors ${
                          isMinimallyFilled ? 'bg-primary-muted' : 'bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1 text-left">
                          <div className="flex-1">
                            <h4 className="font-bold text-foreground mb-1">
                              {infill.infill_pct}% Infill
                            </h4>
                            <p className="text-sm text-muted">
                              HU Mean: {infill.hu_mean > 0 ? infill.hu_mean : '—'}{infill.notes ? ` · Notas` : ''}
                            </p>
                          </div>

                          {isMinimallyFilled && (
                            <CheckCircle2 className="w-6 h-6 text-primary shrink-0" />
                          )}
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-muted" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-muted" />
                        )}
                      </button>

              {/* Conteúdo Expandido */}
                      {isExpanded && (
                        <div className="px-6 py-4 border-t border-border bg-surface space-y-6">
                          {/* Linha 1: HU Mean */}
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <FormFieldLabel label="HU Mean" required />
                              <input
                                type="number"
                                step="0.01"
                                value={infill.hu_mean ?? ''}
                                onChange={(e) => updateField(globalIdx, 'hu_mean', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/40 focus:border-transparent ${
                                  infill.hu_mean > 0 ? 'border-green-300 bg-primary-light' : 'border-border'
                                }`}
                                placeholder="0.00"
                              />
                            </div>
                          </div>

                          {/* Linha 2: SD Value e Visual Homogeneity */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <FormFieldLabel label="SD Value" />
                              <input
                                type="number"
                                step="0.01"
                                value={infill.sd_value || ''}
                                onChange={(e) => updateField(globalIdx, 'sd_value', e.target.value ? parseFloat(e.target.value) : null)}
                                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder="0.00"
                              />
                            </div>

                            <div>
                              <FormFieldLabel label={t('experimentWizard.infill.visualHomogeneity')} />
                              <div className="flex items-center gap-3 mt-2">
                                <label className="flex items-center gap-3 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={infill.has_homogeneity_issues ?? false}
                                    onChange={(e) => updateField(globalIdx, 'has_homogeneity_issues', e.target.checked)}
                                    className="w-5 h-5 rounded border-border text-primary focus:ring-2 focus:ring-primary/40 cursor-pointer"
                                  />
                                  <span className="text-sm font-medium text-foreground">
                                    {infill.has_homogeneity_issues ? '✅ Sim (houve buracos)' : '❌ Não (sem buracos)'}
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* URLs de Imagens (múltiplas) */}
                          <div>
                            <FormFieldLabel label="Imagens (URLs)" />
                            <button
                              type="button"
                              onClick={() => updateImageUrls(globalIdx, [...infill.image_urls, ''])}
                              className="w-full mt-1 mb-3 flex items-center justify-center gap-1 text-sm font-semibold text-primary bg-primary-light hover:bg-primary-muted border-2 border-dashed border-green-400 px-3 py-2 rounded-lg transition-colors"
                            >
                              + Adicionar imagem
                            </button>
                            {infill.image_urls.length === 0 && (
                              <p className="text-xs text-slate-400 italic">Nenhuma imagem adicionada.</p>
                            )}
                            <div className="space-y-2">
                              {infill.image_urls.map((url, imgIdx) => (
                                <div key={imgIdx} className="flex items-center gap-2">
                                  <input
                                    type="url"
                                    value={url}
                                    onChange={(e) => {
                                      const updated = [...infill.image_urls]
                                      updated[imgIdx] = e.target.value
                                      updateImageUrls(globalIdx, updated)
                                    }}
                                    className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                                    placeholder={`https://... (imagem ${imgIdx + 1})`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = infill.image_urls.filter((_, i) => i !== imgIdx)
                                      updateImageUrls(globalIdx, updated)
                                    }}
                                    className="text-red-400 hover:text-red-600 font-bold text-lg leading-none px-1"
                                    title="Remover imagem"
                                  >✕</button>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Notas */}
                          <div>
                            <FormFieldLabel label="Notas / Observações" />
                            <textarea
                              value={infill.notes || ''}
                              onChange={(e) => updateField(globalIdx, 'notes', e.target.value || null)}
                              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              rows={3}
                              placeholder="Observações de teste, condições especiais, etc..."
                            />
                          </div>

                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Card para Adicionar Novo Infill Customizado */}
                <div
                  className={`border-2 rounded-lg overflow-hidden transition-all ${
                    showAddNewInfill === pattern
                      ? 'border-blue-300 bg-blue-50'
                      : 'border-border bg-background'
                  }`}
                >
                  {/* Header do Card */}
                  <button
                    onClick={() => setShowAddNewInfill(showAddNewInfill === pattern ? null : pattern)}
                    className={`w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-80 transition-colors ${
                      showAddNewInfill === pattern ? 'bg-blue-100' : 'bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground mb-1">
                          ➕ Adicionar Novo Infill Customizado
                        </h4>
                        <p className="text-sm text-muted">
                          Preencha os dados para criar um infill personalizado
                        </p>
                      </div>
                    </div>

                    {showAddNewInfill === pattern ? (
                      <ChevronUp className="w-5 h-5 text-muted" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-muted" />
                    )}
                  </button>

                  {/* Conteúdo Expandido */}
                  {showAddNewInfill === pattern && (
                    <div className="px-6 py-4 border-t border-border bg-surface space-y-6">
                      {/* Linha 1: Porcentagem, HU Mean */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FormFieldLabel label="Porcentagem (%)" required />
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={newInfillForm.infill_pct}
                            onChange={(e) => setNewInfillForm({ ...newInfillForm, infill_pct: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="Ex: 50"
                          />
                        </div>
                        <div>
                          <FormFieldLabel label="HU Mean" required />
                          <input
                            type="number"
                            step="0.01"
                            value={newInfillForm.hu_mean}
                            onChange={(e) => setNewInfillForm({ ...newInfillForm, hu_mean: e.target.value })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>
                      </div>

                      {/* Linha 2: SD Value e Visual Homogeneity */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <FormFieldLabel label="SD Value" />
                          <input
                            type="number"
                            step="0.01"
                            value={newInfillForm.sd_value || ''}
                            onChange={(e) => setNewInfillForm({ ...newInfillForm, sd_value: e.target.value ? parseFloat(e.target.value) : null })}
                            className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <FormFieldLabel label={t('experimentWizard.infill.visualHomogeneity')} />
                          <div className="flex items-center gap-3 mt-2">
                            <label className="flex items-center gap-3 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={newInfillForm.has_homogeneity_issues ?? false}
                                onChange={(e) => setNewInfillForm({ ...newInfillForm, has_homogeneity_issues: e.target.checked })}
                                className="w-5 h-5 rounded border-border text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-sm font-medium text-foreground">
                                {newInfillForm.has_homogeneity_issues ? '✅ Sim (houve buracos)' : '❌ Não (sem buracos)'}
                              </span>
                            </label>
                          </div>
                        </div>
                      </div>

                      {/* URLs de Imagens (múltiplas) */}
                      <div>
                        <FormFieldLabel label="Imagens (URLs)" />
                        <button
                          type="button"
                          onClick={() => setNewInfillForm({ ...newInfillForm, image_urls: [...newInfillForm.image_urls, ''] })}
                          className="w-full mt-1 mb-3 flex items-center justify-center gap-1 text-sm font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border-2 border-dashed border-blue-400 px-3 py-2 rounded-lg transition-colors"
                        >
                          + Adicionar imagem
                        </button>
                        {newInfillForm.image_urls.length === 0 && (
                          <p className="text-xs text-slate-400 italic">Nenhuma imagem adicionada.</p>
                        )}
                        <div className="space-y-2">
                          {newInfillForm.image_urls.map((url, imgIdx) => (
                            <div key={imgIdx} className="flex items-center gap-2">
                              <input
                                type="url"
                                value={url}
                                onChange={(e) => {
                                  const updated = [...newInfillForm.image_urls]
                                  updated[imgIdx] = e.target.value
                                  setNewInfillForm({ ...newInfillForm, image_urls: updated })
                                }}
                                className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                placeholder={`https://... (imagem ${imgIdx + 1})`}
                              />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = newInfillForm.image_urls.filter((_, i) => i !== imgIdx)
                                  setNewInfillForm({ ...newInfillForm, image_urls: updated })
                                }}
                                className="text-red-400 hover:text-red-600 font-bold text-lg leading-none px-1"
                                title="Remover imagem"
                              >✕</button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Notas */}
                      <div>
                        <FormFieldLabel label="Notas / Observações" />
                        <textarea
                          value={newInfillForm.notes}
                          onChange={(e) => setNewInfillForm({ ...newInfillForm, notes: e.target.value })}
                          className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                          placeholder="Observações de teste, condições especiais, etc..."
                        />
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => handleAddNewInfill(pattern)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          ✓ Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddNewInfill(null)
                          setNewInfillForm({ infill_pct: '', hu_mean: '', notes: '', sd_value: null, has_homogeneity_issues: false, image_urls: [] })
                            setError(null)
                          }}
                          className="px-4 py-2 bg-slate-300 text-foreground rounded-lg text-sm font-medium hover:bg-slate-400"
                        >
                          ✕ Cancelar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Painel de Resumo de Regressão por Padrão */}
              {(() => {
                const reg = patternRegression[pattern] || { a: null, b: null, manualA: false, manualB: false }
                const validCount = patternInfills.filter(i => i.hu_mean !== 0 && i.infill_pct > 0).length
                const hasRegression = reg.a !== null && reg.b !== null
                
                return (
                  <div className={`mt-2 p-4 rounded-lg border-2 ${
                    hasRegression
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-dashed border-border bg-background'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-sm font-bold text-indigo-900">📊 Regressão Linear — {pattern}</span>
                      {!hasRegression && (
                        <span className="text-xs text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-200">
                          {validCount < 2
                            ? `Aguardando ${2 - validCount} medição(ões) para calcular...`
                            : 'Dados insuficientes'}
                        </span>
                      )}
                      {hasRegression && (
                        <span className="text-xs text-indigo-600 font-mono bg-surface border border-indigo-200 px-2 py-0.5 rounded-full">
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
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${
                            reg.a !== null
                              ? (reg.manualA ? 'border-orange-300 bg-orange-50' : 'border-indigo-300 bg-indigo-50')
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
                          className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 ${
                            reg.b !== null
                              ? (reg.manualB ? 'border-orange-300 bg-orange-50' : 'border-indigo-300 bg-indigo-50')
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
      </div>

      {/* Resumo */}
      <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-4">
        <div className="text-sm">
          <p className="font-semibold text-indigo-900 mb-2">
            ✓ Resumo: {infillData.filter(i => i.hu_mean > 0).length}/{infillData.length} infill(s) com HU Mean preenchido
          </p>
          {isFormValid ? (
            <p className="text-primary font-medium">✅ Pronto para salvar!</p>
          ) : (
            <p className="text-amber-700">⚠️ Preencha HU Mean para todos os infills</p>
          )}
        </div>
      </div>

      {error && (
        <div className="flex gap-3 p-4 bg-red-50 border border-red-200 rounded-lg mt-6">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
    </div>
  )
})
