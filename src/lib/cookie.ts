export const TWO_FACTOR_VERIFIED_COOKIE = 'payload-two-factor'

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join(
    '',
  )
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let mismatch = 0

  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return mismatch === 0
}

// HMAC-SHA256 keyed with the Payload secret so the cookie cannot be forged
// by an attacker who only knows the JWT.
export async function computeVerifiedValue(
  userId: string,
  payloadToken: string,
  secret: string,
): Promise<string> {
  const enc = new TextEncoder()
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    enc.encode(`${userId}:${payloadToken}`),
  )

  return toHex(new Uint8Array(signature))
}

export async function isVerifiedCookieValid(
  cookieValue: string | undefined,
  userId: string,
  payloadToken: string,
  secret: string,
): Promise<boolean> {
  if (!cookieValue) {
    return false
  }

  const expected = await computeVerifiedValue(userId, payloadToken, secret)
  return constantTimeEqual(cookieValue, expected)
}
