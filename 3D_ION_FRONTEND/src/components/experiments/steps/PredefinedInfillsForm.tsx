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

  // DEBUG: Log props at mounting
  useEffect(() => {
    console.log('[PredefinedInfillsForm] Recebeu props:', {
      selectedInfillsLength: selectedInfills?.length,
      selectedInfills,
      initialMeasurementsLength: initialMeasurements?.length,
      initialMeasurements,
      initialRegressionA,
      initialRegressionB
    })
  }, [selectedInfills, initialMeasurements])

  // Estado de regressão por padrão: { a, b, manualA, manualB }
  const [patternRegression, setPatternRegression] = useState<Record<string, {
    a: number | null
    b: number | null
    manualA: boolean
    manualB: boolean
  }>>({})

  // Inicializar dados quando infills selecionados mudam
  useEffect(() => {
    console.log('[PredefinedInfillsForm] useEffect: Atualizando infillData', {
      selectedInfillsLength: selectedInfills.length,
      initialMeasurementsLength: initialMeasurements?.length,
      selectedInfills: selectedInfills.map(s => `${s.pattern_type} ${s.infill_pct}%`),
      initialMeasurements: initialMeasurements?.map(m => ({
        id: m.id,
        pattern_type: m.pattern_type,
        infill_pct: m.infill_pct,
        hu_mean: m.hu_mean
      }))
    })
    
    // 🔑 CASO ESPECIAL: Se selectedInfills está vazio mas temos initialMeasurements (modo edição)
    // Usar os dados do banco DIRETAMENTE como source of truth
    if (selectedInfills.length === 0 && initialMeasurements && initialMeasurements.length > 0) {
      console.log('[PredefinedInfillsForm] ✨ MODO EDIÇÃO: usando initialMeasurements diretamente')
      const newData = initialMeasurements.map((m: any) => {
        console.log('[PredefinedInfillsForm] 📥 Processando medição do banco:', {
          pattern_type: m.pattern_type,
          infill_pct: m.infill_pct,
          hu_mean_bruto: m.hu_mean,
          hu_mean_tipo: typeof m.hu_mean,
          hu_mean_valor_final: m.hu_mean ?? 0,
          has_homogeneity_issues: normalizeHomogeneityIssues(m)
        })
        return {
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
        }
      })
      console.log('[PredefinedInfillsForm] ✅ Dados carregados do banco (FINAL):', {
        length: newData.length,
        items: newData.map(item => ({
          pattern_type: item.pattern_type,
          infill_pct: item.infill_pct,
          hu_mean: item.hu_mean,
          hu_mean_tipoFinal: typeof item.hu_mean,
          hasId: item.id ? `✅ ${item.id.substring(0,8)}...` : '❌'
        }))
      })
      setInfillData(newData)
      setExpandedIndex(null)
      return
    }
    
    // CASO NORMAL: selectedInfills tem dados, fazer match com initialMeasurements
    const newData = selectedInfills.map((sel, idx) => {
      console.log(`[PredefinedInfillsForm] Processando selectedInfill ${idx}:`, {
        padraoAtual: `${sel.pattern_type} ${sel.infill_pct}%`,
        procurando: `pattern_type=${sel.pattern_type} AND infill_pct=${sel.infill_pct}`
      })
      
      // Procura dado existente que bata com o padrão e porcentagem
      const existing = initialMeasurements?.find(m => {
        const matches = m.pattern_type === sel.pattern_type && Number(m.infill_pct) === sel.infill_pct
        if (!matches) {
          console.log(`[PredefinedInfillsForm]   ❌ Não é match:`, {
            fromBank: {pattern_type: m.pattern_type, infill_pct: Number(m.infill_pct), hu_mean: m.hu_mean},
            selected: {pattern_type: sel.pattern_type, infill_pct: sel.infill_pct},
            patternMatch: m.pattern_type === sel.pattern_type,
            pctMatch: Number(m.infill_pct) === sel.infill_pct
          })
        }
        return matches
      })
      
      if (existing) {
        console.log(`[PredefinedInfillsForm]   ✅ MATCH ENCONTRADO:`, {
          padraoSelecionado: `${sel.pattern_type} ${sel.infill_pct}%`,
          existingId: existing.id,
          hu_mean: existing.hu_mean,
          sd_value: existing.sd_value,
          notes: existing.notes
        })
      } else {
        console.log(`[PredefinedInfillsForm]   ⚠️ Nenhum match encontrado para ${sel.pattern_type} ${sel.infill_pct}%`)
      }
      
      return {
        id: existing?.id ?? undefined,           // preservar UUID para UPDATE no banco
        pattern_type: sel.pattern_type,
        infill_pct: sel.infill_pct,
        hu_mean: existing?.hu_mean ?? 0,
        notes: existing?.notes ?? null,
        sd_value: existing?.sd_value ?? null,
        has_homogeneity_issues: normalizeHomogeneityIssues(existing),
        // Converte image_url (string do banco) → image_urls (array da UI)
        image_urls: existing?.image_urls ?? (existing?.image_url ? [existing.image_url] : []),
        dimension_a: existing?.dimension_a ?? null,
        dimension_b: existing?.dimension_b ?? null,
      }
    })
    
    console.log('[PredefinedInfillsForm] newData após mapping FINAL:', {
      length: newData.length,
      items: newData.map(item => ({
        id: item.id,
        pattern_type: item.pattern_type,
        infill_pct: item.infill_pct,
        hu_mean: item.hu_mean,
        hasData: !!item.id
      }))
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
      .filter(item => item.pattern_type && item.pattern_type.trim() !== '')  // ✨ FILTRAR NULLS
      .map(item => {
        const result = {
          ...item,
          dimension_a: patternRegression[item.pattern_type]?.a ?? null,
          dimension_b: patternRegression[item.pattern_type]?.b ?? null,
        }
        console.log('[PredefinedInfillsForm] 📤 Item sendo emitido:', {
          pattern_type: result.pattern_type,
          infill_pct: result.infill_pct,
          hu_mean: result.hu_mean,
          hu_mean_tipo: typeof result.hu_mean,
          id: result.id ? `✅` : '❌'
        })
        return result
      })
    console.log('[PredefinedInfillsForm] 🚀 useEffect emissão: Enviando dados via onDataChange:', {
      length: merged.length,
      comDados: merged.map(item => ({
        id: item.id,
        pattern_type: item.pattern_type,
        infill_pct: item.infill_pct,
        hu_mean: item.hu_mean,
        hasId: !!item.id ? '✅' : '❌'
      }))
    })
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
    console.log(`[updatePatternField] Pattern="${pattern}", field="${field}", value="${value}", isManual=${isManual}, parsed=${parsed}`)
    setPatternRegression(prev => {
      const updated = {
        ...prev,
        [pattern]: {
          ...prev[pattern],
          [field]: (parsed !== null && isNaN(parsed)) ? null : parsed,
          ...(field === 'a' ? { manualA: isManual } : { manualB: isManual }),
        },
      }
      console.log(`[updatePatternField] Updated state for "${pattern}":`, updated[pattern])
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
    console.log('[useEffect] Recalculating regression for patterns:', patterns)
    setPatternRegression(prev => {
      const updated = { ...prev }
      patterns.forEach(pattern => {
        const patternItems = infillData.filter(d => d.pattern_type === pattern)
        const regression = calculateRegression(patternItems)
        const current = prev[pattern] || { a: null, b: null, manualA: false, manualB: false }
        
        // IMPORTANTE: Se está em Manual, NUNCA sobrescreva com cálculo automático
        const newA = current.manualA ? current.a : (regression?.a ?? null)
        const newB = current.manualB ? current.b : (regression?.b ?? null)
        
        if (current.manualA && regression && regression.a !== null && newA !== current.a) {
          console.warn(`[useEffect] ⚠️ Pattern "${pattern}" tem manualA=true mas A seria ${regression.a}. Preservando manual: ${current.a}`)
        }
        if (current.manualB && regression && regression.b !== null && newB !== current.b) {
          console.warn(`[useEffect] ⚠️ Pattern "${pattern}" tem manualB=true mas B seria ${regression.b}. Preservando manual: ${current.b}`)
        }
        
        updated[pattern] = {
          a: newA,
          b: newB,
          manualA: current.manualA,  // ✨ CRÍTICO: nunca mude o flag de manual!
          manualB: current.manualB,  // ✨ CRÍTICO: nunca mude o flag de manual!
        }
        console.log(`[useEffect] Pattern "${pattern}": a=${newA}(manual=${current.manualA}), b=${newB}(manual=${current.manualB})`)
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
                  ? 'border-l-green-500 bg-green-50'
                  : 'border-l-blue-500 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">📋 {pattern}</h3>
                    <p className="text-xs text-gray-600 mt-1">💡 Preencha HU Mean para gerar automaticamente A e B</p>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">
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
                          ? 'border-green-300 bg-green-50'
                          : 'border-gray-300 bg-gray-50'
                      }`}
                    >
                      {/* Header do Card */}
                      <button
                        onClick={() => setExpandedIndex(expandedIndex === globalIdx ? null : globalIdx)}
                        className={`w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-80 transition-colors ${
                          isMinimallyFilled ? 'bg-green-100' : 'bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center gap-4 flex-1 text-left">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 mb-1">
                              {infill.infill_pct}% Infill
                            </h4>
                            <p className="text-sm text-gray-600">
                              HU Mean: {infill.hu_mean > 0 ? infill.hu_mean : '—'}{infill.notes ? ` · Notas` : ''}
                            </p>
                          </div>

                          {isMinimallyFilled && (
                            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                          )}
                        </div>

                        {isExpanded ? (
                          <ChevronUp className="w-5 h-5 text-gray-600" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-600" />
                        )}
                      </button>

              {/* Conteúdo Expandido */}
                      {isExpanded && (
                        <div className="px-6 py-4 border-t border-gray-200 bg-white space-y-6">
                          {/* Linha 1: HU Mean */}
                          <div className="grid grid-cols-1 gap-4">
                            <div>
                              <FormFieldLabel label="HU Mean" required />
                              <input
                                type="number"
                                step="0.01"
                                value={infill.hu_mean ?? ''}
                                onChange={(e) => updateField(globalIdx, 'hu_mean', e.target.value)}
                                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                                  infill.hu_mean > 0 ? 'border-green-300 bg-green-50' : 'border-gray-300'
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
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                    className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 cursor-pointer"
                                  />
                                  <span className="text-sm font-medium text-gray-700">
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
                              className="w-full mt-1 mb-3 flex items-center justify-center gap-1 text-sm font-semibold text-green-700 bg-green-50 hover:bg-green-100 border-2 border-dashed border-green-400 px-3 py-2 rounded-lg transition-colors"
                            >
                              + Adicionar imagem
                            </button>
                            {infill.image_urls.length === 0 && (
                              <p className="text-xs text-gray-400 italic">Nenhuma imagem adicionada.</p>
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
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                      : 'border-gray-300 bg-gray-50'
                  }`}
                >
                  {/* Header do Card */}
                  <button
                    onClick={() => setShowAddNewInfill(showAddNewInfill === pattern ? null : pattern)}
                    className={`w-full px-6 py-4 flex items-center justify-between hover:bg-opacity-80 transition-colors ${
                      showAddNewInfill === pattern ? 'bg-blue-100' : 'bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1 text-left">
                      <div className="flex-1">
                        <h4 className="font-bold text-gray-900 mb-1">
                          ➕ Adicionar Novo Infill Customizado
                        </h4>
                        <p className="text-sm text-gray-600">
                          Preencha os dados para criar um infill personalizado
                        </p>
                      </div>
                    </div>

                    {showAddNewInfill === pattern ? (
                      <ChevronUp className="w-5 h-5 text-gray-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-600" />
                    )}
                  </button>

                  {/* Conteúdo Expandido */}
                  {showAddNewInfill === pattern && (
                    <div className="px-6 py-4 border-t border-gray-200 bg-white space-y-6">
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                                className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 cursor-pointer"
                              />
                              <span className="text-sm font-medium text-gray-700">
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
                          <p className="text-xs text-gray-400 italic">Nenhuma imagem adicionada.</p>
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
                                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                          className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-400"
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
                
                console.log(`[Regression Render] Pattern="${pattern}": a=${reg.a}, b=${reg.b}, manualA=${reg.manualA}, manualB=${reg.manualB}, hasRegression=${hasRegression}`)
                
                return (
                  <div className={`mt-2 p-4 rounded-lg border-2 ${
                    hasRegression
                      ? 'border-indigo-300 bg-indigo-50'
                      : 'border-dashed border-gray-300 bg-gray-50'
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
                        <span className="text-xs text-indigo-600 font-mono bg-white border border-indigo-200 px-2 py-0.5 rounded-full">
                          HU = {Number(reg.a).toFixed(4)} × % + ({Number(reg.b).toFixed(4)})
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {/* Termo A */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-700">Termo A (Angular)</label>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              reg.manualA ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {reg.manualA ? '✏️ Manual' : '⚡ Auto'}
                            </span>
                            {reg.manualA && (
                              <button
                                type="button"
                                onClick={() => resetPatternField(pattern, 'a')}
                                className="text-xs text-gray-400 hover:text-red-500 ml-1 font-bold"
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
                              : 'border-dashed border-gray-300 bg-white'
                          }`}
                          placeholder="Aguardando 2ª medição..."
                        />
                      </div>
                      {/* Termo B */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-gray-700">Termo B (Linear)</label>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                              reg.manualB ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'
                            }`}>
                              {reg.manualB ? '✏️ Manual' : '⚡ Auto'}
                            </span>
                            {reg.manualB && (
                              <button
                                type="button"
                                onClick={() => resetPatternField(pattern, 'b')}
                                className="text-xs text-gray-400 hover:text-red-500 ml-1 font-bold"
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
                              : 'border-dashed border-gray-300 bg-white'
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
            <p className="text-green-700 font-medium">✅ Pronto para salvar!</p>
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
