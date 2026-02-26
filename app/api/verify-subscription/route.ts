import { NextResponse } from 'next/server'
import { verifyTransaction } from '../../../lib/paystack'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { shouldNotifyAffiliate, notifyAffiliateSystem } from '../../../lib/affiliate'

/**
 * GET /api/verify-subscription?reference=...
 * Paystack Callback Handler
 *
 * IMPORTANT: Configure this URL in Paystack Dashboard:
 * - Settings → API Keys & Webhooks → Webhook URLs
 * - Success Redirect URL: https://leads.clintonstack.com/api/verify-subscription
 * - Use this endpoint for both Sandbox and Live; the PAYSTACK_SECRET_KEY env variable determines which mode
 *
 * Flow:
 * - Paystack redirects user here after successful payment with ?reference=<transaction_ref>
 * - Verifies the transaction via Paystack API
 * - Updates Supabase `profiles` with subscription_active=true and subscription_expires_at (30 days from now)
 * - Redirects user to dashboard with success flag
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
    const plan = metadata.plan === 'Professional' ? 'Professional' : 'Individual'

    if (!userId) {
      console.warn('No user_id in metadata for reference', reference)
      return NextResponse.json({ error: 'Missing metadata.user_id' }, { status: 400 })
    }

    const { data: existingProfile, error: existingProfileErr } = await supabaseAdmin
      .from('profiles')
      .select('subscription_started_at')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingProfileErr) {
      console.error('Supabase profile read error:', existingProfileErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    const nowIso = new Date().toISOString()
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    const startedAt = existingProfile?.subscription_started_at || nowIso

    const { error: uErr } = await supabaseAdmin
      .from('profiles')
      .update({
        subscription_active: true,
        subscription_expires_at: expiresAt,
        subscription_started_at: startedAt,
        subscription_last_payment_at: nowIso,
        plan,
      })
      .eq('user_id', userId)

    if (uErr) {
      console.error('Supabase update error:', uErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }

    console.log(`Subscription activated for user ${userId}, plan: ${plan}`)

    // Check if we should notify the Affiliate System
    const affiliateCheck = await shouldNotifyAffiliate(userId)
    
    if (affiliateCheck.should && affiliateCheck.agentCode && affiliateCheck.email && affiliateCheck.planType) {
      console.log(`User ${userId} qualifies for affiliate commission - notifying affiliate system...`)
      
      // Notify the Affiliate System (runs async with retries)
      // We don't wait for this to complete to avoid blocking the user redirect
      notifyAffiliateSystem(
        userId,
        affiliateCheck.agentCode,
        affiliateCheck.email,
        affiliateCheck.planType,
        reference,
        affiliateCheck.clientName || ''
      ).then((result) => {
        if (result.success) {
          console.log(`✅ Successfully notified affiliate system for user ${userId}`)
        } else {
          console.error(`❌ Failed to notify affiliate system for user ${userId}: ${result.error}`)
        }
      }).catch((err) => {
        console.error(`❌ Error in affiliate notification for user ${userId}:`, err)
      })
    } else {
      console.log(`User ${userId} does not qualify for affiliate commission - skipping notification`)
    }

    // Redirect user back to dashboard (include a flag so frontend can show success)
    // Use NEXT_PUBLIC_APP_URL (set to https://leads.clintonstack.com in production)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.headers.get('origin') || 'http://localhost:3000'
    return NextResponse.redirect(`${appUrl}/dashboard?subscription=success`)
  } catch (err) {
    console.error('verify-subscription error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
