'use client'

import { useFormFields, useTranslation } from '@payloadcms/ui'

import type {
  PluginTwoFactorTranslationKeys,
  PluginTwoFactorTranslations,
} from '../../translations'
import { TwoFactorForm } from '../../ui/TwoFactorForm'

import './TwoFactorFieldComponent.scss'

export function TwoFactorFieldComponent() {
  const { t } = useTranslation<
    PluginTwoFactorTranslations,
    PluginTwoFactorTranslationKeys
  >()

  const twoFactorEnabledField = useFormFields(
    ([fields]) => fields.twoFactorEnabled,
  )
  const twoFactorPendingField = useFormFields(
    ([fields]) => fields.twoFactorPending,
  )

  const twoFactorEnabled = (twoFactorEnabledField?.value as boolean) ?? false
  const twoFactorPending =
    (twoFactorPendingField?.value as string | null) ?? null

  return (
    <div>
      <h2 className="payload-two-factor__section-title">
        {t('plugin-two-factor:security')}
      </h2>

      {twoFactorPending && (
        <div className="payload-two-factor__status payload-two-factor__status--pending">
          {t('plugin-two-factor:pendingSetup')}
        </div>
      )}

      {twoFactorEnabled && (
        <div className="payload-two-factor__status payload-two-factor__status--enabled">
          {t('plugin-two-factor:alreadyEnabled')}
        </div>
      )}

      <TwoFactorForm twoFactorEnabled={twoFactorEnabled} />
    </div>
  )
}
