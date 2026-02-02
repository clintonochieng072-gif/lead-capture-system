import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

const AFFILIATE_API_URL = process.env.AFFILIATE_API_URL || '';
const AFFILIATE_API_SECRET = process.env.AFFILIATE_API_SECRET || '';
const MAX_RETRY_ATTEMPTS = 3;

interface CommissionPayload {
  referrer_id: string;
  user_email: string;
  amount: number;
  reference: string;
}

interface CommissionNotification {
  user_id: string;
  referrer_id: string;
  payment_reference: string;
  user_email: string;
  amount: number;
  status: 'pending' | 'success' | 'failed';
  response_data?: any;
  error_message?: string;
  retry_count: number;
}

/**
 * Check if a commission notification has already been sent for this user/payment
 * This ensures idempotency - no duplicate commission awards
 */
export async function hasCommissionBeenNotified(
  userId: string,
  paymentReference: string
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from('commission_notifications')
    .select('id, status')
    .eq('user_id', userId)
    .eq('payment_reference', paymentReference)
    .maybeSingle();

  if (error) {
    console.error('Error checking commission notification:', error);
    return false;
  }

  // If a notification exists and was successful, consider it notified
  return data !== null && data.status === 'success';
}

/**
 * Record a commission notification attempt in the database
 */
async function recordCommissionNotification(
  notification: CommissionNotification
): Promise<void> {
  const { error } = await supabaseAdmin
    .from('commission_notifications')
    .upsert(
      {
        user_id: notification.user_id,
        referrer_id: notification.referrer_id,
        payment_reference: notification.payment_reference,
        user_email: notification.user_email,
        amount: notification.amount,
        status: notification.status,
        response_data: notification.response_data,
        error_message: notification.error_message,
        retry_count: notification.retry_count,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,payment_reference',
      }
    );

  if (error) {
    console.error('Error recording commission notification:', error);
  }
}

/**
 * Send commission notification to the Affiliate System
 * Implements retry logic and idempotency checks
 */
export async function notifyAffiliateSystem(
  userId: string,
  referrerId: string,
  userEmail: string,
  amount: number,
  paymentReference: string
): Promise<{ success: boolean; error?: string }> {
  // Validate configuration
  if (!AFFILIATE_API_URL || !AFFILIATE_API_SECRET) {
    const error = 'Affiliate API configuration is missing (AFFILIATE_API_URL or AFFILIATE_API_SECRET)';
    console.error(error);
    return { success: false, error };
  }

  // Check idempotency - has this commission already been sent?
  const alreadyNotified = await hasCommissionBeenNotified(userId, paymentReference);
  if (alreadyNotified) {
    console.log(`Commission already notified for user ${userId}, reference ${paymentReference}`);
    return { success: true }; // Already processed, consider it successful
  }

  // Prepare the payload for the Affiliate System
  const payload: CommissionPayload = {
    referrer_id: referrerId,
    user_email: userEmail,
    amount,
    reference: paymentReference,
  };

  let lastError = '';
  let retryCount = 0;

  // Retry loop
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      console.log(`Attempting to notify affiliate system (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
      
      const response = await fetch(AFFILIATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AFFILIATE_API_SECRET}`,
          'X-API-Secret': AFFILIATE_API_SECRET, // Alternative auth header
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({ raw: response.statusText }));

      if (response.ok) {
        // Success! Record it in the database
        await recordCommissionNotification({
          user_id: userId,
          referrer_id: referrerId,
          payment_reference: paymentReference,
          user_email: userEmail,
          amount,
          status: 'success',
          response_data: responseData,
          retry_count: retryCount,
        });

        console.log(`Commission notification sent successfully for user ${userId}`);
        return { success: true };
      }

      // Non-OK response
      lastError = `HTTP ${response.status}: ${JSON.stringify(responseData)}`;
      console.warn(`Affiliate API returned error (attempt ${retryCount + 1}):`, lastError);

      // For 4xx errors (client errors), don't retry
      if (response.status >= 400 && response.status < 500) {
        break;
      }

      retryCount++;

      // Wait before retrying (exponential backoff)
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err: any) {
      lastError = err.message || String(err);
      console.error(`Network error notifying affiliate system (attempt ${retryCount + 1}):`, err);
      retryCount++;

      // Wait before retrying
      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed - record the failure
  await recordCommissionNotification({
    user_id: userId,
    referrer_id: referrerId,
    payment_reference: paymentReference,
    user_email: userEmail,
    amount,
    status: 'failed',
    error_message: lastError,
    retry_count: retryCount,
  });

  console.error(`Failed to notify affiliate system after ${retryCount} attempts:`, lastError);
  return { success: false, error: lastError };
}

/**
 * Check if a user should trigger a commission notification
 * Returns true only if:
 * 1. User has a referrer_id (came through affiliate link)
 * 2. User has activated their account (subscription_active = true)
 */
export async function shouldNotifyAffiliate(
  userId: string
): Promise<{ should: boolean; referrerId?: string; email?: string }> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('referrer_id, subscription_active, email')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error fetching profile for affiliate check:', error);
    return { should: false };
  }

  if (!profile) {
    console.log('No profile found for user:', userId);
    return { should: false };
  }

  // Check both conditions
  const hasReferrer = Boolean(profile.referrer_id);
  const isActive = Boolean(profile.subscription_active);

  if (!hasReferrer) {
    console.log(`User ${userId} has no referrer_id - not notifying affiliate system`);
    return { should: false };
  }

  if (!isActive) {
    console.log(`User ${userId} is not active - not notifying affiliate system`);
    return { should: false };
  }

  console.log(`User ${userId} qualifies for affiliate commission (referrer: ${profile.referrer_id})`);
  return {
    should: true,
    referrerId: profile.referrer_id,
    email: profile.email || '',
  };
}

/**
 * Retry failed commission notifications
 * This can be called by a cron job or manual process
 */
export async function retryFailedCommissions(limit: number = 10): Promise<number> {
  const { data: failedNotifications, error } = await supabaseAdmin
    .from('commission_notifications')
    .select('*')
    .eq('status', 'failed')
    .lt('retry_count', MAX_RETRY_ATTEMPTS)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error || !failedNotifications) {
    console.error('Error fetching failed commission notifications:', error);
    return 0;
  }

  let successCount = 0;

  for (const notification of failedNotifications) {
    console.log(`Retrying failed commission for user ${notification.user_id}...`);
    
    const result = await notifyAffiliateSystem(
      notification.user_id,
      notification.referrer_id,
      notification.user_email,
      notification.amount,
      notification.payment_reference
    );

    if (result.success) {
      successCount++;
    }
  }

  return successCount;
}
