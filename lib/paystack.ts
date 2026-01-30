import crypto from 'crypto'

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ''
const PAYSTACK_BASE = 'https://api.paystack.co'

// Validate that a Paystack key is set (sandbox or live)
function assertPaystackKey() {
  if (!PAYSTACK_SECRET_KEY || !PAYSTACK_SECRET_KEY.startsWith('sk_')) {
    throw new Error('PAYSTACK_SECRET_KEY must be set (sk_test_ for sandbox or sk_live_ for production)')
  }
}

type InitResponse = {
  authorization_url: string
  access_code?: string
  reference?: string
}

/**
 * Initialize a Paystack transaction.
 * amount: integer in the smallest currency unit (KES cents). Example: KES 499 => 49900.
 * metadata may include user_id and plan so we can reconcile on verification/webhook.
 */
export async function initializeTransaction(
  email: string,
  amount: number,
  callback_url: string,
  metadata: Record<string, unknown> = {},
  currency: 'KES' | 'NGN' = 'KES'
): Promise<InitResponse> {
  assertPaystackKey()
  // Paystack expects amount in the smallest currency unit. For KES, multiply by 100.
  // Caller should pass amount already in smallest unit (e.g. KES 499 => 49900).
  const body: Record<string, unknown> = {
    email,
    amount,
    callback_url,
    metadata,
  }
  // include currency when provided (Paystack supports currency param)
  if (currency) body.currency = currency

  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const json = await res.json()
  if (!res.ok) {
    throw new Error(`Paystack initialize error: ${JSON.stringify(json)}`)
  }
  return json.data as InitResponse
}

/**
 * Verify a Paystack transaction by reference string.
 * Returns the full Paystack response data object.
 */
export async function verifyTransaction(reference: string) {
  assertPaystackKey()
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    },
  })
  const json = await res.json()
  if (!res.ok) {
    throw new Error(`Paystack verify error: ${JSON.stringify(json)}`)
  }
  return json.data
}

/**
 * Verify webhook signature sent by Paystack. Uses HMAC SHA512.
 */
export function verifyWebhookSignature(rawBody: string, signature?: string) {
  assertPaystackKey()
  if (!signature) return false
  const hmac = crypto.createHmac('sha512', PAYSTACK_SECRET_KEY)
  hmac.update(rawBody)
  const computed = hmac.digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signature))
  } catch (e) {
    return false
  }
}

export default {
  initializeTransaction,
  verifyTransaction,
  verifyWebhookSignature,
}
