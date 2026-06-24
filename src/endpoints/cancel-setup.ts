import type { CollectionSlug, PayloadHandler } from 'payload'

import type { TwoFactorCustomConfig } from '../types'

/**
 * Factory for POST /api/two-factor/cancel-setup
 * Clears the pending 2FA setup for the authenticated user.
 */
export function createCancelSetupHandler(
  pluginConfig: TwoFactorCustomConfig,
): PayloadHandler {
  return async (req) => {
    try {
      if (!req.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 })
      }

      await req.payload.update({
        collection: pluginConfig.collection as CollectionSlug,
        id: req.user.id,
        data: { twoFactorPending: null } as Record<string, unknown>,
      })

      return Response.json({ success: true })
    } catch (error) {
      req.payload.logger.error({
        err: error,
        msg: '[payload-two-factor] cancel-setup handler error',
      })
      return Response.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
