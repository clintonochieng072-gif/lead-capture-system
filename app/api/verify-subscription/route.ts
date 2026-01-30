import { NextResponse } from 'next/server'
import { verifyTransaction } from '../../../../lib/paystack'
import { supabaseAdmin } from '../../../../lib/supabaseAdmin'

/**
 * GET /api/verify-subscription?reference=...
 * - verifies Paystack transaction
 * - expects metadata.user_id and metadata.plan to be present (we set them at init)
 * - updates Supabase `profiles` with subscription_active and subscription_expires_at
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const reference = url.searchParams.get('reference')
    if (!reference) {
      return NextResponse.json({ error: 'Missing reference' }, { status: 400 })
    }

    const data = await verifyTransaction(reference)
    // data includes customer and metadata we provided earlier
    const status = data.status // 'success' expected
    if (status !== 'success') {
      console.warn('Paystack verify status not success:', status)
      return NextResponse.json({ error: 'Payment not successful' }, { status: 402 })
    }

    const metadata = (data.metadata || {}) as { user_id?: string; plan?: string }
    const userId = metadata.user_id
    const plan = metadata.plan || 'Standard'

    if (!userId) {
      console.warn('No user_id in metadata for reference', reference)
      return NextResponse.json({ error: 'Missing metadata.user_id' }, { status: 400 })
    }

    // Activate subscription: here we set expiry to 30 days from now (monthly)
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

    const { error: uErr } = await supabaseAdmin
      .from('profiles')
      .update({ subscription_active: true, subscription_expires_at: expiresAt, plan })
      .eq('id', userId)

    if (uErr) {
      console.error('Supabase update error:', uErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    // Redirect user back to dashboard (include a flag so frontend can show success)
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${origin}/dashboard?subscription=success`)
  } catch (err) {
    console.error('verify-subscription error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
