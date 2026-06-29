'use client'

import { useState, useRef, useEffect } from 'react'
import { ChevronRight } from 'lucide-react'
import MaterialMachineForm from './steps/MaterialMachineForm'
import SampleForm from './steps/SampleForm'
import InfillEditForm from './steps/InfillEditForm'
import MechanicalForm from './steps/MechanicalForm'
import AttenuationForm from './steps/AttenuationForm'
import BeamForm from './steps/BeamForm'
import { useExperimentEdit } from '@/lib/hooks/useExperimentEdit'
import SectionSummaryCard from './SectionSummaryCard'
import FinalizationConfirmationModal from './FinalizationConfirmationModal'

type Section = 'material-machine' | 'sample' | 'infill' | 'mechanical' | 'attenuation' | 'beam'

interface ExperimentEditWizardProps {
  initialData?: any | null
  experimentId: string
  onEditComplete?: () => void
}

/**
 * ExperimentEditWizard - Componente INDEPENDENTE para edição de experimentos
 * 
 * Diferenças do ExperimentWizard:
 * - Sem guia de início
 * - Sem workflow obrigatório
 * - Sem reordenação de seções
 * - Focado apenas em edição de dados existentes
 * - Usa hook dedicado useExperimentEdit (não compartilhado)
 */
/**
 * ExperimentEditWizard - Componente INDEPENDENTE para edição de experimentos
 * 
 * Diferenças do ExperimentWizard:
 * - Sem guia de início
 * - Sem workflow obrigatório
 * - Sem reordenação de seções
 * - Focado apenas em edição de dados existentes
 * - Usa hook dedicado useExperimentEdit (não compartilhado)
 * 
 * IMPORTANTE: A inicialização é ONE-TIME através de um initializer callback
 * no useState. O useEffect só atualiza campos de forma segura sem duplicação.
 */
