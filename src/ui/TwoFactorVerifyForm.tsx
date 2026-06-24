'use client'

import { useState, type ChangeEvent, type SubmitEventHandler } from 'react'
import { useRouter } from 'next/navigation'
import { useConfig, useTranslation } from '@payloadcms/ui'
import { PayloadLogo } from '@payloadcms/ui/shared'

import type {
  PluginTwoFactorTranslationKeys,
  PluginTwoFactorTranslations,
} from '../translations'

import './index.scss'

interface TwoFactorVerifyFormProps {
  redirectTo: string
  logo?: React.ReactNode
}

export function TwoFactorVerifyForm({
  redirectTo,
  logo,
}: TwoFactorVerifyFormProps) {
  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig()
  const router = useRouter()
  const { t } = useTranslation<
    PluginTwoFactorTranslations,
    PluginTwoFactorTranslationKeys
  >()

  const [token, setToken] = useState('')
  const [error, setError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  const onTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  const onSubmit: SubmitEventHandler<HTMLFormElement> = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(undefined)
    try {
      const res = await fetch(`${apiRoute}/two-factor/verify-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      })
      const data = (await res.json()) as { error?: string; success?: boolean }
      if (data.error) {
        setError(data.error)
        return
      }
      router.replace(redirectTo)
    } catch {
      setError(t('plugin-two-factor:error'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <section className="login template-minimal template-minimal--width-normal">
      <div className="template-minimal__wrap">
        <div className="login__brand">{logo ?? <PayloadLogo />}</div>

        <form onSubmit={onSubmit} className="login__form form" noValidate>
          {error && <div className="payload-two-factor__error">{error}</div>}

          <div className="login__form__inputWrap">
            <div className="field-type text payload-two-factor__field-wrap">
              <label className="field-label" htmlFor="token">
                {t('plugin-two-factor:verificationCode')}
                <span className="required">*</span>
              </label>

              <div className="field-type__wrap">
                <input
                  id="token"
                  name="token"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="000 000"
                  maxLength={6}
                  required
                  autoFocus
                  value={token}
                  onChange={onTokenChange}
                  className="payload-two-factor__token-input"
                />
              </div>
            </div>
          </div>

          <div className="form-submit">
            <button
              type="submit"
              disabled={isLoading}
              className="btn btn--icon-style-without-border btn--size-large btn--style-primary btn--withoutPopup"
            >
              <span className="btn__content">
                <span className="btn__label">
                  {isLoading
                    ? t('plugin-two-factor:verifying')
                    : t('plugin-two-factor:verifyAndLogin')}
                </span>
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
