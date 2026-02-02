import { NextResponse } from 'next/server';
import { retryFailedCommissions } from '../../../lib/affiliate';

/**
 * GET /api/retry-commissions
 * 
 * Manually retry failed commission notifications
 * 
 * This endpoint can be called:
 * - Manually for troubleshooting
 * - By a cron job (e.g., Vercel Cron, GitHub Actions)
 * 
 * Security: Requires CRON_SECRET header to prevent unauthorized access
 * 
 * Usage with cron (Vercel):
 * 1. Add vercel.json:
 *    {
 *      "crons": [{
 *        "path": "/api/retry-commissions",
 *        "schedule": "0 * * * *"
 *      }]
 *    }
 * 
 * 2. Set CRON_SECRET in Vercel environment variables
 * 
 * Manual usage:
 * curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
 *      https://your-app.com/api/retry-commissions
 */
export async function GET(request: Request) {
  try {
    // Security check: Verify the request is authorized
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    // If CRON_SECRET is not set, anyone can call this (dev mode only)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      console.warn('Unauthorized retry-commissions attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get limit from query parameter (default 10, max 50)
    const url = new URL(request.url);
    const limitParam = url.searchParams.get('limit');
    const limit = Math.min(parseInt(limitParam || '10', 10), 50);

    console.log(`Starting retry of failed commissions (limit: ${limit})...`);

    // Retry failed commissions
    const successCount = await retryFailedCommissions(limit);

    console.log(`Successfully retried ${successCount} out of ${limit} failed commissions`);

    return NextResponse.json({
      success: true,
      retriedCount: successCount,
      limit,
      message: `Successfully retried ${successCount} failed commission(s)`,
    });
  } catch (err: any) {
    console.error('Error in retry-commissions endpoint:', err);
    return NextResponse.json(
      {
        success: false,
        error: err.message || 'Internal server error',
      },
      { status: 500 }
    );
  }
}
