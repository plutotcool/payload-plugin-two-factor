'use client'

import { type ReactNode, Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useConfig } from '@payloadcms/ui'

import { TwoFactorVerifyForm } from './TwoFactorVerifyForm'

interface TwoFactorVerifyPageProps {
  logo?: ReactNode
}

function TwoFactorVerifyPageInner({ logo }: TwoFactorVerifyPageProps) {
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirect') ?? '/admin'

  const {
    config: {
      routes: { api: apiRoute },
    },
  } = useConfig()
  const router = useRouter()

  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    fetch(`${apiRoute}/two-factor/check`, { cache: 'no-store' })
      .then((res) => res.json() as Promise<{ enabled?: boolean }>)
      .then((data) => {
        if (data.enabled) {
          setShowForm(true)
        } else {
          router.replace(redirectTo)
        }
      })
      .catch(() => {
        router.replace(redirectTo)
      })
  }, [apiRoute, router, redirectTo])

  if (!showForm) return null

  return <TwoFactorVerifyForm redirectTo={redirectTo} logo={logo} />
}

/**
 * Drop-in page component for the 2FA verification step.
 * Wrap the inner component in Suspense to satisfy Next.js App Router's
 * requirement for components that use `useSearchParams()`.
 *
 * @example
 * // src/app/(payload)/admin/verify/page.tsx
 * export { TwoFactorVerifyPage as default } from '@plutotcool/payload-plugin-two-factor/client'
 */
export function TwoFactorVerifyPage({ logo }: TwoFactorVerifyPageProps = {}) {
  return (
    <Suspense>
      <TwoFactorVerifyPageInner logo={logo} />
    </Suspense>
  )
}
