'use client'

import ExperimentWizard from '@/components/experiments/ExperimentWizard'
import { useResearcherWriteProtection } from '@/lib/hooks/useResearcherWriteProtection'

/**
 * ExperimentPageContent - NOVO CADASTRO APENAS
 * Para edição, use: /experiments/edit/{id}
 */
export default function ExperimentPageContent() {
  const user = useResearcherWriteProtection()

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-muted">Verificando permissões...</div>
      </div>
    )
  }

  return <ExperimentWizard />
}
