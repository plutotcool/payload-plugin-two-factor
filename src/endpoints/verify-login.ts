import { parseCookies, type PayloadHandler } from 'payload'

import { createTOTPService } from '../lib/totp'
import { computeVerifiedValue, TWO_FACTOR_VERIFIED_COOKIE } from '../lib/cookie'

import type { TwoFactorCustomConfig, UserWith2FA } from '../types'

/**
 * Factory for POST /api/two-factor/verify-login
 * Verifies a TOTP token at login time and sets the two-factor-verified session cookie.
 * Body: { token: string }
 */
export function createVerifyLoginHandler(
  pluginConfig: TwoFactorCustomConfig,
): PayloadHandler {
  return async (req) => {
    try {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = ((await req.json?.()) ?? {}) as { token?: unknown }
      const { token } = body

      if (!token || typeof token !== 'string' || !/^\d{6}$/.test(token)) {
        return Response.json(
          { error: 'Please enter a valid 6-digit code' },
          { status: 400 },
        )
      }

      const cookies = parseCookies(req.headers)
      const payloadToken = cookies.get('payload-token')

      if (!payloadToken) {
        return Response.json(
          { error: 'Session expired. Please login again.' },
          { status: 401 },
        )
      }

      const totp = createTOTPService(pluginConfig.encryptionKey)
      const user = req.user as UserWith2FA
      const encryptedSecret = user.twoFactorSecret

      if (!encryptedSecret) {
        return Response.json(
          { error: '2FA is not configured for this account.' },
          { status: 400 },
        )
      }

      const secret = totp.decryptSecret(encryptedSecret)

      if (!totp.verify(token, secret, pluginConfig.totp.window)) {
        return Response.json(
          { error: 'Invalid verification code.' },
          { status: 400 },
        )
      }

      const cookieValue = await computeVerifiedValue(
        req.user.id.toString(),
        payloadToken,
        req.payload.config.secret,
      )
      const isProduction = process.env.NODE_ENV === 'production'

      const cookieParts = [
        `${TWO_FACTOR_VERIFIED_COOKIE}=${cookieValue}`,
        'Path=/',
        'HttpOnly',
        'SameSite=Lax',
      ]
      if (isProduction) cookieParts.push('Secure')

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Set-Cookie': cookieParts.join('; '),
        },
      })
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: '[payload-two-factor] verify-login handler error',
      })
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
