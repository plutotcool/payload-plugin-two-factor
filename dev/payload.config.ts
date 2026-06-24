import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildConfig } from 'payload'
import { sqliteAdapter } from '@payloadcms/db-sqlite'

import { twoFactorPlugin } from '../src/index'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: 'users',
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [
    {
      slug: 'users',
      auth: true,
      admin: { useAsTitle: 'email' },
      fields: [],
    },
  ],
  secret: process.env.PAYLOAD_SECRET || 'dev-secret-change-me',
  db: sqliteAdapter({
    client: {
      url: process.env.DATABASE_URI || `file:${path.resolve(dirname, 'dev.db')}`,
    },
  }),
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  plugins: [
    twoFactorPlugin({
      issuer: 'Payload 2FA Dev',
      // Throwaway dev key. Generate a real one with: openssl rand -hex 32
      encryptionKey:
        process.env.TWO_FACTOR_ENCRYPTION_KEY ||
        '0000000000000000000000000000000000000000000000000000000000000000',
    }),
  ],
})
