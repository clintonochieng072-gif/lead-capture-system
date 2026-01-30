import { NextRequest, NextResponse } from 'next/server';
import { createProfile, createDefaultTrackingLink } from '../../../../lib/db.server';

/**
 * POST /api/auth/callback
 * Server-side helper to create application records after a user signs in.
 * This endpoint is called by the client after Supabase auth session exists.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, email, fullName } = body as { userId?: string; email?: string; fullName?: string };

    if (!userId || !email) {
      return NextResponse.json({ error: 'Missing userId or email' }, { status: 400 });
    }

    const profile = await createProfile(userId, email, fullName);
    if (!profile) {
      return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
    }

    const link = await createDefaultTrackingLink(userId);
    if (!link) {
      return NextResponse.json({ error: 'Failed to create tracking link' }, { status: 500 });
    }

    return NextResponse.json({ success: true, profile, link }, { status: 201 });
  } catch (err) {
    console.error('auth/callback error', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
