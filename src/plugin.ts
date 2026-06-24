import type { Config, Plugin } from 'payload'
import { deepMergeSimple } from 'payload/shared'

import { buildTwoFactorFields } from './fields/two-factor'

import { createCheckHandler } from './endpoints/check'
import { createSetupHandler } from './endpoints/setup'
import { createVerifyHandler } from './endpoints/verify'
import { createVerifyLoginHandler } from './endpoints/verify-login'
import { createCancelSetupHandler } from './endpoints/cancel-setup'

import { en, fr } from './translations'

import type { TwoFactorCustomConfig, TwoFactorPluginOptions } from './types'

export function twoFactorPlugin(options: TwoFactorPluginOptions): Plugin {
  const { collection = 'users', issuer, encryptionKey, totp, disabled } = options

  const pluginConfig: TwoFactorCustomConfig = {
    collection,
    issuer,
    encryptionKey,
    totp: {
      window: totp?.window ?? 1,
    },
  }

  return (incomingConfig: Config): Config => {
    // Inject fields into the specified collection.
    // Fields are added even when the plugin is disabled so the database schema
    // stays consistent — toggling `disabled` never triggers a migration.
    const collections = (incomingConfig.collections ?? []).map((col) => {
      if (col.slug !== collection) return col
      return {
        ...col,
        fields: [...col.fields, ...buildTwoFactorFields()],
      }
    })

    // Store only non-sensitive config in config.custom (no encryptionKey)
    const custom: Record<string, unknown> = {
      ...(incomingConfig.custom ?? {}),
      twoFactor: { collection },
    }

    // Merge plugin i18n translations into the config
    const existingTranslations = incomingConfig.i18n?.translations ?? {}
    const i18n: Config['i18n'] = {
      ...incomingConfig.i18n,
      translations: {
        ...existingTranslations,
        en: deepMergeSimple(
          en,
          (existingTranslations.en ?? {}) as object,
        ) as object,
        fr: deepMergeSimple(
          fr,
          (existingTranslations.fr ?? {}) as object,
        ) as object,
      },
    }

    const config: Config = {
      ...incomingConfig,
      collections,
      custom,
      i18n,
    }

    // When disabled, keep the schema changes but skip the runtime behaviour
    // (endpoints). The plugin becomes a no-op without being uninstalled.
    if (disabled) {
      return config
    }

    // Register root-level endpoints — accessible at /api/two-factor/*
    // Handlers capture pluginConfig (incl. encryptionKey) via closure — never exposed to the client.
    config.endpoints = [
      ...(incomingConfig.endpoints ?? []),
      {
        path: '/two-factor/check',
        method: 'get' as const,
        handler: createCheckHandler(pluginConfig),
      },
      {
        path: '/two-factor/setup',
        method: 'post' as const,
        handler: createSetupHandler(pluginConfig),
      },
      {
        path: '/two-factor/verify',
        method: 'post' as const,
        handler: createVerifyHandler(pluginConfig),
      },
      {
        path: '/two-factor/verify-login',
        method: 'post' as const,
        handler: createVerifyLoginHandler(pluginConfig),
      },
      {
        path: '/two-factor/cancel-setup',
        method: 'post' as const,
        handler: createCancelSetupHandler(pluginConfig),
      },
    ]

    return config
  }
}
