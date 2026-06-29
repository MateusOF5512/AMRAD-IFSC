'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ExperimentWizard from '@/components/experiments/ExperimentWizard'

/**
 * ExperimentPageContent - NOVO CADASTRO APENAS
 * Para edição, use: /experiments/edit/{id}
 * 
 * Responsabilidades:
 * - Autenticação
 * - Renderizar ExperimentWizard em modo "novo"
 * - Sem suporte a ?edit parameter
 */
export default function ExperimentPageContent() {
  const router = useRouter()
  const [isCheckingAuth, setIsCheckingAuth] = useState(true)

  useEffect(() => {
    // Verificar se está autenticado (verifica localStorage)
    const userData = localStorage.getItem('user')
    
    if (!userData) {
      // Não está autenticado, redireciona para login
      router.push('/login')
      return
    }
    
    setIsCheckingAuth(false)
  }, [router])

  if (isCheckingAuth) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-600">Verificando autenticação...</div>
      </div>
    )
  }

  return (
    <ExperimentWizard />
  )
}
