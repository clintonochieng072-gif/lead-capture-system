import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../../../lib/supabaseAdmin';

async function getUserIdFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : null;

  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !data?.user?.id) return null;

  return data.user.id;
}

export async function GET(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: notifications, error } = await supabaseAdmin
    .from('notifications')
    .select('id, message, is_read, created_at')
    .eq('owner_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }

  const items = (notifications || []) as Array<{ is_read: boolean }>;
  const unreadCount = items.filter((n) => !n.is_read).length;

  return NextResponse.json({
    notifications: notifications || [],
    unreadCount,
  });
}

export async function PATCH(request: Request) {
  const userId = await getUserIdFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const notificationId = typeof body?.notificationId === 'string' ? body.notificationId : null;
  const markAll = Boolean(body?.markAll);

  if (!markAll && !notificationId) {
    return NextResponse.json({ error: 'Missing notificationId or markAll' }, { status: 400 });
  }

  let query = supabaseAdmin
    .from('notifications')
    .update({ is_read: true })
    .eq('owner_user_id', userId)
    .eq('is_read', false);

  if (!markAll && notificationId) {
    query = query.eq('id', notificationId);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: 'Failed to update notifications' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
