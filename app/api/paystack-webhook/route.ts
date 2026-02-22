import { NextResponse } from 'next/server'
import { verifyWebhookSignature } from '../../../lib/paystack'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { shouldNotifyAffiliate, notifyAffiliateSystem } from '../../../lib/affiliate'

/**
 * POST /api/paystack-webhook
 * Paystack Webhook Handler (Server-to-Server) & Router
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
 * - transfer.*: Routes to Affiliate System (transfer.success, transfer.failed)
 * - Other events: Logged but ignored
 *
 * Webhook Routing Architecture:
 * - LCS receives ALL Paystack events
 * - LCS handles its own charge events
 * - LCS routes affiliate withdrawal events (transfer.*) to Affiliate System
 * - LCS never touches affiliate balances or database
 *
 * Signature Verification:
 * - All requests include x-paystack-signature header (HMAC SHA512 with PAYSTACK_SECRET_KEY)
 * - We validate the signature before processing any event
 */
export async function POST(request: Request) {
  try {
    const signature = request.headers.get('x-paystack-signature') || undefined
    const raw = await request.text()
    
    // 1️⃣ WEBHOOK VERIFICATION - Verify Paystack signature
    if (!verifyWebhookSignature(raw, signature)) {
      console.warn('Invalid Paystack webhook signature')
      return NextResponse.json({ ok: false }, { status: 401 })
    }

    const body = JSON.parse(raw)
    const event = body.event as string
    const data = body.data || {}

    // 2️⃣ EVENT ROUTING - Route transfer events to Affiliate System
    // Handle affiliate withdrawal events (transfer.success, transfer.failed)
    if (event && event.startsWith('transfer.')) {
      console.log(`🔀 Routing ${event} to Affiliate System...`)
      
      try {
        const affiliateApiSecret = process.env.AFFILIATE_API_SECRET
        const affiliateWebhookUrl = 'https://affiliate.clintonstack.com/api/internal/paystack-webhook'
        
        if (!affiliateApiSecret) {
          console.error('❌ AFFILIATE_API_SECRET not configured - cannot route transfer events')
          // Don't fail the webhook - just log and continue
          return NextResponse.json({ ok: true, warning: 'affiliate_api_not_configured' })
        }

        // Forward the event to Affiliate System
        const affiliateResponse = await fetch(affiliateWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${affiliateApiSecret}`,
          },
          body: JSON.stringify({
            event: event,
            reference: data.reference || '',
            amount: data.amount || 0,
            recipient: data.recipient || {},
            transfer_code: data.transfer_code || '',
            status: data.status || '',
            reason: data.reason || '',
            full_payload: data, // Include full payload for comprehensive handling
          }),
        })

        if (affiliateResponse.ok) {
          console.log(`✅ Successfully routed ${event} to Affiliate System`)
        } else {
          const errorText = await affiliateResponse.text()
          console.error(`❌ Failed to route ${event} to Affiliate System: ${affiliateResponse.status} - ${errorText}`)
          // Don't fail the webhook - Affiliate System will handle missing events
        }
      } catch (err) {
        console.error(`❌ Error routing ${event} to Affiliate System:`, err)
        // Don't fail the webhook - just log the error
      }
      
      // Return success - we've processed the event
      return NextResponse.json({ ok: true })
    }

    // 3️⃣ LCS LOGIC - Handle Lead Capture System events (existing logic unchanged)
    // We set metadata.user_id at initialization; use it here if present
    const metadata = data.metadata || {}
    const userId = metadata.user_id
    const selectedPlan = metadata.plan === 'Professional' ? 'Professional' : 'Individual'

    if (!userId) {
      console.warn('Webhook missing user_id metadata')
      return NextResponse.json({ ok: true })
    }

    if (event === 'charge.success') {
      const { data: existingProfile } = await supabaseAdmin
        .from('profiles')
        .select('subscription_started_at')
        .eq('user_id', userId)
        .maybeSingle()

      const nowIso = new Date().toISOString()
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      
      // Activate the user's subscription
      await supabaseAdmin
        .from('profiles')
        .update({
          subscription_active: true,
          subscription_expires_at: expiresAt,
          subscription_started_at: existingProfile?.subscription_started_at || nowIso,
          subscription_last_payment_at: nowIso,
          plan: selectedPlan,
        })
        .eq('user_id', userId)
      
      console.log('Marked subscription active for user', userId)

      // Check if we should notify the Affiliate System
      const affiliateCheck = await shouldNotifyAffiliate(userId)
      
      if (affiliateCheck.should && affiliateCheck.referrerId && affiliateCheck.email) {
        console.log(`User ${userId} qualifies for affiliate commission - notifying affiliate system...`)
        
        // Get payment reference from webhook data
        const paymentReference = data.reference || ''
        // Fixed commission amount: 70 KES (sent as 70, affiliate system interprets as KES)
        const paymentAmount = 70
        
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
