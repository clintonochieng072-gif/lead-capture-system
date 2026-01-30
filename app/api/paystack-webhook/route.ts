import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '../../../lib/paystack'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'

/**
 * POST /api/paystack-webhook
 * - Validates signature
 * - Handles charge.success and charge.failed events to update subscription status
 */
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-paystack-signature') || undefined
    const raw = await request.text()
    if (!verifyWebhookSignature(raw, signature)) {
      console.warn('Invalid Paystack webhook signature')
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = JSON.parse(raw)
    const event = body.event as string
    const data = body.data || {}

    // We set metadata.user_id at initialization; use it here if present
    const metadata = data.metadata || {}
    const userId = metadata.user_id

    if (!userId) {
      console.warn('Webhook missing user_id metadata')
      return NextResponse.json({ ok: true })
    }

    if (event === 'charge.success') {
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_active: true, subscription_expires_at: expiresAt })
        .eq('id', userId)
      console.log('Marked subscription active for user', userId)
    } else if (event === 'charge.failed') {
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_active: false })
        .eq('id', userId)
      console.log('Marked subscription failed for user', userId)
    } else {
      // ignore other events for now
      console.log('Unhandled Paystack event:', event)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('paystack-webhook error:', err)
    return NextResponse.json({ ok: false }, { status: 500 })
  }
}
