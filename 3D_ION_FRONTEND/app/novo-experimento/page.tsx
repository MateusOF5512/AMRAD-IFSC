'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'

export default function NovoExperimentoRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    // Redirecionar para /experiments/new
    router.push('/experiments/new')
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-green-600" />
    </div>
  )
}
