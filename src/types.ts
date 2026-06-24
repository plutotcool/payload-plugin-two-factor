export type TwoFactorPluginOptions = {
  /**
   * Collection name where the 2FA fields and endpoints will be injected.
   * @default 'users'
   */
  collection?: string

  /**
   * Name of the 2FA issuer to display in the authenticator app (e.g. Google Authenticator).
   * Example: 'Mon CMS', 'Acme Admin'
   */
  issuer: string

  /**
   * AES-256-GCM key to encrypt TOTP secrets stored in the database.
   * Must be a 64-character hex string (32 bytes). Generate with: `openssl rand -hex 32`
   */
  encryptionKey: string

  /** Advanced TOTP options */
  totp?: {
    /**
     * Number of tolerance steps before and after the current step.
     * Allows for slight clock drift.
     * @default 1
     */
    window?: number
  }

  /**
   * When `true`, the plugin still injects its fields (so the database schema
   * stays consistent) but skips registering endpoints. Lets you toggle 2FA
   * off via env without uninstalling or triggering a schema migration.
   * @default false
   */
  disabled?: boolean
}

export type TwoFactorCustomConfig = Required<
  Omit<TwoFactorPluginOptions, 'totp' | 'disabled'>
> & {
  totp: Required<NonNullable<TwoFactorPluginOptions['totp']>>
}

/**
 * Shape stored in `config.custom.twoFactor` (client-safe, no secrets).
 * The full config with encryptionKey is only available in endpoint handlers via closure.
 */
export type TwoFactorCollectionConfig = {
  collection: string
}

export type UserWith2FA = {
  id: string | number
  email: string
  twoFactorSecret?: string | null
  twoFactorEnabled?: boolean | null
  twoFactorPending?: string | null
}
