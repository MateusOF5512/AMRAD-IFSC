/**
 * useExperimentEdit Hook
 * INDEPENDENTE de useExperimentWizard
 * Focado APENAS em edição de experimentos existentes
 * 
 * NÃO compartilha lógica com novo cadastro
 * Mudanças aqui NÃO afetam a criação novo
 */

'use client'

import { useState, useCallback } from 'react'
import { Material, Machine, Sample } from '@/lib/api'
import { getNormalizedApiUrl } from '@/lib/api'

const API_BASE_URL = getNormalizedApiUrl()

interface UseExperimentEditReturn {
  // Current data state
  material: Material | null
  machine: Machine | null
  sample: Sample | null
  infillData: any[]
  mechanicalData: any | null
  attenuationData: any[]
  beamData: any | null

  // UI state
  isLoading: boolean
  error: string | null
  success: string | null

  // Actions
  editExperimentConsolidated: (experimentId: string) => Promise<any>
  
  // Local setters (no API calls, just state updates)
  setMaterialLocal: (material: Material) => void
  setMachineLocal: (machine: Machine) => void
  setSampleLocal: (sample: Sample) => void
  setInfillDataLocal: (data: any[]) => void
  setMechanicalDataLocal: (data: any) => void
  setAttenuationDataLocal: (data: any[]) => void
  setBeamDataLocal: (data: any) => void
}

export function useExperimentEdit(): UseExperimentEditReturn {
  // State
  const [material, setMaterial] = useState<Material | null>(null)
  const [machine, setMachine] = useState<Machine | null>(null)
  const [sample, setSample] = useState<Sample | null>(null)
  const [infillData, setInfillData] = useState<any[]>([])
  const [mechanicalData, setMechanicalData] = useState<any | null>(null)
  const [attenuationData, setAttenuationData] = useState<any[]>([])
  const [beamData, setBeamData] = useState<any | null>(null)

  // UI state
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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

  // Edit experiment - consolidated endpoint
  const editExperimentConsolidated = useCallback(
    async (experimentId: string) => {
      setIsLoading(true)
      setError(null)
      try {
        const token = getAuthToken()
        if (!token) throw new Error('Not authenticated')

        // Filter infill_measurements to only include valid entries
        const validInfills = infillData.filter(item =>
          item.infill_pct !== null &&
          item.infill_pct !== undefined &&
          item.hu_mean !== null &&
          item.hu_mean !== undefined
        )

        // Filter linear_attenuation to only include valid entries
        const validAttenuations = attenuationData.filter(item =>
          item.thickness !== null &&
          item.thickness !== undefined &&
          item.value_lambert_beer !== null &&
          item.value_lambert_beer !== undefined
        )

        // Build payload with all current data
        const payload = {
          sample: sample ? {
            shape_type: sample.shape_type,
            shape_dimension: sample.shape_dimension,
            circle_roi_area: sample.circle_roi_area,
          } : undefined,
          infill_measurements: validInfills.length > 0 ? validInfills : undefined,
          mechanical_properties: mechanicalData || undefined,
          linear_attenuation: validAttenuations.length > 0 ? validAttenuations : undefined,
          beam_qualities: beamData || undefined,
        }

        const response = await fetch(`${API_BASE_URL}/experiments/${experimentId}/edit`, {
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
        setSuccess('Alterações salvas com sucesso! ✅')
        
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

  // Local setters - apenas atualizam estado, sem chamadas API
  const setMaterialLocal = useCallback((mat: Material) => {
    setMaterial(mat)
  }, [])

  const setMachineLocal = useCallback((mach: Machine) => {
    setMachine(mach)
  }, [])

  const setSampleLocal = useCallback((samp: Sample) => {
    setSample(samp)
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

  return {
    // State
    material,
    machine,
    sample,
    infillData,
    mechanicalData,
    attenuationData,
    beamData,

    // UI state
    isLoading,
    error,
    success,

    // Actions
    editExperimentConsolidated,
    
    // Local setters
    setMaterialLocal,
    setMachineLocal,
    setSampleLocal,
    setInfillDataLocal,
    setMechanicalDataLocal,
    setAttenuationDataLocal,
    setBeamDataLocal,
  }
}
