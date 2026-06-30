'use client'

import { useState, useMemo, useRef, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Trash2,
  Info,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { getNormalizedApiUrl } from '@/lib/api'
import { logger } from '@/lib/logger'
import MaterialMachineForm from './steps/MaterialMachineForm'
import SampleForm from './steps/SampleForm'
import PredefinedInfillsForm from './steps/PredefinedInfillsForm'

// ⚡ PERFORMANCE: Lazy load heavy components
const MechanicalForm = dynamic(() => import('./steps/MechanicalForm'), { ssr: false })
const AttenuationForm = dynamic(() => import('./steps/AttenuationForm'), { ssr: false })
const BeamForm = dynamic(() => import('./steps/BeamForm'), { ssr: false })
const ExperimentGuide = dynamic(() => import('./ExperimentGuide'), { ssr: false })
const FinalizationConfirmationModal = dynamic(() => import('./FinalizationConfirmationModal'), { ssr: false })

// Mapeamento de IDs de pattern (lowercase) para nomes de exibição
const PATTERN_NAME_MAP: Record<string, string> = {
  rectilinear: 'Rectilinear',
  grid: 'Grid',
  line: 'Line',
  cubic: 'Cubic',
  triangles: 'Triangles',
  gyroid: 'Gyroid',
  honeycomb: 'Honeycomb',
  cross: 'Cross',
  '3d_honeycomb': '3D Honeycomb',
  hilbert: 'Hilbert Curve',
  octagram: 'Octagram Spiral',
  crosshatch: 'CrossHatch',
  archimedean: 'Archimedean Chords',
}

const INFILL_PERCENTAGES = [40, 60, 80, 100]

import { useExperimentWizard } from '@/lib/hooks/useExperimentWizard'
import SectionCard from './SectionCard'
import SectionSummaryCard from './SectionSummaryCard'
import TriStageProgress from './TriStageProgress'

type Section = 'guide' | 'material-machine' | 'sample' | 'infill' | 'mechanical' | 'attenuation' | 'beam' | 'review'

interface SectionConfig {
  id: Section
  title: string
  description: string
  icon: string
  required: boolean
  order: number
}

const SECTIONS: SectionConfig[] = [
  {
    id: 'guide',
    title: 'Guia de Início',
    description: 'Entenda o fluxo do cadastro de experimentos',
    icon: '📚',
    required: false,
    order: 0,
  },
  {
    id: 'material-machine',
    title: 'Material & Máquina',
    description: 'Informações sobre o material e a máquina utilizada',
    icon: '⚙️',
    required: true,
    order: 1,
  },
  {
    id: 'sample',
    title: 'Amostra',
    description: 'Configuração e geometria da amostra',
    icon: '🧪',
    required: true,
    order: 2,
  },
  {
    id: 'infill',
    title: 'Infill (Preenchimento)',
    description: 'Medições de densidade e preenchimento',
    icon: '📊',
    required: true,
    order: 3,
  },
  {
    id: 'mechanical',
    title: 'Propriedades Mecânicas',
    description: 'Testes de resistência e outros parâmetros',
    icon: '💪',
    required: false,
    order: 5,
  },
  {
    id: 'attenuation',
    title: 'Atenuação',
    description: 'Medições de atenuação linear',
    icon: '📉',
    required: false,
    order: 6,
  },
  {
    id: 'beam',
    title: 'Qualidade de Feixes',
    description: 'Análise de feixes de acordo com IEC 61267',
    icon: '⚡',
    required: false,
    order: 7,
  },
  {
    id: 'review',
    title: 'Revisão Final',
    description: 'Revise todas as informações antes de finalizar',
    icon: '✅',
    required: false,
    order: 8,
  },
]

interface ExperimentWizardProps {}

export default function ExperimentWizard({}: ExperimentWizardProps = {}) {
  const { t } = useTranslation()
  const [expandedSections, setExpandedSections] = useState<Set<Section>>(new Set(['guide']))
  const [completedSections, setCompletedSections] = useState<Set<Section>>(new Set())
  const [editingSection, setEditingSection] = useState<Section | null>('guide')
  const [validationAttempts, setValidationAttempts] = useState<Set<Section>>(new Set())
  const [showFinalizationModal, setShowFinalizationModal] = useState(false)
  const [selectedPredefinedInfills, setSelectedPredefinedInfills] = useState<any[]>([])
  const [infillPendingData, setInfillPendingData] = useState<any[]>([])
  const [regressionA, setRegressionA] = useState<number | null>(null)
  const [regressionB, setRegressionB] = useState<number | null>(null)

  
  // Track form validation state in real-time
  const [sectionValidation, setSectionValidation] = useState<Record<Section, boolean>>({
    'guide': true,
    'material-machine': false,
    'sample': false,
    'infill': false,
    'mechanical': false,
    'attenuation': false,
    'beam': false,
    'review': false,
  })

  // Memoized callbacks to prevent infinite loops
  const handleMaterialMachineValidation = useCallback(
    (isValid: boolean) => {
      setSectionValidation((prev) => ({ ...prev, 'material-machine': isValid }))
    },
    []
  )

  const handleSampleValidation = useCallback(
    (isValid: boolean) => {
      setSectionValidation((prev) => ({ ...prev, 'sample': isValid }))
    },
    []
  )

  // Form refs for programmatic submit
  const materialMachineFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const mechanicalFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const attenuationFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const beamFormRef = useRef<{ submit: () => Promise<void> }>(null)
  const sampleFormRef = useRef<{ submit: () => Promise<void> }>(null)

  const {
    material,
    machine,
    sample,
    patternIds,
    infillData,
    mechanicalData,
    attenuationData,
    beamData,
    canCreateSample,
    canAddInfill,
    canFinalize,
    technicalDataCount,
    isLoading,
    error,
    success,
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
    setMaterialLocal,
    setMachineLocal,
    setSampleLocal,
    setInfillDataLocal,
    setMechanicalDataLocal,
    setAttenuationDataLocal,
    setBeamDataLocal,
    reset,
  } = useExperimentWizard()



  // Handlers de seção
  const toggleSectionExpanded = (sectionId: Section) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const handleSectionComplete = (sectionId: Section) => {
    setCompletedSections((prev) => new Set(prev).add(sectionId))
    setExpandedSections((prev) => {
      const next = new Set(prev)
      next.delete(sectionId)
      return next
    })
    
    // Para seções obrigatórias, abrir a próxima
    const requiredSections: Section[] = ['material-machine', 'sample', 'infill']
    const currentIndex = requiredSections.indexOf(sectionId as any)
    
    if (sectionId === 'sample') {
      // Auto-abrir Infill após Amostra
      setTimeout(() => {
        setEditingSection('infill')
        setExpandedSections((prev) => new Set(prev).add('infill'))
      }, 100)
    } else if (currentIndex !== -1 && currentIndex < requiredSections.length - 1) {
      // Abrir próxima seção obrigatória
      const nextSection = requiredSections[currentIndex + 1]
      setEditingSection(nextSection)
      setExpandedSections((prev) => new Set(prev).add(nextSection))
    } else {
      // Para seções opcionais (mechanical, attenuation, beam) ou última seção (infill)
      // Resetar editingSection para null para voltar ao estado de visualização
      setEditingSection(null)
    }
  }

  // Encontrar próxima seção
  const getNextSection = (): Section | null => {
    const requiredSections: Section[] = ['guide', 'material-machine', 'sample', 'infill']
    const optionalSections: Section[] = ['mechanical', 'attenuation', 'beam', 'review']
    
    // Procura próxima seção obrigatória não completada
    for (const section of requiredSections) {
      if (!completedSections.has(section) && section !== 'guide') {
        return section
      }
    }
    
    // Se todas as obrigatórias estão completas, mostra revisão
    return 'review'
  }

  // Determinar se uma seção está bloqueada
  const isLocked = (sectionId: Section): boolean => {
    if (sectionId === 'sample') return !completedSections.has('material-machine')
    if (sectionId === 'infill') return !completedSections.has('sample')
    if (sectionId === 'mechanical') return !completedSections.has('infill')
    if (sectionId === 'attenuation') return !completedSections.has('infill')
    if (sectionId === 'beam') return !completedSections.has('infill')
    return false
  }

  // Seções disponíveis para navegação
  const getAvailableSections = () => {
    const sections: {
      id: Section
      name: string
      icon: string
      completed: boolean
      locked: boolean
      optional: boolean
      order: number
    }[] = [
      {
        id: 'material-machine',
        name: t('experimentWizardNew.sections.materialMachine.title'),
        icon: '⚙️',
        completed: completedSections.has('material-machine'),
        locked: isLocked('material-machine'),
        optional: false,
        order: 1,
      },
      {
        id: 'sample',
        name: t('experimentWizardNew.sections.sample.title'),
        icon: '🧪',
        completed: completedSections.has('sample'),
        locked: isLocked('sample'),
        optional: false,
        order: 2,
      },
      {
        id: 'infill',
        name: t('experimentWizardNew.sections.infill.title'),
        icon: '📊',
        completed: completedSections.has('infill'),
        locked: isLocked('infill'),
        optional: false,
        order: 3,
      },
      {
        id: 'mechanical',
        name: t('experimentWizardNew.sections.mechanical.title'),
        icon: '💪',
        completed: completedSections.has('mechanical'),
        locked: isLocked('mechanical'),
        optional: true,
        order: 5,
      },
      {
        id: 'attenuation',
        name: t('experimentWizardNew.sections.attenuation.title'),
        icon: '📉',
        completed: completedSections.has('attenuation'),
        locked: isLocked('attenuation'),
        optional: true,
        order: 6,
      },
      {
        id: 'beam',
        name: t('experimentWizardNew.sections.beam.title'),
        icon: '⚡',
        completed: completedSections.has('beam'),
        locked: isLocked('beam'),
        optional: true,
        order: 7,
      },
    ]

    return sections.sort((a, b) => a.order - b.order)
  }

  const handleSectionEdit = (sectionId: Section) => {
    setEditingSection(sectionId)
    setCompletedSections((prev) => {
      const next = new Set(prev)
      next.delete(sectionId)
      return next
    })
    setExpandedSections((prev) => new Set(prev).add(sectionId))
    
    // 🔑 IMPORTANTE: Limpar tentativas de validação ao entrar em modo edição
    // Isso remove a mensagem de erro vermelha falsa que aparecia antes de carregar dados
    setValidationAttempts((prev) => {
      const next = new Set(prev)
      next.delete(sectionId)
      return next
    })
    
    // Se editando infill, carrega dados já salvos do banco (como em meus-experimentos)
    if (sectionId === 'infill' && sample?.id) {
      loadInfillDataFromBank(sample.id)
    }
  }

  // Carregar dados de infill do banco (assim como em meus-experimentos)
  const loadInfillDataFromBank = async (sampleId: string) => {
    try {
      const user = localStorage.getItem('user')
      if (!user) {
        logger.error('ExperimentWizard', 'loadInfillDataFromBank: Sem token de autenticação')
        return
      }
      
      const userData = JSON.parse(user)
      const token = userData.access_token

      const apiUrl = getNormalizedApiUrl()
      const detalhesUrl = `${apiUrl}/experiments/${sampleId}/detalhes`
      
      const response = await fetch(detalhesUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        const data = await response.json()
        
        if (data?.infill_measurements && data.infill_measurements.length > 0) {
          setInfillPendingData(data.infill_measurements)
          setInfillDataLocal(data.infill_measurements)
          
          const uniqueInfills = data.infill_measurements
            .filter((im: any) => im.pattern_type && im.pattern_type.trim() !== '')
            .reduce((acc: any[], im: any) => {
              const exists = acc.some(x => x.pattern_type === im.pattern_type && x.infill_pct === im.infill_pct)
              if (!exists) {
                acc.push({
                  pattern_type: im.pattern_type,
                  infill_pct: im.infill_pct
                })
              }
              return acc
            }, [])
          
          setSelectedPredefinedInfills(uniqueInfills)
        }
      } else {
        logger.warn('ExperimentWizard', 'loadInfillDataFromBank: Falha ao carregar dados do banco')
      }
    } catch (err) {
      logger.error('ExperimentWizard', err instanceof Error ? err.message : 'Unknown error')
    }
  }

  const handleReset = () => {
    if (window.confirm(t('experimentWizardNew.confirmations.restart'))) {
      reset()
      setExpandedSections(new Set(['guide']))
      setCompletedSections(new Set())
      setEditingSection('guide')
      setValidationAttempts(new Set())
    }
  }

  const handleFinish = async () => {
    setShowFinalizationModal(true)
  }

  // Finalization confirmation handler
  const handleFinalizationConfirm = async () => {
    if (!sample) return

    try {
      // Create mode: use finalize endpoint
      await finalizeExperiment(sample.id)
      // Redirect to Meus Experimentos after successful creation
      setTimeout(() => {
        window.location.href = '/meus-experimentos'
      }, 800)
    } catch (err) {
      logger.error('ExperimentWizard', err instanceof Error ? err.message : 'Unknown error')
      throw err
    }
  }

  // Auto-gerar infills quando os patterns do sample estiverem disponíveis
  useEffect(() => {
    if (patternIds && patternIds.length > 0) {
      const autoInfills = patternIds.flatMap(id => {
        const displayName = PATTERN_NAME_MAP[id.toLowerCase()] || id
        return INFILL_PERCENTAGES.map(pct => ({
          pattern_type: displayName,
          infill_pct: pct,
        }))
      })
      setSelectedPredefinedInfills(autoInfills)
    } else {
      setSelectedPredefinedInfills([])
    }
  }, [patternIds])

  // Sincronizar infillPendingData quando entra em modo de edição de infill
  useEffect(() => {
    if (editingSection === 'infill' && infillData.length > 0 && infillPendingData.length === 0) {
      setInfillPendingData(infillData)
    }
  }, [editingSection, infillData, infillPendingData.length])

  // Status de seção
  const getSectionStatus = (sectionId: Section): 'completed' | 'in-progress' | 'pending' | 'error' => {
    if (completedSections.has(sectionId)) return 'completed'
    if (editingSection === sectionId) return 'in-progress'
    if (validationAttempts.has(sectionId)) return 'error'
    return 'pending'
  }

  // Progresso visual
  const progressSteps = useMemo(
    () =>
      SECTIONS.filter((s) => s.id !== 'guide' && s.id !== 'review').map((s) => ({
        id: s.id,
        label: s.title,
        status: getSectionStatus(s.id),
        optional: !s.required,
      })),
    [completedSections, editingSection, validationAttempts]
  )

  // Progresso em 3 estágios
  const stageProgress = useMemo(() => [
    {
      name: t('experimentWizardNew.stages.fabrication'),
      icon: '⚙️',
      sections: [
        {
          id: 'material-machine',
          name: t('experimentWizardNew.sections.materialMachine.title'),
          completed: completedSections.has('material-machine'),
        },
      ],
      completed: completedSections.has('material-machine'),
    },
    {
      name: t('experimentWizardNew.stages.samples'),
      icon: '🧪',
      sections: [
        {
          id: 'sample',
          name: t('experimentWizardNew.sections.sample.title'),
          completed: completedSections.has('sample'),
        },
        {
          id: 'infill',
          name: t('experimentWizardNew.sections.infill.title'),
          completed: completedSections.has('infill'),
        },
      ],
      completed:
        (completedSections.has('sample') && completedSections.has('infill')) ||
        completedSections.has('mechanical'),
    },
    {
      name: t('experimentWizardNew.stages.characteristics'),
      icon: '📊',
      sections: [
        {
          id: 'mechanical',
          name: t('experimentWizardNew.sections.mechanical.title'),
          completed: completedSections.has('mechanical'),
        },
        {
          id: 'attenuation',
          name: t('experimentWizardNew.sections.attenuation.title'),
          completed: completedSections.has('attenuation'),
        },
        {
          id: 'beam',
          name: t('experimentWizardNew.sections.beam.title'),
          completed: completedSections.has('beam'),
        },
      ],
      completed:
        (completedSections.has('mechanical') &&
        completedSections.has('attenuation') &&
        completedSections.has('beam')) ||
        completedSections.has('review'),
    },
  ], [completedSections, material, machine, sample, infillData, mechanicalData, attenuationData, beamData])

  // Dados para revisão final
  const getReviewSections = () => {
    const sections = []

    if (material && machine) {
      sections.push({
        id: 'material-machine',
        title: 'Material & Máquina',
        icon: '⚙️',
        status: 'complete' as const,
        items: [
          { label: 'Material', value: `${material.brand} ${material.model}` },
          { label: 'Máquina', value: `${machine.brand} ${machine.model}` },
          { label: 'Tecnologia', value: machine.technology_type },
          ...(machine.other_specs ? [{ label: 'Especificações', value: machine.other_specs }] : []),
        ],
        onEdit: () => handleSectionEdit('material-machine'),
      })
    }

    if (sample) {
      sections.push({
        id: 'sample',
        title: 'Amostra',
        icon: '🧪',
        status: 'complete' as const,
        items: [
          { label: 'Forma', value: sample.shape_type },
          { label: 'Dimensão', value: sample.shape_dimension ? `${sample.shape_dimension} mm` : 'N/A' },
          { label: 'Área ROI', value: `${sample.circle_roi_area || 'N/A'} mm²` },
        ],
        onEdit: () => handleSectionEdit('sample'),
      })
    }

    if (infillData?.length > 0) {
      sections.push({
        id: 'infill',
        title: 'Infill',
        icon: '📊',
        status: 'complete' as const,
        items: [
          { label: 'Medições', value: infillData?.length || 0 },
          {
            label: 'Percentual Médio',
            value: `${(
              infillData.reduce((sum, d) => sum + (Number(d.infill_pct ?? d.infill_percentage) || 0), 0) /
                (infillData?.length || 1)
            ).toFixed(2)}%`,
          },
        ],
        onEdit: () => handleSectionEdit('infill'),
      })
    }

    if (mechanicalData?.length > 0) {
      sections.push({
        id: 'mechanical',
        title: t('experimentWizardNew.sections.mechanical.title'),
        icon: '💪',
        status: 'complete' as const,
        items: [{ label: t('progress.summaryLabels.tests'), value: mechanicalData?.length || 0 }],
        onEdit: () => handleSectionEdit('mechanical'),
      })
    }

    if (attenuationData?.length > 0) {
      sections.push({
        id: 'attenuation',
        title: t('experimentWizardNew.sections.attenuation.title'),
        icon: '📉',
        status: 'complete' as const,
        items: [{ label: t('progress.summaryLabels.measurements'), value: attenuationData?.length || 0 }],
        onEdit: () => handleSectionEdit('attenuation'),
      })
    }

    if (beamData?.length > 0) {
      sections.push({
        id: 'beam',
        title: t('experimentWizardNew.sections.beam.title'),
        icon: '⚡',
        status: 'complete' as const,
        items: [{ label: t('progress.summaryLabels.analyses'), value: beamData?.length || 0 }],
        onEdit: () => handleSectionEdit('beam'),
      })
    }

    return sections
  }

  const renderSectionContent = (hideButtons: boolean = false) => {
    switch (editingSection) {
      case null:
        return null

      case 'guide':
        // Don't show guide in edit mode

        return (
          <ExperimentGuide
            onNext={() => {
              handleSectionComplete('guide')
              setEditingSection('material-machine')
              setExpandedSections((prev) => new Set(prev).add('material-machine'))
            }}
          />
        )

      case 'material-machine':
        return (
          <SectionCard
            id="material-machine"
            title={t('experimentWizardNew.sections.materialMachine.title')}
            description={t('experimentWizardNew.sections.materialMachine.description')}
            status={getSectionStatus('material-machine')}
            requiredFields={['Marca do Material', 'Modelo do Material', 'Marca da Máquina', 'Modelo da Máquina']}
            filledFields={[
              ...(material?.brand ? ['Marca do Material'] : []),
              ...(material?.model ? ['Modelo do Material'] : []),
              ...(machine?.brand ? ['Marca da Máquina'] : []),
              ...(machine?.model ? ['Modelo da Máquina'] : []),
            ]}
            isExpanded={expandedSections.has('material-machine')}
            onToggleExpand={() => toggleSectionExpanded('material-machine')}
            onComplete={() => materialMachineFormRef.current?.submit()}
            onEdit={() => handleSectionEdit('material-machine')}
            showValidationErrors={validationAttempts.has('material-machine')}
            overrideFormValid={sectionValidation['material-machine']}
            hideButtons={hideButtons}
          >
            <MaterialMachineForm
              ref={materialMachineFormRef}
              initialData={{ material: material || undefined, machine: machine || undefined }}
              onSubmit={async (data) => {
                try {
                  const isEditing = !!(material?.id && machine?.id)
                  if (isEditing) {
                    await updateMaterialAndMachine(data.material, data.machine)
                  } else {
                    await createMaterialAndMachine(data.material, data.machine)
                  }
                  handleSectionComplete('material-machine')
                } catch {
                  setValidationAttempts((prev) => new Set(prev).add('material-machine'))
                }
              }}
              onValidationChange={handleMaterialMachineValidation}
            />
          </SectionCard>
        )

      case 'sample':
        return (
          <SectionCard
            id="sample"
            title={t('experimentWizardNew.sections.sample.title')}
            description={t('experimentWizardNew.sections.sample.description')}
            status={getSectionStatus('sample')}
            requiredFields={['Forma', 'Dimensões']}
            filledFields={[...(sample?.shape_type ? ['Forma'] : []), ...(sample?.shape_dimension ? ['Dimensões'] : [])]}
            isExpanded={expandedSections.has('sample')}
            onToggleExpand={() => toggleSectionExpanded('sample')}
            onComplete={() => sampleFormRef.current?.submit()}
            onEdit={() => handleSectionEdit('sample')}
            showValidationErrors={validationAttempts.has('sample')}
            overrideFormValid={sectionValidation['sample']}
            hideButtons={hideButtons}
          >
            <SampleForm
              ref={sampleFormRef}
              materialId={material?.id || ''}
              machineId={machine?.id || ''}
              initialSampleData={sample || undefined}
              onSubmit={async (data) => {
                try {
                  const isEditing = !!sample?.id
                  if (isEditing) {
                    await updateSample(data)
                  } else {
                    await createSample(data)
                  }
                  handleSectionComplete('sample')
                } catch {
                  setValidationAttempts((prev) => new Set(prev).add('sample'))
                }
              }}
              onValidationChange={handleSampleValidation}
            />
          </SectionCard>
        )

      case 'infill':
        return (
          <SectionCard
            id="infill"
            title={t('experimentWizardNew.sections.infill.title')}
            description={`${patternIds.length} padrão(ões) · ${selectedPredefinedInfills.length} infill(s) para preencher`}
            status={getSectionStatus('infill')}
            requiredFields={['HU Mean para todos os infills']}
            filledFields={[...(infillPendingData.length > 0 ? ['Dados preenchidos'] : [])]}
            isExpanded={expandedSections.has('infill')}
            onToggleExpand={() => toggleSectionExpanded('infill')}
            hideButtons={hideButtons}
            onComplete={async () => {
              if (infillPendingData.length === 0) {
                setValidationAttempts((prev) => new Set(prev).add('infill'))
                return
              }
              try {
                // Separar itens existentes (UPDATE) de novos (INSERT)
                const itemsToUpdate = infillPendingData.filter((item: any) => item.id)
                const itemsToCreate = infillPendingData.filter((item: any) => !item.id)

                if (itemsToUpdate.length > 0) {
                  await batchUpdateInfills(sample!.id, itemsToUpdate)
                }
                if (itemsToCreate.length > 0) {
                  await addMultipleInfills(sample!.id, itemsToCreate)
                }
                // Salvar Termo A e B na amostra se calculados
                if (regressionA !== null || regressionB !== null) {
                  await updateSample({ dimension_a: regressionA, dimension_b: regressionB })
                }
                setInfillPendingData([])
                handleSectionComplete('infill')
              } catch (err) {
                logger.error('ExperimentWizard', err instanceof Error ? err.message : 'Unknown error')
                setValidationAttempts((prev) => new Set(prev).add('infill'))
              }
            }}
            onEdit={() => {
              handleSectionEdit('infill')
            }}
            showValidationErrors={validationAttempts.has('infill')}
          >
            <PredefinedInfillsForm
              selectedInfills={selectedPredefinedInfills}
              onDataChange={(data) => setInfillPendingData(data)}
              onRegressionChange={(a, b) => { setRegressionA(a); setRegressionB(b) }}
              initialRegressionA={sample?.dimension_a ?? null}
              initialRegressionB={sample?.dimension_b ?? null}
              initialMeasurements={infillData}
            />
          </SectionCard>
        )

      case 'mechanical':
        return (
          <SectionCard
            id="mechanical"
            title={t('experimentWizardNew.sections.mechanical.title')}
            description={t('experimentWizardNew.sections.mechanical.description')}
            status={getSectionStatus('mechanical')}
            requiredFields={[]}
            filledFields={[...(mechanicalData ? ['Dados preenchidos'] : [])]}
            isExpanded={expandedSections.has('mechanical')}
            onToggleExpand={() => toggleSectionExpanded('mechanical')}
            onComplete={() => mechanicalFormRef.current?.submit()}
            onEdit={() => handleSectionEdit('mechanical')}
            hideButtons={hideButtons}
          >
            <MechanicalForm
              ref={mechanicalFormRef}
              sampleId={sample?.id || ''}
              optional
              initialData={mechanicalData}
              onSubmit={async (data) => {
                try {
                  if (data) {
                    // Se tem ID, é update; senão, é create
                    if (data.id) {
                      await updateMechanical(sample!.id, data)
                    } else {
                      await addMechanical(sample!.id, data)
                    }
                  }
                  handleSectionComplete('mechanical')
                } catch {
                  setValidationAttempts((prev) => new Set(prev).add('mechanical'))
                }
              }}
            />
          </SectionCard>
        )

      case 'attenuation':
        return (
          <SectionCard
            id="attenuation"
            title={t('experimentWizardNew.sections.attenuation.title')}
            description={t('experimentWizardNew.sections.attenuation.description')}
            status={getSectionStatus('attenuation')}
            requiredFields={[]}
            filledFields={[...(attenuationData?.length > 0 ? ['Dados preenchidos'] : [])]}
            isExpanded={expandedSections.has('attenuation')}
            onToggleExpand={() => toggleSectionExpanded('attenuation')}
            onComplete={() => attenuationFormRef.current?.submit()}
            onEdit={() => handleSectionEdit('attenuation')}
            hideButtons={hideButtons}
          >
            <AttenuationForm
              ref={attenuationFormRef}
              sampleId={sample?.id || ''}
              optional
              initialData={
                attenuationData?.[0]?.rqr_energy
                  ? attenuationData
                  : null
              }
              legacyInitialData={
                attenuationData?.length && !attenuationData[0]?.rqr_energy
                  ? attenuationData
                  : null
              }
              onSubmit={async (data) => {
                try {
                  if (data?.tests) {
                    await addAttenuation(sample!.id, data)
                  } else if (data && Array.isArray(data)) {
                    const itemsToUpdate = data.filter((item) => item.id)
                    const itemsToCreate = data.filter((item) => !item.id)
                    for (const item of itemsToUpdate) {
                      await updateAttenuation(item.id, item)
                    }
                    if (itemsToCreate.length > 0) {
                      await addAttenuation(sample!.id, itemsToCreate)
                    }
                  }
                  handleSectionComplete('attenuation')
                } catch {
                  setValidationAttempts((prev) => new Set(prev).add('attenuation'))
                }
              }}
            />
          </SectionCard>
        )

      case 'beam':
        return (
          <SectionCard
            id="beam"
            title={t('experimentWizardNew.sections.beam.title')}
            description={t('experimentWizardNew.sections.beam.description')}
            status={getSectionStatus('beam')}
            requiredFields={[]}
            filledFields={[...(beamData ? ['Dados preenchidos'] : [])]}
            isExpanded={expandedSections.has('beam')}
            onToggleExpand={() => toggleSectionExpanded('beam')}
            onComplete={() => beamFormRef.current?.submit()}
            onEdit={() => handleSectionEdit('beam')}
            hideButtons={hideButtons}
          >
            <BeamForm
              ref={beamFormRef}
              sampleId={sample?.id || ''}
              optional
              initialData={beamData}
              onSubmit={async (data) => {
                try {
                  if (data) {
                    // Se tem ID, é update; senão, é create
                    if (data.id) {
                      await updateBeam(sample!.id, data)
                    } else {
                      await addBeam(sample!.id, data)
                    }
                  }
                  handleSectionComplete('beam')
                } catch {
                  setValidationAttempts((prev) => new Set(prev).add('beam'))
                }
              }}
            />
          </SectionCard>
        )

      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="mx-auto max-w-6xl px-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-foreground">
                📝 {t('experimentWizardNew.title')}
              </h1>
              <p className="mt-2 text-muted">
                {t('experimentWizardNew.subtitle')}
              </p>
            </div>
            {completedSections.size > 0 && (
              <button
                onClick={handleReset}
                disabled={isLoading}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-surface border border-border rounded-lg hover:bg-background transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {t('experimentWizardNew.buttons.restart')}
              </button>
            )}
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-red-900">
              <p className="font-semibold">{t('experimentWizardNew.alerts.error')}</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {success && (
          <div className="mb-6 bg-primary-light border border-primary/30 rounded-lg p-4 flex gap-3">
            <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
            <div className="text-sm text-primary">
              <p className="font-semibold">{t('experimentWizardNew.alerts.success')}</p>
              <p>{success}</p>
            </div>
          </div>
        )}

        {/* 3-Stage Progress */}
        <TriStageProgress stages={stageProgress} />

        {/* Mensagem de Edição em Modo Edit */}


        <div className="grid grid-cols-1 gap-8 mt-3">
          {/* Main Content - Full Width */}
          <div>
            <div className="space-y-6">
                {/* GUIA */}
                {!completedSections.has('guide') && editingSection === 'guide' && (
                  <div className="border-2 border-purple-400 rounded-lg p-6 bg-purple-50">
                    {renderSectionContent()}
                  </div>
                )}

                {/* Seções Completadas OU Em Edição - sempre visíveis após o guia */}
                {completedSections.has('guide') && (
                  <div className="space-y-4">
                    {/* MATERIAL & MÁQUINA */}
                    {editingSection === 'material-machine' ? (
                      <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
                        {renderSectionContent(true)}
                        <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                          <button
                            onClick={() => setEditingSection(null)}
                            className="flex-1 px-6 py-2 bg-slate-300 text-foreground font-semibold rounded-lg hover:bg-slate-400 transition-colors"
                          >
                            ✕ Fechar
                          </button>
                          <button
                            onClick={() => materialMachineFormRef.current?.submit()}
                            className="flex-1 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                          >
                            ✅ Salvar
                          </button>
                        </div>
                      </div>
                    ) : material && machine ? (
                      <SectionSummaryCard
                        sectionTitle="Material & Máquina"
                        sectionIcon="⚙️"
                        items={[
                          { label: 'Material', value: `${material.brand} ${material.model}`.trim() },
                          { label: 'Máquina', value: `${machine.brand} ${machine.model}`.trim() },
                        ]}
                        isComplete={completedSections.has('material-machine') || !!(material && machine)}
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

                    {/* AMOSTRA - Aparece após Material & Máquina */}
                    {completedSections.has('material-machine') && (
                      editingSection === 'sample' ? (
                        <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
                          {renderSectionContent(true)}
                          <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                            <button
                              onClick={() => setEditingSection(null)}
                              className="flex-1 px-6 py-2 bg-slate-300 text-foreground font-semibold rounded-lg hover:bg-slate-400 transition-colors"
                            >
                              ✕ Fechar
                            </button>
                            <button
                              onClick={() => sampleFormRef.current?.submit()}
                              className="flex-1 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
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
                          isComplete={completedSections.has('sample') || !!sample}
                          onEdit={() => handleSectionEdit('sample')}
                        />
                      ) : (
                        <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 bg-blue-50 cursor-pointer hover:bg-blue-100 transition-colors" onClick={() => handleSectionEdit('sample')}>
                          <div className="flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-lg font-semibold text-blue-900">🧪 Amostra</p>
                              <p className="text-sm text-blue-700 mt-2">Clique para adicionar as informações</p>
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {/* INFILL - Aparece após Sample */}
                    {completedSections.has('sample') && (
                      editingSection === 'infill' ? (
                        <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
                          {renderSectionContent(true)}
                          <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                            <button
                              onClick={() => setEditingSection(null)}
                              className="flex-1 px-6 py-2 bg-slate-300 text-foreground font-semibold rounded-lg hover:bg-slate-400 transition-colors"
                            >
                              ✕ Fechar
                            </button>
                            <button
                              onClick={async () => {
                                if (infillPendingData.length === 0) {
                                  setValidationAttempts((prev) => new Set(prev).add('infill'))
                                  return
                                }
                                
                                // ✅ Validar que todos os infills têm hu_mean válido
                                const invalidItems = infillPendingData.filter((item: any) => 
                                  !item.hu_mean || item.hu_mean <= 0
                                )
                                
                                if (invalidItems.length > 0) {
                                  const invalidList = invalidItems
                                    .map((item: any) => `${item.pattern_type} ${item.infill_pct}%`)
                                    .join(', ')
                                  alert(`❌ HU Mean é obrigatório e deve ser > 0 para:\n${invalidList}\n\nPreencha todos os valores antes de salvar.`)
                                  setValidationAttempts((prev) => new Set(prev).add('infill'))
                                  return
                                }
                                
                                try {
                                  const itemsToUpdate = infillPendingData.filter((item: any) => item.id)
                                  const itemsToCreate = infillPendingData.filter((item: any) => !item.id)
                                  
                                  for (const item of itemsToUpdate) {
                                    await updateInfill(item.id, item)
                                  }
                                  if (itemsToCreate.length > 0) {
                                    await addInfill(sample!.id, itemsToCreate)
                                  }
                                  setInfillPendingData([])
                                  handleSectionComplete('infill')
                                  setEditingSection(null)
                                } catch (err) {
                                  logger.error('ExperimentWizard', err instanceof Error ? err.message : 'Unknown error')
                                  setValidationAttempts((prev) => new Set(prev).add('infill'))
                                }
                              }}
                              className="flex-1 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
                            >
                              ✅ Salvar
                            </button>
                          </div>
                        </div>
                      ) : infillData?.length > 0 ? (
                        <SectionSummaryCard
                          sectionTitle="Infill"
                          sectionIcon="📊"
                          items={[
                            { label: 'Medições', value: infillData.length },
                            {
                              label: 'Percentual Médio',
                              value: `${(
                                infillData.reduce(
                                  (sum, d) => sum + (Number(d.infill_pct ?? d.infill_percentage) || 0),
                                  0
                                ) / infillData.length
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
                              <p className="text-sm text-blue-700 mt-2">Clique para adicionar as informações</p>
                            </div>
                          </div>
                        </div>
                      )
                    )}

                    {/* OPCIONAIS - Propriedades Mecânicas, Atenuação, Feixes */}
                    {completedSections.has('infill') && (
                      <div className="space-y-4">
                        {/* PROPRIEDADES MECÂNICAS - Card Opcional */}
                        {editingSection === 'mechanical' ? (
                          <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
                            {renderSectionContent(true)}
                            <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                              <button
                                onClick={() => setEditingSection(null)}
                                className="flex-1 px-6 py-2 bg-slate-300 text-foreground font-semibold rounded-lg hover:bg-slate-400 transition-colors"
                              >
                                ✕ Fechar
                              </button>
                              <button
                                onClick={() => mechanicalFormRef.current?.submit()}
                                className="flex-1 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
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

                        {/* ATENUAÇÃO - Card Opcional */}
                        {editingSection === 'attenuation' ? (
                          <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
                            {renderSectionContent(true)}
                            <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                              <button
                                onClick={() => setEditingSection(null)}
                                className="flex-1 px-6 py-2 bg-slate-300 text-foreground font-semibold rounded-lg hover:bg-slate-400 transition-colors"
                              >
                                ✕ Fechar
                              </button>
                              <button
                                onClick={() => attenuationFormRef.current?.submit()}
                                className="flex-1 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
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

                        {/* FEIXES - Card Opcional */}
                        {editingSection === 'beam' ? (
                          <div className="border-2 border-blue-400 rounded-lg p-6 bg-blue-50">
                            {renderSectionContent(true)}
                            <div className="flex gap-3 mt-8 pt-6 border-t border-blue-200">
                              <button
                                onClick={() => setEditingSection(null)}
                                className="flex-1 px-6 py-2 bg-slate-300 text-foreground font-semibold rounded-lg hover:bg-slate-400 transition-colors"
                              >
                                ✕ Fechar
                              </button>
                              <button
                                onClick={() => beamFormRef.current?.submit()}
                                className="flex-1 px-6 py-2 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors"
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
                    )}

                    {/* Botão para Finalizar - visível após Infill estar completo */}
                    {editingSection === null && completedSections.has('infill') && (
                      <div className="flex justify-end gap-3 pt-6 border-t mt-8">
                        <button
                          onClick={() => setShowFinalizationModal(true)}
                          className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-hover transition-colors flex items-center gap-2"
                        >
                          ✅ Finalizar Cadastro de Novo Experimento
                        </button>
                      </div>
                    )}
                  </div>
                )}
            </div>
          </div>
        </div>

        {/* Important Notes */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Info className="w-5 h-5" />
            {t('experimentWizardNew.importantInformation.title')}
          </h3>
          <ul className="text-sm text-blue-900 space-y-2">
            <li>✓ {t('experimentWizardNew.importantInformation.mandatory')}</li>
            <li>✓ {t('experimentWizardNew.importantInformation.optional')}</li>
            <li>✓ {t('experimentWizardNew.importantInformation.editable')}</li>
            <li>✓ {t('experimentWizardNew.importantInformation.review')}</li>
            <li>✓ {t('experimentWizardNew.importantInformation.editLater')}</li>
          </ul>
        </div>

        {/* Finalization Confirmation Modal */}
        <FinalizationConfirmationModal
          isOpen={showFinalizationModal}
          isLoading={isLoading}

          onConfirm={handleFinalizationConfirm}
          onCancel={() => setShowFinalizationModal(false)}
        />
      </div>
    </div>
  )
}
