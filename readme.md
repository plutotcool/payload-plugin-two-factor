# Payload Two-Factor Authentication

[![npm](https://img.shields.io/npm/v/@plutotcool/payload-plugin-two-factor.svg)](https://www.npmjs.com/package/@plutotcool/payload-plugin-two-factor)
[![license](https://img.shields.io/npm/l/@plutotcool/payload-plugin-two-factor.svg)](./LICENSE)

TOTP-based two-factor authentication (2FA) for the **[Payload CMS](https://payloadcms.com) v3** admin panel.

- 🔐 Time-based one-time passwords (TOTP) — works with Google Authenticator, Authy, 1Password, etc.
- 🧩 Self-service enable / disable from the user's account page
- 🛡️ Secrets encrypted at rest with **AES-256-GCM**
- 🍪 Forgery-proof verification session via an HMAC-signed cookie keyed by your Payload secret
- 🚦 Edge middleware that gates `/admin` navigation until 2FA is verified
- 🌍 English & French translations out of the box
- ⚙️ No native dependencies — runs on serverless / edge runtimes (e.g. Cloudflare Workers)

> Requires Payload `^3`, React `^19`, and Next.js `^15 || ^16`.

## Installation

```bash
pnpm add @plutotcool/payload-plugin-two-factor
# or: npm i / yarn add / bun add
```

Generate an encryption key (32 bytes / 64 hex chars) and store it as an env var:

```bash
openssl rand -hex 32
```

```dotenv
TWO_FACTOR_ENCRYPTION_KEY=your-64-char-hex-key
```

## Usage

### 1. Register the plugin

```ts
// payload.config.ts
import { buildConfig } from 'payload'
import { twoFactorPlugin } from '@plutotcool/payload-plugin-two-factor'

export default buildConfig({
  // ...
  plugins: [
    twoFactorPlugin({
      // The auth collection to protect (default: 'users')
      collection: 'users',
      // Shown in the authenticator app
      issuer: 'Acme Admin',
      // 64-char hex string — keep it secret, keep it stable
      encryptionKey: process.env.TWO_FACTOR_ENCRYPTION_KEY!,
    }),
  ],
})
```

The plugin injects three hidden fields (`twoFactorSecret`, `twoFactorEnabled`,
`twoFactorPending`) plus a UI field into the target collection, and registers
the endpoints under `/api/two-factor/*`. Run your usual migration / schema sync
afterwards.

### 2. Add the verification page

Create the route the middleware redirects to. Re-export the bundled page:

```ts
// src/app/(payload)/admin/verify/page.tsx
export { TwoFactorVerifyPage as default } from '@plutotcool/payload-plugin-two-factor/client'
```

Pass your own logo if you like:

```tsx
import { TwoFactorVerifyPage } from '@plutotcool/payload-plugin-two-factor/client'
import Logo from '@/components/Logo'

export default function VerifyPage() {
  return <TwoFactorVerifyPage logo={<Logo />} />
}
```

### 3. Enforce verification with middleware

```ts
// src/middleware.ts
import { withTwoFactorMiddleware } from '@plutotcool/payload-plugin-two-factor/middleware'

export const middleware = withTwoFactorMiddleware()

export const config = {
  matcher: ['/admin/:path*'],
}
```

The middleware reads the Payload JWT, and for accounts with 2FA **enabled** but
not yet **verified** this session, redirects `/admin` navigation to the verify
page. It relies on `process.env.PAYLOAD_SECRET` being set.

## Options

| Option          | Type                 | Default     | Description                                                                                          |
| --------------- | -------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `issuer`        | `string`             | _required_  | Label displayed in the authenticator app.                                                            |
| `encryptionKey` | `string`             | _required_  | 64-char hex string (32 bytes) used to encrypt TOTP secrets at rest.                                  |
| `collection`    | `string`             | `'users'`   | Slug of the auth collection to protect.                                                              |
| `totp.window`   | `number`             | `1`         | Tolerance steps before/after the current 30s step, to absorb clock drift.                            |
| `disabled`      | `boolean`            | `false`     | No-op the plugin while keeping its fields (so the DB schema stays stable). Skips endpoint registration. |

`withTwoFactorMiddleware({ verifyPath })` accepts an optional `verifyPath`
(default `'/admin/verify'`) if you mount the verify page elsewhere.

## Subpath exports

| Import path                                         | Contents                                              |
| --------------------------------------------------- | ----------------------------------------------------- |
| `@plutotcool/payload-plugin-two-factor`             | `twoFactorPlugin` (server entry) + types              |
| `@plutotcool/payload-plugin-two-factor/client`      | `'use client'` React components for the admin panel   |
| `@plutotcool/payload-plugin-two-factor/middleware`  | `withTwoFactorMiddleware` (Next.js / edge)            |
| `@plutotcool/payload-plugin-two-factor/types`       | TypeScript types only                                 |

## How it works

- **Setup** — `POST /api/two-factor/setup` generates a TOTP secret + QR code and
  stores it encrypted as _pending_ on the user.
- **Enable / disable** — `POST /api/two-factor/verify` validates a code and flips
  `twoFactorEnabled`, promoting the pending secret to the active one.
- **Login verification** — `POST /api/two-factor/verify-login` validates a code
  and sets an HMAC-signed `payload-two-factor` cookie marking the session verified.
- **Gatekeeping** — the middleware checks that cookie against the JWT on every
  `/admin` navigation.

Secrets are encrypted with AES-256-GCM before hitting the database, and TOTP
codes are compared in constant time.

## Local development

A throwaway Payload app lives in [`dev/`](./dev) (SQLite, a single `users`
collection wired to the plugin). It imports the plugin straight from `src`, so
changes are picked up without rebuilding.

```bash
pnpm install
cp dev/.env.example dev/.env   # then edit the secrets
pnpm dev                       # → http://localhost:3000/admin
```

Useful scripts:

```bash
pnpm dev:generate-importmap   # regenerate the admin import map
pnpm dev:generate-types       # regenerate dev/payload-types.ts
pnpm build                    # compile to dist/ (SWC + tsc types, no bundling)
pnpm typecheck                # type-check the plugin source
```

## Build philosophy

This package is **not bundled**. Following the Payload v3 convention, sources
are transpiled file-by-file so `'use client'` / RSC boundaries survive intact:

- **SWC** transpiles TS → JS (`.swcrc`)
- **tsc** emits declarations only (`--emitDeclarationOnly`)
- **copyfiles** copies `.scss` assets

`dist/` mirrors `src/`, and the `exports` map keeps client, server, and
middleware entry points separate so server-only code never leaks to the client.

## License

[MIT](./LICENSE) © plutot.cool
