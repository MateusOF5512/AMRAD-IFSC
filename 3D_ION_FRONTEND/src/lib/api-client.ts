/**
 * Fetch wrapper para chamadas à API no browser e no servidor Next.js.
 * Em desenvolvimento com HTTPS self-signed, usa agente Node apenas no servidor.
 */

import { logger } from './logger'
import { getPublicEnv } from './public-env'

interface FetchOptions extends RequestInit {
  timeout?: number
}

function isDevHttps(url: string): boolean {
  const base = getPublicEnv().apiUrl
  return (
    process.env.NODE_ENV === 'development' &&
    url.startsWith('https://') &&
    (base.startsWith('https://') ||
      base.includes('localhost') ||
      base.includes('127.0.0.1'))
  )
}

/**
 * Mensagem amigável para erros de rede comuns no wizard/formulários.
 */
export function formatFetchError(error: unknown, apiUrl?: string): string {
  const base = apiUrl || getPublicEnv().apiUrl

  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase()
    if (msg.includes('failed to fetch') || msg.includes('network')) {
      return (
        `Não foi possível conectar ao servidor da API (${base}). ` +
        'Confirme que o backend está rodando e que NEXT_PUBLIC_API_URL está correto no .env da raiz do projeto.'
      )
    }
  }

  if (error instanceof Error) return error.message
  return 'Erro de comunicação com o servidor'
}

export async function fetchWithAgent(
  url: string,
  options: FetchOptions = {}
): Promise<Response> {
  try {
    if (typeof window === 'undefined' && isDevHttps(url)) {
      const https = await import('https')
      const httpsAgent = new https.Agent({
        rejectUnauthorized: false,
        keepAlive: true,
      })

      return fetch(url, {
        ...options,
        // @ts-expect-error — agent suportado no fetch do Node 18+
        agent: httpsAgent,
      })
    }

    return fetch(url, options)
  } catch (error) {
    logger.error('fetch', formatFetchError(error))
    throw new Error(formatFetchError(error))
  }
}

export function createApiHeaders(): HeadersInit {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
}

export async function apiCall<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithAgent(url, {
    headers: createApiHeaders(),
    ...options,
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: `HTTP ${response.status}` }))
    const errorMessage =
      errorData?.detail || `HTTP ${response.status}: ${response.statusText}`
    throw new Error(errorMessage)
  }

  return response.json() as Promise<T>
}
