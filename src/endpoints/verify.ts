import type { CollectionSlug, PayloadHandler } from 'payload'

import { createTOTPService } from '../lib/totp'
import type { TwoFactorCustomConfig, UserWith2FA } from '../types'

/**
 * Factory for POST /api/two-factor/verify
 * Enables or disables 2FA for the authenticated user after verifying a TOTP token.
 * Body: { token: string, action: 'enable' | 'disable' }
 */
export function createVerifyHandler(
  pluginConfig: TwoFactorCustomConfig,
): PayloadHandler {
  return async (req) => {
    try {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const body = ((await req.json?.()) ?? {}) as {
        token?: unknown
        action?: unknown
      }
      const { token, action } = body

      if (!token || typeof token !== 'string' || !/^\d{6}$/.test(token)) {
        return Response.json(
          { error: 'Please enter a valid 6-digit code' },
          { status: 400 },
        )
      }

      if (action !== 'enable' && action !== 'disable') {
        return Response.json({ error: 'Invalid action' }, { status: 400 })
      }

      const totp = createTOTPService(pluginConfig.encryptionKey)
      const totpWindow = pluginConfig.totp.window
      const user = req.user as UserWith2FA

      if (action === 'enable') {
        const encryptedPending = user.twoFactorPending

        if (!encryptedPending) {
          return Response.json(
            {
              error: 'No pending 2FA setup. Please generate a new code first.',
            },
            { status: 400 },
          )
        }

        const secret = totp.decryptSecret(encryptedPending)

        if (!totp.verify(token, secret, totpWindow)) {
          return Response.json(
            { error: 'Invalid verification code' },
            { status: 400 },
          )
        }

        await req.payload.update({
          collection: pluginConfig.collection as CollectionSlug,
          id: req.user.id,
          data: {
            twoFactorEnabled: true,
            twoFactorSecret: encryptedPending,
            twoFactorPending: null,
          } as Record<string, unknown>,
          overrideAccess: true,
        })

        return Response.json({ success: true })
      }

      // action === 'disable'
      const encryptedSecret = user.twoFactorSecret

      if (!encryptedSecret) {
        return Response.json({ error: '2FA is not enabled' }, { status: 400 })
      }

      const secret = totp.decryptSecret(encryptedSecret)

      if (!totp.verify(token, secret, totpWindow)) {
        return Response.json(
          { error: 'Invalid verification code' },
          { status: 400 },
        )
      }

      await req.payload.update({
        collection: pluginConfig.collection as CollectionSlug,
        id: req.user.id,
        data: {
          twoFactorEnabled: false,
          twoFactorSecret: null,
        } as Record<string, unknown>,
        overrideAccess: true,
      })

      return Response.json({ success: true })
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: '[payload-two-factor] verify handler error',
      })
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
