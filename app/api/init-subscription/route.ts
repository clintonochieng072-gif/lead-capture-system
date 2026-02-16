import { NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../lib/supabaseAdmin'
import { initializeTransaction } from '../../../lib/paystack'

type Body = {
  userId: string
}

/**
 * POST /api/init-subscription
 * - expects { userId }
 * - initializes Paystack transaction and returns authorization_url
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body
    const { userId } = body
    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    // Verify user exists in Supabase
    const { data: profile, error: pErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, email')
      .eq('user_id', userId)
      .maybeSingle()
    if (pErr) {
      console.error('Supabase lookup error:', pErr)
      return NextResponse.json({ error: 'DB error' }, { status: 500 })
    }
    if (!profile) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const monthlyPlanCode = process.env.PAYSTACK_MONTHLY_PLAN_CODE
    if (!monthlyPlanCode) {
      return NextResponse.json(
        { error: 'PAYSTACK_MONTHLY_PLAN_CODE is not configured' },
        { status: 500 }
      )
    }

    const amount = 99900

    // Determine callback URL (Paystack will redirect user here with ?reference=...)
    const origin = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const callbackUrl = `${origin}/api/verify-subscription`

    // Initialize Paystack transaction; include metadata to map user and plan
    const init = await initializeTransaction(
      profile.email,
      amount,
      callbackUrl,
      {
        user_id: userId,
        plan: 'Standard',
      },
      'KES',
      monthlyPlanCode
    )

    return NextResponse.json({ authorization_url: init.authorization_url })
  } catch (err) {
    console.error('init-subscription error:', err)
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
