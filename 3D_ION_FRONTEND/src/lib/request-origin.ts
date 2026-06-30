import { NEXT_PUBLIC_SITE_URL } from '@/lib/env.generated'

/**
 * Public origin for server-side redirects behind reverse proxies (e.g. Render).
 * Internal requests often arrive as http://localhost:10000 — not the public URL.
 */
export function getRequestOrigin(request: Request): string {
  const configured = NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '')
  if (configured) return configured

  const forwardedHost = request.headers.get('x-forwarded-host')
  if (forwardedHost) {
    const host = forwardedHost.split(',')[0].trim()
    const proto = (request.headers.get('x-forwarded-proto') ?? 'https')
      .split(',')[0]
      .trim()
    return `${proto}://${host}`
  }

  return new URL(request.url).origin
}
