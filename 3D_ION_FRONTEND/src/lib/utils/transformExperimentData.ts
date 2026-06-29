/**
 * Transforma dados brutos da API em formato estruturado para edição
 * Reutilizado em:
 * - /experiments/edit/[id]/page.tsx
 * - ExperimentReportModal.tsx
 */

export interface EditExperimentData {
  material: any
  machine: any
  sample: any
  infill_data: any[]
  mechanical_data: any | null
  attenuation_data: any[]
  beam_data: any | null
}

export function transformApiDataToEditFormat(data: any): EditExperimentData {
  console.log('[transformApiDataToEditFormat] Input data:', {
    hasInfillMeasurements: !!data.infill_measurements,
    infillMeasurementsLength: data.infill_measurements?.length,
    materialId: data.material_id,
    machineId: data.machine_id,
    experimentId: data.experiment_id,
  })

  // Transform backend response - ExperimentDetailResponse format
  const material = data.material_id ? {
    id: data.material_id,
    brand: data.material_brand || '',
    model: data.material_model || '',
    name: `${data.material_brand || ''} ${data.material_model || ''}`.trim(),
    color: data.material_color || '',
    is_composite: data.material_is_composite || false,
    composite_details: data.material_composite_details || '',
  } : null

  const machine = data.machine_id ? {
    id: data.machine_id,
    brand: data.machine_brand || '',
    model: data.machine_model || '',
    name: `${data.machine_brand || ''} ${data.machine_model || ''}`.trim(),
    technology_type: data.machine_technology || 'FFF',
    other_specs: data.machine_specs || '',
  } : null

  const sample = data.machine_id ? {
    id: data.experiment_id,
    researcher_id: data.researcher_id,
    material_id: data.material_id,
    machine_id: data.machine_id,
    index_visual: data.index_visual,
    shape_type: data.shape_type,
    shape_dimension: data.shape_dimension,
    circle_roi_area: data.circle_roi_area,
    pattern_type: data.pattern_type || null,
    created_at: data.created_at || '',
  } : null

  // Ensure infill_data is always an array
  const infill_data = Array.isArray(data.infill_measurements) ? data.infill_measurements : []

  // Ensure attenuation_data is always an array
  const attenuation_data = Array.isArray(data.linear_attenuation) ? data.linear_attenuation : []

  const result = {
    material,
    machine,
    sample,
    infill_data,
    mechanical_data: data.mechanical_properties || null,
    attenuation_data,
    beam_data: data.beam_qualities || null,
  }

  console.log('[transformApiDataToEditFormat] Output data:', {
    hasInfillData: !!result.infill_data,
    infillLength: result.infill_data.length,
    hasMaterial: !!result.material,
    hasMachine: !!result.machine,
    hasSample: !!result.sample,
  })

  return result
}
