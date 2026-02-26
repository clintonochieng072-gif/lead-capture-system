import 'server-only';
import { supabaseAdmin } from './supabaseAdmin';

// Environment-aware affiliate API URL
const getAffiliateApiUrl = () => {
  // Use environment variable if set, otherwise determine from NODE_ENV
  if (process.env.AFFILIATE_API_URL) {
    return process.env.AFFILIATE_API_URL;
  }
  
  // Default based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  return isProduction 
    ? 'https://affiliate.clintonstack.com/api/commission'
    : 'http://localhost:3001/api/commission'; // Local affiliate system
};

const AFFILIATE_API_URL = getAffiliateApiUrl();
const AFFILIATE_API_SECRET = process.env.AFFILIATE_API_SECRET || '';
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Commission payload format for Affiliate System API
 * All fields marked REQUIRED must be present
 */
interface CommissionPayload {
  agent_code: string;       // Affiliate agent code (REQUIRED)
  user_email: string;       // Activated user's email (REQUIRED)
  plan_type: 'Individual' | 'Professional'; // Plan type (REQUIRED)
  reference: string;        // Unique transaction ID for idempotency (REQUIRED)
  client_name?: string;     // Activated user's full name (OPTIONAL)
}

/**
 * Internal notification record for audit trail
 */
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
 * 
 * Flow:
 * 1. Validate configuration
 * 2. Check idempotency (already notified?)
 * 3. Generate unique reference if not provided
 * 4. Build payload per Affiliate System API spec
 * 5. Send POST request with Authorization header
 * 6. Handle response codes:
 *    - 200: Success
 *    - 404: Invalid referrer_id
 *    - 400/401: Bad request/auth
 *    - 500: Retry with exponential backoff
 * 7. Record result in database for audit trail
 * 
 * @param userId - LCS user ID
 * @param referrerId - Affiliate's referral code (from ?ref= parameter)
 * @param userEmail - User's email address
 * @param amount - Commission amount in smallest currency unit
 * @param paymentReference - Unique transaction reference for idempotency
 * @returns Success status and optional error message
 */
