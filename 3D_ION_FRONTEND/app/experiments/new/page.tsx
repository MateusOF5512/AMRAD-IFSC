'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import ExperimentPageContent from './ExperimentPageContent'

function LoadingSpinner() {
  return (
    <div className="flex h-64 items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

export default function NewExperimentPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <Suspense fallback={<LoadingSpinner />}>
        <ExperimentPageContent />
      </Suspense>
    </div>
  )
}
