import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '../../../lib/paystack'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { shouldNotifyAffiliate, notifyAffiliateSystem } from '../../../lib/affiliate'

/**
 * POST /api/paystack-webhook
 * Paystack Webhook Handler (Server-to-Server)
 *
 * IMPORTANT: Configure this URL in Paystack Dashboard:
 * - Settings → API Keys & Webhooks → Webhook URLs
 * - Webhook URL: https://leads.clintonstack.com/api/paystack-webhook
 * - Use this endpoint for both Sandbox and Live; the PAYSTACK_SECRET_KEY env variable determines which mode
 * - Paystack will POST to this endpoint with x-paystack-signature header
 *
 * Events handled:
 * - charge.success: Activates subscription (subscription_active=true, subscription_expires_at in 30 days)
 * - charge.failed: Deactivates subscription (subscription_active=false)
 * - Other events: Logged but ignored
 *
 * Signature Verification:
 * - All requests include x-paystack-signature header (HMAC SHA512 with PAYSTACK_SECRET_KEY)
 * - We validate the signature before processing any event
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
      
      // Activate the user's subscription
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_active: true, subscription_expires_at: expiresAt })
        .eq('user_id', userId)
      
      console.log('Marked subscription active for user', userId)

      // Check if we should notify the Affiliate System
      const affiliateCheck = await shouldNotifyAffiliate(userId)
      
      if (affiliateCheck.should && affiliateCheck.referrerId && affiliateCheck.email) {
        console.log(`User ${userId} qualifies for affiliate commission - notifying affiliate system...`)
        
        // Get payment reference and amount from webhook data
        const paymentReference = data.reference || ''
        const paymentAmount = data.amount || 0
        
        // Notify the Affiliate System (runs async with retries)
        // We don't wait for this to complete to avoid blocking the webhook response
        notifyAffiliateSystem(
          userId,
          affiliateCheck.referrerId,
          affiliateCheck.email,
          paymentAmount,
          paymentReference
        ).then((result) => {
          if (result.success) {
            console.log(`Successfully notified affiliate system for user ${userId}`)
          } else {
            console.error(`Failed to notify affiliate system for user ${userId}: ${result.error}`)
          }
        }).catch((err) => {
          console.error(`Error in affiliate notification for user ${userId}:`, err)
        })
      } else {
        console.log(`User ${userId} does not qualify for affiliate commission - skipping notification`)
      }
    } else if (event === 'charge.failed') {
      await supabaseAdmin
        .from('profiles')
        .update({ subscription_active: false })
        .eq('user_id', userId)
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
