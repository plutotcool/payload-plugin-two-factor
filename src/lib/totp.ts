import crypto from 'node:crypto'

const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12

function decodeBase32(base32: string): Buffer {
  let bits = 0
  let value = 0
  let index = 0
  const buffer = Buffer.alloc(Math.ceil((base32.length * 5) / 8))
  for (let i = 0; i < base32.length; i++) {
    const val = BASE32_CHARS.indexOf(base32[i].toUpperCase())
    if (val === -1) continue
    value = (value << 5) | val
    bits += 5
    if (bits >= 8) {
      buffer[index++] = (value >>> (bits - 8)) & 255
      bits -= 8
    }
  }
  return buffer.subarray(0, index)
}

function encodeBase32(buffer: Buffer): string {
  let bits = 0
  let value = 0
  let output = ''
  for (let i = 0; i < buffer.length; i++) {
    value = (value << 8) | buffer[i]
    bits += 8
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31]
      bits -= 5
    }
  }
  if (bits > 0) output += BASE32_CHARS[(value << (5 - bits)) & 31]
  return output
}

export type TOTPService = ReturnType<typeof createTOTPService>

function parseEncryptionKey(encryptionKey: string): Buffer {
  if (!/^[0-9a-f]{64}$/i.test(encryptionKey)) {
    throw new Error(
      'twoFactorPlugin `encryptionKey` must be a 64-character hex string (32 bytes). ' +
        'Generate one with: openssl rand -hex 32',
    )
  }
  return Buffer.from(encryptionKey, 'hex')
}

export function createTOTPService(encryptionKey: string) {
  const key = parseEncryptionKey(encryptionKey)

  return {
    generateSecret(byteLength = 20): string {
      const buffer = crypto.randomBytes(byteLength)
      return encodeBase32(buffer)
    },

    getAuthUri(email: string, issuer: string, secret: string): string {
      return (
        `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}` +
        `?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`
      )
    },

    verify(token: string, secretBase32: string, window = 1): boolean {
      if (!token || token.length !== 6 || !/^\d{6}$/.test(token)) return false

      const secretBytes = decodeBase32(secretBase32)
      const timeStep = Math.floor(Date.now() / 30000)

      for (let i = -window; i <= window; i++) {
        const buffer = Buffer.alloc(8)
        buffer.writeBigInt64BE(BigInt(timeStep + i), 0)

        const hmac = crypto
          .createHmac('sha1', secretBytes)
          .update(buffer)
          .digest()
        const offset = hmac[hmac.length - 1] & 0x0f

        const code = ((hmac.readUInt32BE(offset) & 0x7fffffff) % 1000000)
          .toString()
          .padStart(6, '0')

        // constant-time compare to avoid leaking the matched code via timing
        if (crypto.timingSafeEqual(Buffer.from(code), Buffer.from(token))) {
          return true
        }
      }
      return false
    },

    encryptSecret(secret: string): string {
      const iv = crypto.randomBytes(IV_LENGTH)
      const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
      let encrypted = cipher.update(secret, 'utf8', 'hex')
      encrypted += cipher.final('hex')
      const tag = cipher.getAuthTag().toString('hex')
      return `${iv.toString('hex')}:${tag}:${encrypted}`
    },

    decryptSecret(encrypted: string): string {
      const [ivHex, tagHex, encryptedText] = encrypted.split(':')
      if (!ivHex || !tagHex || !encryptedText) {
        throw new Error('Malformed encrypted secret')
      }
      const decipher = crypto.createDecipheriv(
        ALGORITHM,
        key,
        Buffer.from(ivHex, 'hex'),
      )
      decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
      let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
      decrypted += decipher.final('utf8')
      return decrypted
    },
  }
}
