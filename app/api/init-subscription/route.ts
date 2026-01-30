import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { initializeTransaction } from '../../../lib/paystack'

type Body = {
  planName: string
  userId: string
}

/**
 * POST /api/init-subscription
 * - expects { planName, userId }
 * - enforces Early Access limit (10)
 * - initializes Paystack transaction and returns authorization_url
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const { planName, userId } = body
    if (!planName || !userId) {
      return NextResponse.json({ error: 'Missing planName or userId' }, { status: 400 })
    }

    // Verify user exists in Supabase
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .eq('id', userId)
      .maybeSingle()
    if (pErr) {
      console.error('Supabase lookup error:', pErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Enforce Early Access limit (max 10 active subscribers)
    if (planName === 'Early Access') {
      const { data: earlyUsers, error: eErr } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('plan', 'Early Access')
        .eq('subscription_active', true)
      if (eErr) {
        console.error('Supabase count error:', eErr)
        return NextResponse.json({ error: 'DB error' }, { status: 500 })
      }
      if ((earlyUsers || []).length >= 10) {
        return NextResponse.json({ error: 'Early Access full' }, { status: 409 })
      }
    }

    // Price table (amounts in smallest currency unit for KES).
    // Early Access: KES 499/month; Standard: KES 999/month.
    const PRICE_MAP: Record<string, number> = {
      'Early Access': 49900, // KES 499.00
      Standard: 99900, // KES 999.00
    }
    const amount = PRICE_MAP[planName]
    if (!amount) {
      return NextResponse.json({ error: 'Unknown plan' }, { status: 400 })
    }

    // Determine callback URL (Paystack will redirect user here with ?reference=...)
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const callbackUrl = `${origin}/api/verify-subscription`

    // Initialize Paystack transaction; include minimal metadata to map user and plan
    const init = await initializeTransaction(
      profile.email,
      amount,
      callbackUrl,
      {
        user_id: userId,
        plan: planName,
      },
      'KES'
    )

    return NextResponse.json({ authorization_url: init.authorization_url })
  } catch (err) {
    console.error('init-subscription error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
