import { NextRequest } from 'next/server';
import { supabaseAdmin } from '../../../../lib/supabaseAdmin';

/**
 * POST /api/track/[slug]
 * 
 * Public endpoint for lead submission from /t/:slug form
 * 
 * Flow:
 * 1. Validate input (name, phone)
 * 2. Resolve slug to tracking_link
 * 3. Verify link is active and has target URL
 * 4. Insert lead with service role (bypasses RLS)
 * 5. Redirect visitor to target URL
 */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const slug = params.slug;
  let name = '';
  let phone = '';

  try {
    const contentType = req.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const body = await req.json();
      name = String(body.name || '').trim();
      phone = String(body.phone || '').trim();
    } else {
      // Form submission
      const formData = await req.formData();
      name = String(formData.get('name') || '').trim();
      phone = String(formData.get('phone') || '').trim();
    }

    // Validate input
    if (!name || name.length < 2 || name.length > 100) {
      return new Response('Invalid name', { status: 400 });
    }

    if (!phone || phone.length < 7 || phone.length > 20) {
      return new Response('Invalid phone number', { status: 400 });
    }

    // Resolve tracking link by slug
    const { data: linkData, error: linkErr } = await supabaseAdmin
      .from('tracking_links')
      .select('id, owner_user_id, target_url, is_active')
      .eq('slug', slug)
      .limit(1)
      .maybeSingle();

    if (linkErr) {
      console.error('Link lookup error:', linkErr?.message || linkErr, linkErr);
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Link not found
    if (!linkData) {
      return new Response('Tracking link not found', { status: 404 });
    }

    // Link is disabled
    if (!linkData.is_active) {
      return new Response('This tracking link is no longer active', { status: 410 });
    }

    // No target URL set - show friendly error
    if (!linkData.target_url) {
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <title>Target URL Not Set</title>
            <style>
              body { font-family: system-ui; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f3f4f6; }
              .container { background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); text-align: center; max-width: 400px; }
              h1 { color: #1f2937; margin: 0 0 10px 0; }
              p { color: #6b7280; margin: 0 0 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Page Not Ready</h1>
              <p>The business owner hasn't set up their website URL yet. Please try again later.</p>
            </div>
          </body>
        </html>`,
        { status: 410, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const { data: ownerProfile, error: profileErr } = await supabaseAdmin
      .from('profiles')
      .select('subscription_active, subscription_expires_at')
      .eq('user_id', linkData.owner_user_id)
      .maybeSingle();

    if (profileErr) {
      console.error('Profile lookup error:', profileErr);
      return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const now = Date.now();
    const subscriptionExpiresAt = ownerProfile?.subscription_expires_at
      ? new Date(ownerProfile.subscription_expires_at).getTime()
      : 0;
    const hasActiveSubscription = Boolean(
      ownerProfile?.subscription_active && subscriptionExpiresAt > now
    );

    if (!hasActiveSubscription) {
      const { count: leadCount, error: leadCountErr } = await supabaseAdmin
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('owner_user_id', linkData.owner_user_id);

      if (leadCountErr) {
        console.error('Lead count error:', leadCountErr);
        return new Response(JSON.stringify({ error: 'Service temporarily unavailable' }), {
          status: 503,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      if ((leadCount || 0) >= 10) {
        return new Response(
          JSON.stringify({
            code: 'free_limit_reached',
            message: 'You have reached your free lead capture limit. Upgrade for unlimited leads.'
          }),
          {
            status: 403,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Collect metadata
    const metadata: any = {
      user_agent: req.headers.get('user-agent') || null,
      referrer: req.headers.get('referer') || null,
      ip: req.headers.get('x-forwarded-for') || 
          req.headers.get('x-real-ip') || 
          null
    };

    // Insert lead (service role bypasses RLS)
    const { data: leadData, error: insertErr } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          tracking_link_id: linkData.id,
          owner_user_id: linkData.owner_user_id,
          name,
          phone,
          metadata
        }
      ])
      .select()
      .single();

    if (insertErr) {
      console.error('Lead insert error:', insertErr);
      return new Response(
        JSON.stringify({ error: 'Failed to save your information' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    await supabaseAdmin
      .from('notifications')
      .insert([
        {
          owner_user_id: linkData.owner_user_id,
          lead_id: leadData.id,
          message: 'You have a visitor to your website.'
        }
      ]);

    // Return success with target URL (client will redirect)
    return new Response(
      JSON.stringify({ success: true, target_url: linkData.target_url }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Track endpoint error:', error);
    return new Response('Server error', { status: 500 });
  }
}