export default function ExperimentEditWizard({ initialData, experimentId, onEditComplete }: ExperimentEditWizardProps) {
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set())
  const [showFinalizationModal, setShowFinalizationModal] = useState(false)
  const [dataInitialized, setDataInitialized] = useState(false)

  // Form refs for programmatic submit
  const materialMachineFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const sampleFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const mechanicalFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const attenuationFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const beamFormRef = useRef<{ submit: () => Promise<void> }>(null)

  const {
    material,
    machine,
    sample,
    infillData,
    mechanicalData,
    attenuationData,
    beamData,
    isLoading,
    error,
    success,
    setMaterialLocal,
    setMachineLocal,
    setSampleLocal,
    setInfillDataLocal,
    setMechanicalDataLocal,
    setAttenuationDataLocal,
    setBeamDataLocal,
    editExperimentConsolidated,
  } = useExperimentEdit()

  // Initialize com dados do experimento - ONLY ONCE, nunca novamente
  useEffect(() => {
    if (initialData && !dataInitialized) {
      // DEBUG: Log infill data to check for duplicates
      console.log('[ExperimentEditWizard] initialData.infill_data:', {
        length: initialData.infill_data?.length,
        data: initialData.infill_data
      })
      
      if (initialData.material) setMaterialLocal(initialData.material)
      if (initialData.machine) setMachineLocal(initialData.machine)
      if (initialData.sample) setSampleLocal(initialData.sample)
      // ALWAYS set infill_data - even if empty array - to ensure it's initialized
      setInfillDataLocal(initialData.infill_data || [])
      if (initialData.mechanical_data) setMechanicalDataLocal(initialData.mechanical_data)
      // ALWAYS set attenuation_data - even if empty array
      setAttenuationDataLocal(initialData.attenuation_data || [])
      if (initialData.beam_data) setBeamDataLocal(initialData.beam_data)

      const completed: Section[] = []
      if (initialData.material && initialData.machine) completed.push('material-machine')
      if (initialData.sample) completed.push('sample')
      if (initialData.infill_data?.length > 0) completed.push('infill')
      if (initialData.mechanical_data) completed.push('mechanical')
      if (initialData.attenuation_data?.length > 0) completed.push('attenuation')
      if (initialData.beam_data) completed.push('beam')
      setCompletedSections(new Set(completed))
      
      // Mark as initialized to prevent re-initialization
      setDataInitialized(true)
    }
  }, [initialData, dataInitialized, setMaterialLocal, setMachineLocal, setSampleLocal, setInfillDataLocal, setMechanicalDataLocal, setAttenuationDataLocal, setBeamDataLocal])

  const handleSectionEdit = (section: Section) => {
    setEditingSection(section)
  }

  const handleSectionComplete = (section: Section) => {
    setCompletedSections((prev) => new Set(prev).add(section))
    setEditingSection(null)
  }

  const handleFinalizationConfirm = async () => {
    try {
      await editExperimentConsolidated(experimentId)
      // If onEditComplete callback provided (when inside modal), use it
      // Otherwise redirect to meus-experimentos (when in standalone page)
      if (onEditComplete) {
        onEditComplete()
      } else {
        setTimeout(() => {
          window.location.href = '/meus-experimentos'
        }, 800)
      }
    } catch (err) {
      console.error('Erro ao salvar alterações:', err)
      throw err
    }
  }

  // Renderizar conteúdo da seção em edição
  const renderSectionContent = () => {
    switch (editingSection) {
      case 'material-machine':
        return (
          <MaterialMachineForm
            ref={materialMachineFormRef}
            initialData={{ material: material || undefined, machine: machine || undefined }}
            onValidationChange={() => {}}
            onSubmit={async (data) => {
              setMaterialLocal(data.material)
              setMachineLocal(data.machine)
              handleSectionComplete('material-machine')
            }}
          />
        )

      case 'sample':
        return (
          <SampleForm
            ref={sampleFormRef}
            materialId={material?.id || ''}
            machineId={machine?.id || ''}
            initialSampleData={sample || undefined}
            onSubmit={async (data) => {
              setSampleLocal(data)
              handleSectionComplete('sample')
            }}
            onValidationChange={() => {}}
          />
        )

      case 'infill': {
        // InfillEditForm é autocontido: recebe as linhas brutas do banco, inicializa os
        // campos SINCRONAMENTE (useState initializer), e salva via PUT update-infills.
        // Não depende de selectedInfills nem de useEffect de init.
        // Use infillData from hook if available, otherwise fallback to initialData
        const infillsToUse = (infillData?.length > 0) ? infillData : (initialData?.infill_data || [])
        return (
          <InfillEditForm
            experimentId={experimentId}
            initialMeasurements={infillsToUse}
            onSaved={() => {
              // Limpar infillData do hook para que o save consolidado (Finalizar)
              // NÃO reenvie dados antigos e sobrescreva o que acabou de ser salvo
              setInfillDataLocal([])
              handleSectionComplete('infill')
            }}
            onCancel={() => setEditingSection(null)}
          />
        )
      }

      case 'mechanical':
        return (
          <MechanicalForm
            ref={mechanicalFormRef}
            sampleId={sample?.id || ''}
            optional
            initialData={mechanicalData}
            onSubmit={async (data) => {
              setMechanicalDataLocal(data)
              handleSectionComplete('mechanical')
            }}
          />
        )

      case 'attenuation':
        return (
          <AttenuationForm
            ref={attenuationFormRef}
            sampleId={sample?.id || ''}
            optional
            initialData={attenuationData}
            onSubmit={async (data) => {
              if (data && Array.isArray(data)) {
                const itemsToUpdate = data.filter(item => item.id)
                const itemsToCreate = data.filter(item => !item.id)
                
                // Em modo edição, só atualizar items existentes
                for (const item of itemsToUpdate) {
                  // Validação local
                }
                
                await setAttenuationDataLocal(data)
              }
              handleSectionComplete('attenuation')
            }}
          />
        )

      case 'beam':
        return (
          <BeamForm
            ref={beamFormRef}
            sampleId={sample?.id || ''}
            optional
            initialData={beamData}
            onSubmit={async (data) => {
              setBeamDataLocal(data)
              handleSectionComplete('beam')
            }}
          />
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="mx-auto max-w-5xl px-4">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900">📝 Editar Experimento</h1>
          <p className="text-lg text-gray-600 mt-2">Atualize os dados do seu experimento</p>
        </div>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 rounded-lg bg-green-50 border border-green-200 p-4 text-green-800">
            ✅ {success}
          </div>
        )}
        {error && (
          <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-4 text-red-800">
            ❌ {error}
          </div>
        )}

        {/* Message Card */}
        {editingSection === null && (
          <div className="mb-6 rounded-lg bg-orange-50 border-l-4 border-orange-400 p-4">
            <p className="text-orange-900">
              <strong>📋 Editando Experimento:</strong> Clique em "Editar" para modificar cada seção. Ao clicar "Finalizar", todas as alterações serão salvas.
            </p>
          </div>
        )}

        {/* Sections Grid */}
        <div className="space-y-6">
          {/* Material & Máquina */}
          {editingSection === 'material-machine' ? (
            <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
              {renderSectionContent()}
              <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ✕ Fechar
                </button>
                <button
                  onClick={() => materialMachineFormRef.current?.submit()}
                  className="flex-1 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Salvar
                </button>
              </div>
            </div>
          ) : (material || machine) ? (
            <SectionSummaryCard
              sectionTitle="Material & Máquina"
              sectionIcon="⚙️"
              items={[
                { label: 'Material', value: material ? `${material.brand} ${material.model}`.trim() : 'N/A' },
                { label: 'Máquina', value: machine ? `${machine.brand} ${machine.model}`.trim() : 'N/A' },
              ]}
              isComplete={completedSections.has('material-machine')}
              onEdit={() => handleSectionEdit('material-machine')}
            />
          ) : (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionEdit('material-machine')}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-900">⚙️ Material & Máquina</p>
                  <p className="text-sm text-blue-700 mt-2">Clique para adicionar as informações</p>
                </div>
              </div>
            </div>
          )}

          {/* Amostra */}
          {editingSection === 'sample' ? (
            <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
              {renderSectionContent()}
              <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ✕ Fechar
                </button>
                <button
                  onClick={() => sampleFormRef.current?.submit()}
                  className="flex-1 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Salvar
                </button>
              </div>
            </div>
          ) : sample ? (
            <SectionSummaryCard
              sectionTitle="Amostra"
              sectionIcon="🧪"
              items={[
                { label: 'Forma', value: sample.shape_type || 'N/A' },
                { label: 'Dimensão', value: sample.shape_dimension ? `${sample.shape_dimension} mm` : 'N/A' },
                { label: 'Área ROI', value: `${sample.circle_roi_area || 'N/A'} mm²` },
              ]}
              isComplete={completedSections.has('sample')}
              onEdit={() => handleSectionEdit('sample')}
            />
          ) : (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionEdit('sample')}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-900">🧪 Amostra</p>
                  <p className="text-sm text-blue-700 mt-2">Clique para adionar as informações da amostra</p>
                </div>
              </div>
            </div>
          )}

          {/* Infill */}
          {editingSection === 'infill' ? (
            <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
              {renderSectionContent()}
            </div>
          ) : (infillData?.length ?? 0) > 0 ? (
            <SectionSummaryCard
              sectionTitle="Infill"
              sectionIcon="📊"
              items={[
                { label: 'Medições', value: infillData.length },
                {
                  label: 'Percentual Médio',
                  value: `${(
                    infillData.reduce((sum: number, d: any) => sum + (Number(d.infill_pct) || 0), 0) /
                    infillData.length
                  ).toFixed(2)}%`,
                },
              ]}
              isComplete={completedSections.has('infill')}
              onEdit={() => handleSectionEdit('infill')}
            />
          ) : (initialData?.infill_data?.length ?? 0) > 0 ? (
            <SectionSummaryCard
              sectionTitle="Infill"
              sectionIcon="📊"
              items={[
                { label: 'Medições', value: initialData!.infill_data.length },
                {
                  label: 'Percentual Médio',
                  value: `${(
                    initialData!.infill_data.reduce((sum: number, d: any) => sum + (Number(d.infill_pct) || 0), 0) /
                    initialData!.infill_data.length
                  ).toFixed(2)}%`,
                },
              ]}
              isComplete={completedSections.has('infill')}
              onEdit={() => handleSectionEdit('infill')}
            />
          ) : (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionEdit('infill')}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-900">📊 Infill</p>
                  <p className="text-sm text-blue-700 mt-2">Clique para adicionar as medições</p>
                </div>
              </div>
            </div>
          )}

          {/* Propriedades Mecânicas */}
          {editingSection === 'mechanical' ? (
            <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
              {renderSectionContent()}
              <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ✕ Fechar
                </button>
                <button
                  onClick={() => mechanicalFormRef.current?.submit()}
                  className="flex-1 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Salvar
                </button>
              </div>
            </div>
          ) : mechanicalData ? (
            <SectionSummaryCard
              sectionTitle="Propriedades Mecânicas"
              sectionIcon="💪"
              items={[
                { label: 'Módulo de Tração', value: `${mechanicalData?.tensile_modulus_mpa || 0} MPa` },
                { label: 'Resistência de Tração', value: `${mechanicalData?.tensile_strength_mpa || 0} MPa` },
              ]}
              isComplete={completedSections.has('mechanical')}
              onEdit={() => handleSectionEdit('mechanical')}
            />
          ) : (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionEdit('mechanical')}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-900">💪 Propriedades Mecânicas</p>
                  <p className="text-sm text-blue-700 mt-2">Clique para adicionar as informações</p>
                </div>
              </div>
            </div>
          )}

          {/* Atenuação */}
          {editingSection === 'attenuation' ? (
            <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
              {renderSectionContent()}
              <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ✕ Fechar
                </button>
                <button
                  onClick={() => attenuationFormRef.current?.submit()}
                  className="flex-1 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Salvar
                </button>
              </div>
            </div>
          ) : attenuationData?.length > 0 ? (
            <SectionSummaryCard
              sectionTitle="Atenuação"
              sectionIcon="📉"
              items={[{ label: 'Medições', value: attenuationData?.length || 0 }]}
              isComplete={completedSections.has('attenuation')}
              onEdit={() => handleSectionEdit('attenuation')}
            />
          ) : (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionEdit('attenuation')}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-900">📉 Atenuação</p>
                  <p className="text-sm text-blue-700 mt-2">Clique para adicionar as informações</p>
                </div>
              </div>
            </div>
          )}

          {/* Qualidade de Feixes */}
          {editingSection === 'beam' ? (
            <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
              {renderSectionContent()}
              <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                <button
                  onClick={() => setEditingSection(null)}
                  className="flex-1 px-6 py-2 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
                >
                  ✕ Fechar
                </button>
                <button
                  onClick={() => beamFormRef.current?.submit()}
                  className="flex-1 px-6 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors"
                >
                  ✅ Salvar
                </button>
              </div>
            </div>
          ) : beamData ? (
            <SectionSummaryCard
              sectionTitle="Qualidade de Feixes"
              sectionIcon="⚡"
              items={[
                { label: 'RQR', value: `${beamData?.rqr_2 ? 'Sim' : 'Não'}` },
                { label: 'RQT', value: `${beamData?.rqt_8 ? 'Sim' : 'Não'}` },
              ]}
              isComplete={completedSections.has('beam')}
              onEdit={() => handleSectionEdit('beam')}
            />
          ) : (
            <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionEdit('beam')}>
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <p className="text-lg font-semibold text-blue-900">⚡ Qualidade de Feixes</p>
                  <p className="text-sm text-blue-700 mt-2">Clique para adicionar as informações</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Finalize Button */}
        {editingSection === null && (
          <div className="flex justify-end gap-3 pt-8 border-t mt-8">
            <button
              onClick={() => window.location.href = '/meus-experimentos'}
              className="px-8 py-3 bg-gray-300 text-gray-900 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
            >
              Voltar
            </button>
            <button
              onClick={() => setShowFinalizationModal(true)}
              disabled={isLoading}
              className="px-8 py-3 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              ✅ Finalizar Alterações
            </button>
          </div>
        )}

        {/* Finalization Modal */}
        <FinalizationConfirmationModal
          isOpen={showFinalizationModal}
          isLoading={isLoading}
          isEditMode={true}
          onConfirm={handleFinalizationConfirm}
          onCancel={() => setShowFinalizationModal(false)}
        />
      </div>
    </div>
  )
}
