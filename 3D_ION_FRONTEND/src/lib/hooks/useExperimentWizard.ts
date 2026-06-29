/**
 * useExperimentWizard Hook
 * Manages experiment creation following Streamlit flow - faithful replication
 * 
 * FLOW (matching Streamlit novo_envio.py):
 * 1. Material + Machine (obrigatórios)
 * 2. Sample (obrigatório)
 * 3. Infill measurements - OBRIGATÓRIO (at least 1 technical data)
 * 4. Optional: Mechanical, Attenuation, Beam
 * 5. Finalize with validation
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import { Material, Machine, Sample } from '@/lib/api'
import { getNormalizedApiUrl } from '@/lib/api'
import { fetchWithAgent } from '@/lib/api-client'

const API_BASE_URL = getNormalizedApiUrl()

interface UseExperimentWizardReturn {
  // Current experiment state
  material: Material | null
  machine: Machine | null
  sample: Sample | null
  patternIds: string[]
  infillData: any[]
  mechanicalData: any | null
  attenuationData: any[]
  beamData: any | null

  // Flow control indicators
  canCreateSample: boolean
  canAddInfill: boolean
  canFinalize: boolean // True if sample + at least 1 infill present
  technicalDataCount: number
  
  // UI state
  isLoading: boolean
  error: string | null
  success: string | null

  // Actions - following Streamlit flow
  createMaterialAndMachine: (materialData: any, machineData: any) => Promise<{ material: Material; machine: Machine }>
  updateMaterialAndMachine: (materialData: any, machineData: any) => Promise<{ material: Material; machine: Machine }>
  createSample: (sampleData: any) => Promise<Sample>
  updateSample: (sampleData: any) => Promise<Sample>
  addInfill: (sampleId: string, measurements: any[]) => Promise<any>
  addMultipleInfills: (sampleId: string, measurements: any[]) => Promise<any>
  batchUpdateInfills: (sampleId: string, measurements: any[]) => Promise<any>
  addMechanical: (sampleId: string, data: any) => Promise<any>
  addAttenuation: (sampleId: string, measurements: any[]) => Promise<any>
  addBeam: (sampleId: string, data: any) => Promise<any>
  updateInfill: (infillId: string, measurementData: any) => Promise<any>
  updateMechanical: (sampleId: string, mechanicalData: any) => Promise<any>
  updateAttenuation: (attenuationId: string, attenuationData: any) => Promise<any>
  updateBeam: (sampleId: string, beamData: any) => Promise<any>
  finalizeExperiment: (sampleId: string) => Promise<any>
  editExperimentConsolidated: (experimentId: string) => Promise<any>
  
  // Local setters for edit mode (no API calls)
  setMaterialLocal: (material: Material) => void
  setMachineLocal: (machine: Machine) => void
  setSampleLocal: (sample: Sample) => void
  setInfillDataLocal: (data: any[]) => void
  setMechanicalDataLocal: (data: any) => void
  setAttenuationDataLocal: (data: any[]) => void
  setBeamDataLocal: (data: any) => void
  
  reset: () => void
  clearMessages: () => void
}

export function useExperimentWizard(): UseExperimentWizardReturn {
  // State - matching Streamlit session state structure
  const [material, setMaterial] = useState<Material | null>(null)
  const [machine, setMachine] = useState<Machine | null>(null)
  const [sample, setSample] = useState<Sample | null>(null)
  const [patternIds, setPatternIds] = useState<string[]>([]) // Armazenar padrões selecionados
  const [infillData, setInfillData] = useState<any[]>([])
  const [mechanicalData, setMechanicalData] = useState<any | null>(null)
  const [attenuationData, setAttenuationData] = useState<any[]>([])
  const [beamData, setBeamData] = useState<any | null>(null)
  
  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Computed state - matching Streamlit logic
  const canCreateSample = !!material && !!machine
  const canAddInfill = !!sample
  const technicalDataCount = infillData.length + (mechanicalData ? 1 : 0) + attenuationData.length + (beamData ? 1 : 0)
  const canFinalize = !!sample && infillData.length >= 1 // At least 1 infill required (RN-02)

  // Get auth token
  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') return null
    const user = localStorage.getItem('user')
    if (!user) return null
    try {
      const userData = JSON.parse(user)
      return userData.access_token
    } catch {
      return null
    }
  }, [])

  // Step 1: Create material and machine
  const createMaterialAndMachine = useCallback(
    async (materialData: any, machineData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/create-material-machine`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            material: materialData,
            machine: machineData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to create material and machine')
        }

        const data = await response.json()
        setMaterial(data.material)
        setMachine(data.machine)
        setSuccess('Material and Machine saved successfully!')
        
        return { material: data.material, machine: data.machine }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error creating material and machine'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Step 2: Create sample
  const createSample = useCallback(
    async (sampleData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        if (!material || !machine) {
          throw new Error('Material and Machine must be created first')
        }

        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/create-sample`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            material_id: material.id,
            machine_id: machine.id,
            ...sampleData  // ✨ IMPORTANTE: sampleData já contém pattern_ids do SampleForm
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to create sample')
        }

        const data = await response.json()
        setSample(data)
        // Armazenar padrões para uso no próximo step
        if (data.pattern_ids) {
          setPatternIds(data.pattern_ids)
        }
        setSuccess('Sample saved successfully!')
        
        return data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error creating sample'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [material, machine, getAuthToken]
  )

  // Step 3a: Add infill measurements (OBRIGATÓRIO)
  const addInfill = useCallback(
    async (sampleId: string, measurements: any[]) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // 🔑 IMPORTANTE: Validar que todos os infills têm hu_mean válido (> 0)
        // Filtrar e validar measurements
        const validationErrors: string[] = []
        const cleanedMeasurements = measurements
          .filter((m: any) => {
            if (!m.pattern_type || !String(m.pattern_type).trim()) {
              validationErrors.push(`❌ ${m.infill_pct}% - padrão não definido`)
              return false
            }
            return true
          })
          .map((m: any, idx: number) => {
            const hu_mean = m.hu_mean !== null && m.hu_mean !== undefined && m.hu_mean !== '' ? Number(m.hu_mean) : null
            const sd_value = m.sd_value ? Number(m.sd_value) : null
            
            // ✨ VALIDAÇÃO CRÍTICA: hu_mean deve ser um número > 0
            if (hu_mean === null || hu_mean === undefined || isNaN(hu_mean)) {
              validationErrors.push(`❌ ${m.pattern_type} ${m.infill_pct}% - HU Mean é obrigatório`)
              return null
            }
            
            if (hu_mean <= 0) {
              validationErrors.push(`❌ ${m.pattern_type} ${m.infill_pct}% - HU Mean deve ser > 0 (atual: ${hu_mean})`)
              return null
            }
            
            console.log('[addInfill] 🔍 Raw measurement:', {
              pattern_type: m.pattern_type,
              hu_mean_raw: m.hu_mean,
              hu_mean_parsed: hu_mean,
              valid: true
            })
            
            // Validar que valores estão dentro dos limites do banco
            if (Math.abs(hu_mean) > 999999999999.99) {
              console.error('[addInfill] ❌ HU Mean exceeds database limit:', hu_mean)
              validationErrors.push(`❌ ${m.pattern_type} ${m.infill_pct}% - HU Mean excede o limite máximo`)
              return null
            }
            
            if (hu_mean > 100000) {
              console.warn('[addInfill] ⚠️ HU Mean is unusually large:', hu_mean, '(typical range is 500-3000)')
            }
            
            if (sd_value && Math.abs(sd_value) > 99999999.99) {
              console.error('[addInfill] ❌ SD Value exceeds database limit:', sd_value)
              validationErrors.push(`❌ ${m.pattern_type} ${m.infill_pct}% - SD Value excede o limite máximo`)
              return null
            }
            
            return {
              pattern_type: m.pattern_type,
              pattern_type_id: m.pattern_type_id,
              infill_pct: Number(m.infill_pct),
              hu_mean: hu_mean,
              notes: m.notes || null,
              sd_value: sd_value,
              has_homogeneity_issues: m.has_homogeneity_issues ?? false,
            }
          })
          .filter(m => m !== null)

        // Se há erros de validação, mostrar e parar
        if (validationErrors.length > 0) {
          const errorMessage = `Não é possível salvar. Verifique os seguintes infills:\n${validationErrors.join('\n')}`
          console.error('[addInfill] ❌ Validation errors:', validationErrors)
          throw new Error(errorMessage)
        }

        if (cleanedMeasurements.length === 0) {
          throw new Error('Nenhum infill válido para salvar. Verifique se todos têm HU Mean preenchido.')
        }

        console.log('[addInfill] 📋 Cleaned measurements being sent:', cleanedMeasurements)

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/add-infill`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sample_id: sampleId,
            measurements: cleanedMeasurements
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to add infill data')
        }

        const result = await response.json()
        setInfillData(prev => [...prev, ...result.data])
        setSuccess(`Infill measurements added successfully!`)
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error adding infill data'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Step 3b: Add Multiple Infills (when sample has multiple patterns)
  const addMultipleInfills = useCallback(
    async (sampleId: string, measurements: any[]) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // 🔑 IMPORTANTE: Sanitizar e filtrar apenas os campos que devem ir para infill_measurements
        // Garantir que valores numéricos estão dentro dos limites NUMERIC(10,2)
        // ✨ NOVO: Filtrar measurements com pattern_type = null ou vazio
        const cleanedMeasurements = measurements
          .filter((m: any) => m.pattern_type && String(m.pattern_type).trim() !== '')
          .map((m: any) => {
          const hu_mean = m.hu_mean ? Number(m.hu_mean) : null
          const sd_value = m.sd_value ? Number(m.sd_value) : null
          const has_homogeneity_issues = m.has_homogeneity_issues ?? false
          
          console.log('[addMultipleInfills] 🔍 Raw measurement:', {
            pattern_type: m.pattern_type,
            infill_pct: m.infill_pct,
            hu_mean_raw: m.hu_mean,
            hu_mean_parsed: hu_mean
          })
          
          // Validar que valores estão dentro do limite NUMERIC(10,2) = max 99999999.99
          // Valores típicos: HU Mean 500-3000, SD Value 1-100
          
          if (hu_mean && Math.abs(hu_mean) > 99999999.99) {
            console.error('[addMultipleInfills] ❌ HU Mean exceeds database limit:', hu_mean)
            throw new Error(`Invalid HU Mean for ${m.pattern_type} ${m.infill_pct}%: ${hu_mean}. Maximum allowed is 99,999,999.99`)
          }
          
          if (hu_mean && Math.abs(hu_mean) > 100000) {
            console.warn('[addMultipleInfills] ⚠️ HU Mean is unusually large:', hu_mean, 'for', m.pattern_type, '(typical range is 500-3000)')
          }
          
          if (sd_value && Math.abs(sd_value) > 99999999.99) {
            console.error('[addMultipleInfills] ❌ SD Value exceeds database limit:', sd_value)
            throw new Error(`Invalid SD Value for ${m.pattern_type} ${m.infill_pct}%: ${sd_value}. Maximum allowed is 99,999,999.99`)
          }
          
          return {
            pattern_type: m.pattern_type,
            pattern_type_id: m.pattern_type_id,
            infill_pct: Number(m.infill_pct),
            hu_mean: hu_mean,
            notes: m.notes ? String(m.notes) : null,
            sd_value: sd_value,
            has_homogeneity_issues: has_homogeneity_issues,
          }
        }).filter(m => m !== null)

        console.log('[addMultipleInfills] 📋 Cleaned measurements being sent:', {
          count: cleanedMeasurements.length,
          items: cleanedMeasurements
        })

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/add-multiple-infills`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sample_id: sampleId,
            measurements: cleanedMeasurements
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to add infill measurements')
        }

        const result = await response.json()
        // Replace infillData – merge new rows with existing, avoiding duplicates
        setInfillData(prev => {
          const existingIds = new Set(prev.map((r: any) => r.id))
          const brandNew = (result.data || []).filter((r: any) => !existingIds.has(r.id))
          return [...prev, ...brandNew]
        })
        setSuccess(`${result.count} infill measurements saved successfully!`)
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error saving infill measurements'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Step 3b-UPDATE: Batch update existing infill rows (rows that already have id)
  const batchUpdateInfills = useCallback(
    async (sampleId: string, measurements: any[]) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // Sanitizar e validar valores
        const payload = measurements.map((m: any) => {
          const hu_mean = m.hu_mean ? Number(m.hu_mean) : null
          const sd_value = m.sd_value ? Number(m.sd_value) : null
          const has_homogeneity_issues = m.has_homogeneity_issues ?? false
          
          console.log('[batchUpdateInfills] 🔍 Raw measurement update:', {
            id: m.id,
            hu_mean_raw: m.hu_mean,
            hu_mean_parsed: hu_mean
          })
          
          // Validar que valores estão dentro do limite NUMERIC(10,2) = max 99999999.99
          if (hu_mean && Math.abs(hu_mean) > 99999999.99) {
            console.error('[batchUpdateInfills] ❌ HU Mean exceeds database limit:', hu_mean)
            throw new Error(`Invalid HU Mean: ${hu_mean}. Maximum allowed is 99,999,999.99`)
          }
          
          if (hu_mean && Math.abs(hu_mean) > 100000) {
            console.warn('[batchUpdateInfills] ⚠️ HU Mean is unusually large:', hu_mean, '(typical range is 500-3000)')
          }
          
          if (sd_value && Math.abs(sd_value) > 99999999.99) {
            console.error('[batchUpdateInfills] ❌ SD Value exceeds database limit:', sd_value)
            throw new Error(`Invalid SD Value: ${sd_value}. Maximum allowed is 99,999,999.99`)
          }
          
          const infill_pct =
            m.infill_pct != null && m.infill_pct !== ''
              ? Number(m.infill_pct)
              : m.infill_percentage != null && m.infill_percentage !== ''
                ? Number(m.infill_percentage)
                : null

          return {
            id: m.id,
            infill_pct,
            pattern_type: m.pattern_type ?? null,
            hu_mean: hu_mean,
            sd_value: sd_value,
            has_homogeneity_issues: has_homogeneity_issues,
            notes: m.notes ? String(m.notes) : null,
            image_url: Array.isArray(m.image_urls) ? (m.image_urls[0] ?? null) : (m.image_url ?? null),
          }
        })

        console.log('[batchUpdateInfills] 📋 Sanitized measurements being sent:', {
          count: payload.length,
          items: payload
        })

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/${sampleId}/update-infills`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ measurements: payload })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update infill measurements')
        }

        const result = await response.json()
        // Update infillData state – replace updated rows by id
        setInfillData(prev => {
          const updatedMap = new Map((result.data || []).map((r: any) => [r.id, r]))
          return prev.map((r: any) => updatedMap.get(r.id) || r)
        })
        setSuccess(`${result.updated} infill measurements updated!`)

        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error updating infill measurements'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Step 3c: Add Mechanical Properties (Optional)
  const addMechanical = useCallback(
    async (sampleId: string, data: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/add-mechanical`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sample_id: sampleId,
            ...data
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to add mechanical properties')
        }

        const result = await response.json()
        console.log('Mechanical data response:', result)
        
        // Garante que os dados sejam setados mesmo se a estrutura for diferente
        if (result.data) {
          setMechanicalData(result.data)
        } else if (Array.isArray(result)) {
          setMechanicalData(result[0])
        } else {
          setMechanicalData(result)
        }
        
        setSuccess('Mechanical properties added successfully!')
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error adding mechanical properties'
        console.error('Error adding mechanical properties:', err)
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Step 3d: Add Linear Attenuation (Optional)
  const addAttenuation = useCallback(
    async (sampleId: string, payload: any[] | Record<string, unknown>) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const body = Array.isArray(payload)
          ? { sample_id: sampleId, measurements: payload }
          : { sample_id: sampleId, ...payload }

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/add-attenuation`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to add attenuation data')
        }

        const result = await response.json()
        const added = Array.isArray(result.data) ? result.data : [result.data]
        setAttenuationData((prev) => [...prev, ...added])
        setSuccess(`Attenuation measurements added successfully!`)
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error adding attenuation data'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Step 3e: Add Beam Quality (Optional)
  const addBeam = useCallback(
    async (sampleId: string, data: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/add-beam`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sample_id: sampleId,
            ...data
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to add beam quality')
        }

        const result = await response.json()
        console.log('Beam data response:', result)
        
        // Garante que os dados sejam setados mesmo se a estrutura for diferente
        if (result.data) {
          setBeamData(result.data)
        } else if (Array.isArray(result)) {
          setBeamData(result[0])
        } else {
          setBeamData(result)
        }
        
        setSuccess('Beam quality data added successfully!')
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error adding beam quality'
        console.error('Error adding beam quality:', err)
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Step 4: Finalize experiment with validation
  const finalizeExperiment = useCallback(
    async (sampleId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // Pre-validation (client-side)
        if (infillData.length === 0) {
          throw new Error('At least one infill measurement is required to finalize')
        }

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/${sampleId}/finalize`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to finalize experiment')
        }

        const result = await response.json()
        setSuccess('Experiment finalized successfully! 🎉')
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error finalizing experiment'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken, infillData]
  )

  // Update material and machine (for editing)
  const updateMaterialAndMachine = useCallback(
    async (materialData: any, machineData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // If material or machine don't have IDs, create them instead
        if (!material?.id || !machine?.id) {
          return createMaterialAndMachine(materialData, machineData)
        }

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/update-material-machine`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            material_id: material.id,
            material: materialData,
            machine_id: machine.id,
            machine: machineData
          })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update material and machine')
        }

        const data = await response.json()
        // Now data has structure: { success, message, data: { material, machine } }
        setMaterial(data.data.material)
        setMachine(data.data.machine)
        setSuccess('Material and Machine updated successfully!')
        
        return { material: data.data.material, machine: data.data.machine }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error updating material and machine'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [material, machine, getAuthToken, createMaterialAndMachine]
  )

  // Update sample (for editing)
  const updateSample = useCallback(
    async (sampleData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        if (!sample?.id) {
          throw new Error('Sample ID is required for update')
        }

        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/update-sample/${sample.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(sampleData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update sample')
        }

        const data = await response.json()
        // Agora data tem a estrutura: { success, message, data: {...} }
        setSample(data.data)

        // Atualizar patternIds a partir dos dados enviados ou da resposta
        if (sampleData.pattern_ids && Array.isArray(sampleData.pattern_ids)) {
          setPatternIds(sampleData.pattern_ids)
        } else if (data.data?.pattern_type) {
          try {
            const parsed = JSON.parse(data.data.pattern_type)
            if (Array.isArray(parsed)) setPatternIds(parsed)
          } catch { /* ignore parse error */ }
        }

        setSuccess('Sample updated successfully!')
        
        return data.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error updating sample'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [sample, getAuthToken]
  )

  // Update infill measurement (for editing)
  const updateInfill = useCallback(
    async (infillId: string, measurementData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // Adicionar campos manual_a e manual_b se não estiverem presentes
        const payload = {
          ...measurementData,
          manual_a: measurementData.manual_a ?? false,
          manual_b: measurementData.manual_b ?? false,
        }

        console.log('[updateInfill] Enviando para backend:', {
          infillId,
          url: `${API_BASE_URL}/experiments/update-infill/${infillId}`,
          payload_keys: Object.keys(payload),
          dimension_a: payload.dimension_a,
          dimension_b: payload.dimension_b,
          manual_a: payload.manual_a,
          manual_b: payload.manual_b,
        })

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/update-infill/${infillId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        console.log('[updateInfill] Response status:', response.status)

        if (!response.ok) {
          const errorData = await response.json()
          console.error('[updateInfill] ❌ Error response:', errorData)
          throw new Error(errorData.detail || 'Failed to update infill measurement')
        }

        const data = await response.json()
        console.log('[updateInfill] ✅ Success:', data)
        
        // Atualiza o estado do hook com os dados atualizados
        setInfillData(prev => {
          const updated = [...prev]
          const index = updated.findIndex(item => item.id === infillId)
          if (index >= 0) {
            updated[index] = data.data
          }
          return updated
        })
        setSuccess('Infill measurement updated successfully!')
        
        return data.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error updating infill'
        console.error('[updateInfill] ❌ Exception:', message, err)
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Update mechanical properties (for editing)
  const updateMechanical = useCallback(
    async (sampleId: string, mechanicalData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/update-mechanical/${sampleId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(mechanicalData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update mechanical properties')
        }

        const result = await response.json()
        console.log('Mechanical data response:', result)
        
        // Handle different response structures
        if (result.data) {
          setMechanicalData(result.data)
        } else if (Array.isArray(result)) {
          setMechanicalData(result[0])
        } else {
          setMechanicalData(result)
        }
        
        setSuccess('Mechanical properties updated successfully!')
        
        return result.data || (Array.isArray(result) ? result[0] : result)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error updating mechanical properties'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Update attenuation (for editing)
  const updateAttenuation = useCallback(
    async (attenuationId: string, attenuationData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/update-attenuation/${attenuationId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(attenuationData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update attenuation measurement')
        }

        const data = await response.json()
        // Atualiza o estado do hook com os dados atualizados
        setAttenuationData(prev => {
          const updated = [...prev]
          const index = updated.findIndex(item => item.id === attenuationId)
          if (index >= 0) {
            updated[index] = data.data
          }
          return updated
        })
        setSuccess('Attenuation measurement updated successfully!')
        
        return data.data
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error updating attenuation'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Update beam quality (for editing)
  const updateBeam = useCallback(
    async (sampleId: string, beamData: any) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/update-beam/${sampleId}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(beamData)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to update beam quality')
        }

        const result = await response.json()
        console.log('Beam data response:', result)
        
        // Handle different response structures
        if (result.data) {
          setBeamData(result.data)
        } else if (Array.isArray(result)) {
          setBeamData(result[0])
        } else {
          setBeamData(result)
        }
        
        setSuccess('Beam quality data updated successfully!')
        
        return result.data || (Array.isArray(result) ? result[0] : result)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error updating beam quality'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [getAuthToken]
  )

  // Reset all state (for new experiment)
  const reset = useCallback(() => {
    setMaterial(null)
    setMachine(null)
    setSample(null)
    setInfillData([])
    setMechanicalData(null)
    setAttenuationData([])
    setBeamData(null)
    setError(null)
    setSuccess(null)
  }, [])

  // Clear messages
  const clearMessages = useCallback(() => {
    setError(null)
    setSuccess(null)
  }, [])

  // Local setters for edit mode (no API calls)
  const setMaterialLocal = useCallback((material: Material) => {
    setMaterial(material)
  }, [])

  const setMachineLocal = useCallback((machine: Machine) => {
    setMachine(machine)
  }, [])

  const setSampleLocal = useCallback((sample: Sample) => {
    setSample(sample)
    // Restaurar patternIds a partir do sample carregado
    if ((sample as any).pattern_ids && Array.isArray((sample as any).pattern_ids)) {
      setPatternIds((sample as any).pattern_ids)
    } else if (sample.pattern_type) {
      try {
        const parsed = JSON.parse(sample.pattern_type)
        if (Array.isArray(parsed)) setPatternIds(parsed)
      } catch { /* ignore */ }
    }
  }, [])

  const setInfillDataLocal = useCallback((data: any[]) => {
    setInfillData(data)
  }, [])

  const setMechanicalDataLocal = useCallback((data: any) => {
    setMechanicalData(data)
  }, [])

  const setAttenuationDataLocal = useCallback((data: any[]) => {
    setAttenuationData(data)
  }, [])

  const setBeamDataLocal = useCallback((data: any) => {
    setBeamData(data)
  }, [])

  // Edit experiment - consolidated endpoint for updating all experiment data at once
  const editExperimentConsolidated = useCallback(
    async (experimentId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // Build payload with all current data
        const payload = {
          sample: sample ? {
            shape_type: sample.shape_type,
            shape_dimension: sample.shape_dimension,
            circle_roi_area: sample.circle_roi_area,
          } : undefined,
          infill_measurements: infillData.length > 0 ? infillData : undefined,
          mechanical_properties: mechanicalData || undefined,
          linear_attenuation: attenuationData.length > 0 ? attenuationData : undefined,
          beam_qualities: beamData || undefined,
        }

        const response = await fetchWithAgent(`${API_BASE_URL}/experiments/${experimentId}/edit`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.detail || 'Failed to edit experiment')
        }

        const result = await response.json()
        setSuccess('Experiment updated successfully! ✅')
        
        return result
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error editing experiment'
        setError(message)
        throw err
      } finally {
        setIsLoading(false)
      }
    },
    [sample, infillData, mechanicalData, attenuationData, beamData, getAuthToken]
  )

  // Auto clear messages after timeout
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [success])

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  return {
    // State
    material,
    machine,
    sample,
    patternIds,
    infillData,
    mechanicalData,
    attenuationData,
    beamData,

    // Flow control
    canCreateSample,
    canAddInfill,
    canFinalize,
    technicalDataCount,
    isLoading,
    error,
    success,

    // Actions
    createMaterialAndMachine,
    updateMaterialAndMachine,
    createSample,
    updateSample,
    addInfill,
    addMultipleInfills,
    batchUpdateInfills,
    addMechanical,
    addAttenuation,
    addBeam,
    updateInfill,
    updateMechanical,
    updateAttenuation,
    updateBeam,
    finalizeExperiment,
    editExperimentConsolidated,
    
    // Local setters (for edit mode)
    setMaterialLocal,
    setMachineLocal,
    setSampleLocal,
    setInfillDataLocal,
    setMechanicalDataLocal,
    setAttenuationDataLocal,
    setBeamDataLocal,
    
    reset,
    clearMessages
  }
}
