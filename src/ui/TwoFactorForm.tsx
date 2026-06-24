'use client'

import { useState, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Button, useConfig, useTranslation } from '@payloadcms/ui'

import type {
  PluginTwoFactorTranslationKeys,
  PluginTwoFactorTranslations,
} from '../translations'

import './index.scss'

type TwoFactorMode = 'idle' | 'setup' | 'disable'

type SetupData = {
  secret: string
  qrCode: string
}

function TokenField({
  value,
  onChange,
}: {
  value: string
  onChange: (e: ChangeEvent<HTMLInputElement>) => void
}) {
  const { t } = useTranslation<
    PluginTwoFactorTranslations,
    PluginTwoFactorTranslationKeys
  >()

  return (
    <div className="field-type text">
      <label className="field-label" htmlFor="token">
        {t('plugin-two-factor:verificationCode')}
      </label>
      <div className="field-type__wrap">
        <input
          id="token"
          name="token"
          type="text"
          inputMode="numeric"
          value={value}
          onChange={onChange}
          placeholder="000000"
          maxLength={6}
          className="payload-two-factor__token-input"
        />
      </div>
    </div>
  )
}

function ErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  return <div className="payload-two-factor__error">{message}</div>
}

interface TwoFactorFormProps {
  twoFactorEnabled: boolean
}

export function TwoFactorForm({ twoFactorEnabled }: TwoFactorFormProps) {
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

  const [mode, setMode] = useState<TwoFactorMode>('idle')
  const [token, setToken] = useState('')
  const [setupData, setSetupData] = useState<SetupData | null>(null)
  const [error, setError] = useState<string | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  const onTokenChange = (e: ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value.replace(/\D/g, '').slice(0, 6))
  }

  const onSetup = async () => {
    setIsLoading(true)
    setError(undefined)
    try {
      const res = await fetch(`${apiRoute}/two-factor/setup`, {
        method: 'POST',
      })
      const data = (await res.json()) as {
        error?: string
        secret?: string
        qrCode?: string
      }
      if (data.error) {
        setError(data.error)
        return
      }
      setSetupData({ secret: data.secret!, qrCode: data.qrCode! })
      setMode('setup')
    } catch {
      setError(t('plugin-two-factor:error'))
    } finally {
      setIsLoading(false)
    }
  }

  const onVerifySetup = async () => {
    setIsLoading(true)
    setError(undefined)
    try {
      const res = await fetch(`${apiRoute}/two-factor/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'enable' }),
      })
      const data = (await res.json()) as { error?: string; success?: boolean }
      if (data.error) {
        setError(data.error)
        return
      }
      setMode('idle')
      setToken('')
      setSetupData(null)
      router.refresh()
    } catch {
      setError(t('plugin-two-factor:error'))
    } finally {
      setIsLoading(false)
    }
  }

  const onDisable = async () => {
    setIsLoading(true)
    setError(undefined)
    try {
      const res = await fetch(`${apiRoute}/two-factor/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, action: 'disable' }),
      })
      const data = (await res.json()) as { error?: string; success?: boolean }
      if (data.error) {
        setError(data.error)
        return
      }
      setMode('idle')
      setToken('')
      router.refresh()
    } catch {
      setError(t('plugin-two-factor:error'))
    } finally {
      setIsLoading(false)
    }
  }

  const onCancelSetup = async () => {
    setIsLoading(true)
    try {
      await fetch(`${apiRoute}/two-factor/cancel-setup`, { method: 'POST' })
    } finally {
      setMode('idle')
      setToken('')
      setSetupData(null)
      setIsLoading(false)
    }
  }

  if (mode === 'setup' && setupData) {
    return (
      <div className="auth-fields collection-edit__auth">
        <h3>{t('plugin-two-factor:scanQrTitle')}</h3>
        <p className="field-description">
          {t('plugin-two-factor:scanQrDescription')}
        </p>

        <div className="payload-two-factor__qr-code">
          <img src={setupData.qrCode} alt="2FA QR Code" />
        </div>

        <div className="field-type text">
          <label className="field-label">
            {t('plugin-two-factor:manualEntryCode')}
          </label>
          <code className="payload-two-factor__secret-code">
            {setupData.secret}
          </code>
        </div>

        <TokenField value={token} onChange={onTokenChange} />
        <ErrorMessage message={error} />

        <div className="payload-two-factor__actions">
          <Button
            type="button"
            buttonStyle="primary"
            onClick={onVerifySetup}
            disabled={isLoading}>
            {isLoading
              ? t('plugin-two-factor:verifying')
              : t('plugin-two-factor:enableConfirm')}
          </Button>
          <Button
            type="button"
            buttonStyle="secondary"
            onClick={onCancelSetup}
            disabled={isLoading}>
            {t('plugin-two-factor:cancel')}
          </Button>
        </div>
      </div>
    )
  }

  if (mode === 'disable') {
    return (
      <div className="auth-fields collection-edit__auth">
        <h3>{t('plugin-two-factor:disableTitle')}</h3>
        <p className="field-description">
          {t('plugin-two-factor:disableDescription')}
        </p>

        <TokenField value={token} onChange={onTokenChange} />
        <ErrorMessage message={error} />

        <div className="payload-two-factor__actions">
          <Button
            type="button"
            buttonStyle="primary"
            onClick={onDisable}
            disabled={isLoading}>
            {isLoading
              ? t('plugin-two-factor:verifying')
              : t('plugin-two-factor:disableConfirm')}
          </Button>
          <Button
            type="button"
            buttonStyle="secondary"
            onClick={() => {
              setMode('idle')
              setToken('')
            }}
            disabled={isLoading}>
            {t('plugin-two-factor:cancel')}
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-fields collection-edit__auth">
      <h3>{t('plugin-two-factor:title')}</h3>
      <p className="field-description">{t('plugin-two-factor:description')}</p>

      <ErrorMessage message={error} />

      {twoFactorEnabled ? (
        <div className="payload-two-factor__enabled-status">
          <span className="payload-two-factor__enabled-label">
            {t('plugin-two-factor:enabledStatus')}
          </span>
          <Button
            type="button"
            buttonStyle="secondary"
            onClick={() => {
              setMode('disable')
              setToken('')
            }}
            disabled={isLoading}>
            {t('plugin-two-factor:disableButton')}
          </Button>
        </div>
      ) : (
        <div className="payload-two-factor__actions">
          <Button
            type="button"
            buttonStyle="primary"
            onClick={onSetup}
            disabled={isLoading}>
            {isLoading
              ? t('plugin-two-factor:loading')
              : t('plugin-two-factor:enableButton')}
          </Button>
        </div>
      )}
    </div>
  )
}