export async function notifyAffiliateSystem(
  userId: string,
  agentCode: string,
  userEmail: string,
  planType: 'Individual' | 'Professional',
  paymentReference: string,
  clientName?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Validate configuration
  if (!AFFILIATE_API_URL || !AFFILIATE_API_SECRET) {
    const error = '❌ Affiliate API configuration missing (AFFILIATE_API_URL or AFFILIATE_API_SECRET)';
    console.error(error);
    return { success: false, error };
  }

  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Affiliate API URL: ${AFFILIATE_API_URL}`);

  // 2. Check idempotency - has this commission already been sent?
  const alreadyNotified = await hasCommissionBeenNotified(userId, paymentReference);
  if (alreadyNotified) {
    console.log(`✅ Commission already notified for user ${userId}, reference ${paymentReference}`);
    return { success: true }; // Already processed, consider it successful
  }

  // 3. Generate unique reference for this transaction
  // Format: LCS_{userId}_{timestamp}_{random}
  const uniqueReference = paymentReference || `LCS_${userId}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // 4. Build payload per Affiliate System API specification
  const payload: CommissionPayload = {
    agent_code: agentCode,          // REQUIRED: Affiliate's agent code
    user_email: userEmail,          // REQUIRED: User's email
    plan_type: planType,            // REQUIRED: User plan type
    reference: uniqueReference,     // REQUIRED: Unique transaction ID
    client_name: clientName || ''   // OPTIONAL: User full name
  };

  let lastError = '';
  let retryCount = 0;

  // 5. Retry loop with exponential backoff
  while (retryCount < MAX_RETRY_ATTEMPTS) {
    try {
      console.log(`📤 Attempting to notify affiliate system (attempt ${retryCount + 1}/${MAX_RETRY_ATTEMPTS})...`);
      console.log(`📦 Payload:`, JSON.stringify(payload, null, 2));
      
      // 6. Send POST request to Affiliate System
      const response = await fetch(AFFILIATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AFFILIATE_API_SECRET}`, // Bearer token from .env
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json().catch(() => ({ raw: response.statusText }));

      // 7. Handle response codes
      if (response.ok) {
        // 200: Success or idempotent (already processed)
        await recordCommissionNotification({
          user_id: userId,
          referrer_id: agentCode,
          payment_reference: uniqueReference,
          user_email: userEmail,
          amount: 0,
          status: 'success',
          response_data: responseData,
          retry_count: retryCount,
        });

        await markCommissionNotified(userId);

        console.log(`✅ Commission notification sent successfully for user ${userId}`);
        console.log(`✅ Affiliate agent ${agentCode} notified successfully`);
        console.log(`✅ Response:`, JSON.stringify(responseData));
        return { success: true };
      }

      // Handle specific error codes
      if (response.status === 404) {
        // 404: Invalid agent_code - don't retry
        lastError = `Invalid agent_code: ${agentCode} not found in Affiliate System`;
        console.error(`❌ ${lastError}`);
        await recordCommissionNotification({
          user_id: userId,
          referrer_id: agentCode,
          payment_reference: uniqueReference,
          user_email: userEmail,
          amount: 0,
          status: 'failed',
          error_message: lastError,
          retry_count: retryCount,
        });
        return { success: false, error: lastError };
      }

      if (response.status === 400 || response.status === 401) {
        // 400/401: Bad request or auth error - don't retry
        lastError = `HTTP ${response.status}: ${JSON.stringify(responseData)}`;
        console.error(`❌ ${lastError}`);
        await recordCommissionNotification({
          user_id: userId,
          referrer_id: agentCode,
          payment_reference: uniqueReference,
          user_email: userEmail,
          amount: 0,
          status: 'failed',
          error_message: lastError,
          retry_count: retryCount,
        });
        return { success: false, error: lastError };
      }

      if (response.status >= 500) {
        // 500+: Server error - retry with exponential backoff
        lastError = `HTTP ${response.status}: ${JSON.stringify(responseData)}`;
        console.warn(`⚠️ Server error (attempt ${retryCount + 1}): ${lastError}`);
        retryCount++;

        // Wait before retrying (exponential backoff: 1s, 2s, 4s, 8s, max 10s)
        if (retryCount < MAX_RETRY_ATTEMPTS) {
          const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
          console.log(`⏳ Waiting ${delayMs}ms before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        continue;
      }

      // Other non-OK responses
      lastError = `HTTP ${response.status}: ${JSON.stringify(responseData)}`;
      console.warn(`⚠️ Unexpected response (attempt ${retryCount + 1}): ${lastError}`);
      retryCount++;

      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    } catch (err: any) {
      // Network error - retry with exponential backoff
      lastError = err.message || String(err);
      console.error(`❌ Network error (attempt ${retryCount + 1}):`, err);
      retryCount++;

      if (retryCount < MAX_RETRY_ATTEMPTS) {
        const delayMs = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`⏳ Waiting ${delayMs}ms before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries failed - record the failure for audit
  await recordCommissionNotification({
    user_id: userId,
    referrer_id: agentCode,
    payment_reference: uniqueReference,
    user_email: userEmail,
    amount: 0,
    status: 'failed',
    error_message: lastError,
    retry_count: retryCount,
  });

  console.error(`❌ Failed to notify affiliate system after ${retryCount} attempts: ${lastError}`);
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
): Promise<{ should: boolean; agentCode?: string; email?: string; planType?: 'Individual' | 'Professional'; clientName?: string }> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('referrer_id, subscription_active, email, plan, full_name, commission_notified')
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
  const hasReferrer = Boolean(profile.referrer_id && profile.referrer_id.trim() !== '');
  const isActive = Boolean(profile.subscription_active);
  const commissionAlreadyNotified = Boolean(profile.commission_notified);
  const hasValidEmail = Boolean(profile.email && String(profile.email).includes('@'));
  const planType: 'Individual' | 'Professional' = profile.plan === 'Professional' ? 'Professional' : 'Individual';

  if (!hasReferrer) {
    console.log(`User ${userId} has no referrer_id - not notifying affiliate system`);
    return { should: false };
  }

  if (!isActive) {
    console.log(`User ${userId} is not active - not notifying affiliate system`);
    return { should: false };
  }

  if (commissionAlreadyNotified) {
    console.log(`User ${userId} commission already notified on initial activation - skipping`);
    return { should: false };
  }

  if (!hasValidEmail) {
    console.log(`User ${userId} has invalid email - not notifying affiliate system`);
    return { should: false };
  }

  console.log(`User ${userId} qualifies for affiliate commission (referrer: ${profile.referrer_id})`);
  return {
    should: true,
    agentCode: profile.referrer_id,
    email: profile.email || '',
    planType,
    clientName: profile.full_name || '',
  };
}

async function markCommissionNotified(userId: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from('profiles')
    .update({
      commission_notified: true,
      commission_notified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  if (error) {
    console.error(`Failed to mark commission_notified for user ${userId}:`, error);
  }
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

    const affiliateCheck = await shouldNotifyAffiliate(notification.user_id);
    if (!affiliateCheck.should || !affiliateCheck.agentCode || !affiliateCheck.email || !affiliateCheck.planType) {
      console.log(`Skipping retry for user ${notification.user_id} - no longer qualifies for affiliate notification`);
      continue;
    }
    
    const result = await notifyAffiliateSystem(
      notification.user_id,
      affiliateCheck.agentCode,
      affiliateCheck.email,
      affiliateCheck.planType,
      notification.payment_reference,
      affiliateCheck.clientName || ''
    );

    if (result.success) {
      successCount++;
    }
  }

  return successCount;
}
