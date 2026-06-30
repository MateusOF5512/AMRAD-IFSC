'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { useResearcherWriteProtection } from '@/lib/hooks/useResearcherWriteProtection'

export default function NovoExperimentoRedirectPage() {
  const router = useRouter()
  const user = useResearcherWriteProtection()

  useEffect(() => {
    if (!user) return
    router.push('/experiments/new')
  }, [router, user])

  return (
    <div className="flex h-screen items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}
