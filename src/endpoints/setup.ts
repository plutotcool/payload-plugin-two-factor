import type { CollectionSlug, PayloadHandler } from 'payload'
import QRCode from 'qrcode'

import { createTOTPService } from '../lib/totp'
import type { TwoFactorCustomConfig, UserWith2FA } from '../types'

/**
 * Factory for POST /api/two-factor/setup
 * Generates a new TOTP secret + QR code and stores it as pending on the user.
 */
export function createSetupHandler(
  pluginConfig: TwoFactorCustomConfig,
): PayloadHandler {
  return async (req) => {
    try {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const user = req.user as UserWith2FA
      const totp = createTOTPService(pluginConfig.encryptionKey)

      const secret = totp.generateSecret()
      const uri = totp.getAuthUri(user.email, pluginConfig.issuer, secret)
      const encryptedSecret = totp.encryptSecret(secret)
      const qrMarkup = await QRCode.toString(uri, {
        type: 'svg',
        margin: 2,
        color: { dark: '#000000', light: '#ffffff' },
      })
      const qrCode = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(qrMarkup)}`

      await req.payload.update({
        collection: pluginConfig.collection as CollectionSlug,
        id: req.user.id,
        data: { twoFactorPending: encryptedSecret } as Record<string, unknown>,
      })

      return Response.json({ secret, qrCode })
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: '[payload-two-factor] setup handler error',
      })
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
