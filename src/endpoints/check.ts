import { parseCookies, type PayloadHandler } from 'payload'

import {
  isVerifiedCookieValid,
  TWO_FACTOR_VERIFIED_COOKIE,
} from '../lib/cookie'
import type { TwoFactorCustomConfig, UserWith2FA } from '../types'

/**
 * Factory for GET /api/two-factor/check
 * Returns whether the authenticated user needs to complete 2FA verification.
 */
export function createCheckHandler(
  _pluginConfig: TwoFactorCustomConfig,
): PayloadHandler {
  return async (req) => {
    try {
      if (!req.user) {
        return Response.json({ requires2FA: false, enabled: false })
      }

      const user = req.user as UserWith2FA
      const cookies = parseCookies(req.headers)

      const payloadToken = cookies.get('payload-token')
      const verifiedCookie = cookies.get(TWO_FACTOR_VERIFIED_COOKIE)

      if (!payloadToken) {
        return Response.json({ requires2FA: false, enabled: false })
      }

      const twoFactorEnabled = user.twoFactorEnabled ?? false
      const isVerified = await isVerifiedCookieValid(
        verifiedCookie,
        String(user.id),
        payloadToken,
        req.payload.config.secret,
      )
      const requires2FA = twoFactorEnabled === true && !isVerified

      return Response.json({
        requires2FA,
        enabled: twoFactorEnabled,
        verified: isVerified,
      })
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: '[payload-two-factor] check handler error',
      })
      return Response.json({ requires2FA: false, enabled: false })
    }
  }
}
