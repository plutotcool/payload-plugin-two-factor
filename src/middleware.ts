import { NextResponse, type NextRequest } from 'next/server'
import { decodeJwt } from 'jose'

import { isVerifiedCookieValid, TWO_FACTOR_VERIFIED_COOKIE } from './lib/cookie'

interface WithTwoFactorProxyOptions {
  /** Where to redirect un-verified admin page requests. @default '/admin/verify' */
  verifyPath: string
}

const LOGIN_PATH = '/admin/login'

/**
 * Returns a Next.js middleware handler that protects `/admin` page navigation
 * by redirecting to the verify page when the user has 2FA enabled but has not
 * yet completed verification for this session.
 *
 * @example
 * // src/middleware.ts
 * export const middleware = withTwoFactorMiddleware()
 * export const config = { matcher: ['/admin/:path*'] }
 */
export function withTwoFactorMiddleware({
  verifyPath = '/admin/verify',
}: Partial<WithTwoFactorProxyOptions> = {}) {
  return async function proxy(request: NextRequest) {
    const { pathname } = request.nextUrl
    const payloadToken = request.cookies.get('payload-token')?.value

    // The verify page itself must stay reachable for any authenticated session.
    if (pathname === verifyPath) {
      if (!payloadToken) {
        return NextResponse.redirect(new URL(LOGIN_PATH, request.url))
      }
      return NextResponse.next()
    }

    const isProtectedPage =
      pathname.startsWith('/admin') && !pathname.startsWith(LOGIN_PATH)

    if (!payloadToken || !isProtectedPage || request.method !== 'GET') {
      return NextResponse.next()
    }

    let claims: Record<string, unknown>
    try {
      claims = await decodeJwt(payloadToken)
    } catch {
      // Invalid / expired JWT — let Payload handle authentication.
      return NextResponse.next()
    }

    // 2FA not enabled for this account → nothing to enforce.
    if (claims.twoFactorEnabled !== true) {
      return NextResponse.next()
    }

    const verifiedCookie = request.cookies.get(
      TWO_FACTOR_VERIFIED_COOKIE,
    )?.value
    const verified = await isVerifiedCookieValid(
      verifiedCookie,
      String(claims.id),
      payloadToken,
      process.env.PAYLOAD_SECRET!,
    )

    if (verified) {
      return NextResponse.next()
    }

    const verifyUrl = new URL(verifyPath, request.url)
    verifyUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(verifyUrl)
  }
}
