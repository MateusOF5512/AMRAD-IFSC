/**
 * Minimal client-side logger.
 * - debug: dev-only, string messages only (never pass API responses or PII)
 * - warn/error: production-safe, message strings only
 */

const isDev = process.env.NODE_ENV === 'development'

function toMessage(value: unknown): string {
  if (typeof value === 'string') return value
  if (value instanceof Error) return value.message
  return 'Unknown error'
}

export const logger = {
  debug(scope: string, message?: string): void {
    if (!isDev) return
    console.debug(message ? `[${scope}] ${message}` : `[${scope}]`)
  },

  warn(scope: string, message: string): void {
    console.warn(`[${scope}] ${message}`)
  },

  error(scope: string, message: unknown): void {
    console.error(`[${scope}] ${toMessage(message)}`)
  },
}
