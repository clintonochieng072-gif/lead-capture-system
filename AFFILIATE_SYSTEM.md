# Affiliate Commission System - Implementation Guide

## Overview

The Buyer Connection System (LCS) now includes a complete affiliate commission tracking system that integrates with an external Affiliate System. This implementation ensures:

- ✅ **Referral tracking**: Captures affiliate referral IDs during user registration
- ✅ **Conditional commission**: Awards commissions ONLY when users activate accounts
- ✅ **Security**: Verifies Paystack webhooks and authenticates with Affiliate System
- ✅ **Idempotency**: Prevents duplicate commission awards
- ✅ **Reliability**: Implements retry logic for failed notifications
- ✅ **Logging**: Tracks all commission attempts in the database

---

## How It Works

### 1. Referral Capture Flow

When a user arrives via an affiliate link (e.g., `https://your-app.com/login?ref=AFFILIATE123`):

1. **Login Page** ([app/login/page.tsx](app/login/page.tsx)):
   - Extracts `ref` query parameter from URL
   - Stores referral ID in `sessionStorage` to persist through OAuth flow
   
2. **Auth Callback** ([app/api/auth/callback/route.ts](app/api/auth/callback/route.ts)):
   - Receives referral ID from client
   - Passes it to `createProfile()` function
   
3. **Profile Creation** ([lib/db.server.ts](lib/db.server.ts)):
   - Saves `referrer_id` to the `profiles` table
   - For returning users, doesn't override existing referrer

### 2. Account Activation & Commission Flow

When a user completes payment via Paystack:

1. **Paystack Webhook** ([app/api/paystack-webhook/route.ts](app/api/paystack-webhook/route.ts)):
   - Verifies webhook signature (security)
   - Activates user subscription in database
   - Checks if commission should be awarded
   
2. **Commission Check** ([lib/affiliate.ts](lib/affiliate.ts)):
   - Verifies user has `referrer_id` (came through affiliate)
   - Verifies user has `subscription_active = true` (activated account)
   - If both conditions met, proceeds to notify

3. **Affiliate Notification** ([lib/affiliate.ts](lib/affiliate.ts)):
   - Checks idempotency (prevents duplicates)
   - Sends POST request to Affiliate System with:
     ```json
     {
       "referrer_id": "AFFILIATE123",
       "user_email": "user@example.com",
       "amount": 49900,
       "reference": "paystack_ref_abc123"
     }
     ```
   - Implements retry logic (up to 3 attempts with exponential backoff)
   - Records all attempts in `commission_notifications` table

---

## Database Schema

### New Table: `commission_notifications`

Tracks all commission notification attempts:

```sql
CREATE TABLE commission_notifications (
  id uuid PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id),
  referrer_id text NOT NULL,
  payment_reference text NOT NULL,
  user_email text NOT NULL,
  amount integer NOT NULL,
  status text NOT NULL,  -- 'pending', 'success', 'failed'
  response_data jsonb,
  error_message text,
  retry_count integer DEFAULT 0,
  created_at timestamptz,
  updated_at timestamptz,
  
  UNIQUE(user_id, payment_reference)  -- Prevents duplicates
);
```

### Updated Table: `profiles`

Added column:

```sql
ALTER TABLE profiles 
ADD COLUMN referrer_id text;
```

---

## Environment Variables

Add these to your `.env.local` file:

```env
# Affiliate System Integration
AFFILIATE_API_URL=https://affiliate-system.com/api/commission
AFFILIATE_API_SECRET=your-secret-token-here
```

### Security Notes:
- ✅ `AFFILIATE_API_SECRET` should be kept secret (never commit to git)
- ✅ The Affiliate System should verify this secret on incoming requests
- ✅ Use HTTPS for the Affiliate API URL

---

## Deployment Steps

### Step 1: Run Database Migration

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of [supabase/sql/add_affiliate_tracking.sql](supabase/sql/add_affiliate_tracking.sql)
4. Click **Run** to execute the migration

This will:
- Add `referrer_id` column to `profiles` table
- Create `commission_notifications` table with indexes
- Set up Row Level Security policies

### Step 2: Configure Environment Variables

Add to your production environment (Vercel/Railway/etc):

```env
AFFILIATE_API_URL=https://affiliate-system.com/api/commission
AFFILIATE_API_SECRET=your-production-secret
```

### Step 3: Deploy Code

Deploy the updated codebase to your hosting platform. The system will automatically:
- Capture referral IDs from new user registrations
- Send commission notifications when users activate accounts

---

## Testing

### Test Scenario 1: User Without Referral

1. Visit login page without `?ref=` parameter: `https://your-app.com/login`
2. Sign up and activate account with payment
3. **Expected**: No commission notification sent (user has no referrer_id)

### Test Scenario 2: User With Referral (Success Flow)

1. Visit login page with referral: `https://your-app.com/login?ref=TEST123`
2. Sign up (referrer_id saved to database)
3. Complete payment to activate account
4. **Expected**: 
   - Commission notification sent to Affiliate System
   - Record created in `commission_notifications` table with status='success'

### Test Scenario 3: User With Referral (No Activation)

1. Visit login page with referral: `https://your-app.com/login?ref=TEST456`
2. Sign up (referrer_id saved to database)
3. Do NOT complete payment
4. **Expected**: No commission notification sent (user not activated)

### Test Scenario 4: Duplicate Prevention

1. Complete Test Scenario 2
2. Manually trigger webhook again for same user/payment
3. **Expected**: No duplicate commission sent (idempotency check)

### Monitoring Commission Notifications

Query the database to see all commission attempts:

```sql
SELECT 
  user_id,
  referrer_id,
  user_email,
  amount,
  status,
  retry_count,
  created_at,
  error_message
FROM commission_notifications
ORDER BY created_at DESC
LIMIT 20;
```

Query for failed commissions that need retry:

```sql
SELECT * 
FROM commission_notifications
WHERE status = 'failed' 
  AND retry_count < 3
ORDER BY created_at ASC;
```

---

## API Integration Details

### Affiliate System API Endpoint

The Affiliate System must expose an endpoint that accepts POST requests:

**Endpoint**: `POST /api/commission`

**Headers**:
```
Content-Type: application/json
Authorization: Bearer YOUR_AFFILIATE_API_SECRET
X-API-Secret: YOUR_AFFILIATE_API_SECRET
```

**Request Body**:
```json
{
  "referrer_id": "AFFILIATE123",
  "user_email": "user@example.com",
  "amount": 49900,
  "reference": "paystack_ref_abc123"
}
```

**Response** (Success):
```json
{
  "success": true,
  "commission_id": "comm_xyz789"
}
```

**Response** (Error):
```json
{
  "success": false,
  "error": "Referrer not found"
}
```

### Security Requirements

1. **Authentication**: Affiliate System should verify the `Authorization` header or `X-API-Secret` header
2. **HTTPS**: All communication should be over HTTPS
3. **Idempotency**: Affiliate System should handle duplicate requests gracefully (same reference)

---

## Retry & Error Handling

### Automatic Retries

The system automatically retries failed commission notifications:

- **Max attempts**: 3
- **Backoff strategy**: Exponential (1s, 2s, 4s)
- **4xx errors**: No retry (client errors are permanent)
- **5xx errors**: Retry (server errors may be temporary)
- **Network errors**: Retry

### Manual Retry

For failed commissions that exceed retry limit, you can manually retry using the utility function:

```typescript
import { retryFailedCommissions } from './lib/affiliate';

// Retry up to 10 failed commissions
const successCount = await retryFailedCommissions(10);
console.log(`Successfully retried ${successCount} commissions`);
```

Consider setting up a cron job to periodically retry failed commissions:

```typescript
// Example: Next.js API route for cron job
export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  
  // Verify cron secret
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  const count = await retryFailedCommissions(50);
  return Response.json({ retried: count });
}
```

---

## Security Considerations

### 1. Webhook Signature Verification

✅ Paystack webhooks are verified using HMAC SHA512 signature  
✅ Invalid signatures are rejected (prevents fake webhooks)

### 2. Affiliate API Authentication

✅ Requests to Affiliate System include secret token  
✅ Token stored in environment variable (not in code)

### 3. Idempotency

✅ Database constraint prevents duplicate records  
✅ Check performed before every notification attempt

### 4. Row Level Security

✅ Commission notifications table has no direct user access  
✅ Only server-side code (service role) can read/write

---

## Troubleshooting

### Commission Not Sent

**Check 1**: Does user have `referrer_id`?
```sql
SELECT referrer_id, subscription_active 
FROM profiles 
WHERE email = 'user@example.com';
```

**Check 2**: Is user activated?
```sql
SELECT subscription_active, subscription_expires_at 
FROM profiles 
WHERE email = 'user@example.com';
```

**Check 3**: Check commission notification logs:
```sql
SELECT * 
FROM commission_notifications 
WHERE user_email = 'user@example.com';
```

### Webhook Not Triggering

1. Verify Paystack webhook URL is configured correctly in Paystack dashboard
2. Check webhook signature verification is passing
3. Review server logs for webhook errors

### Failed Commission Notifications

1. Check `commission_notifications` table for error messages
2. Verify `AFFILIATE_API_URL` and `AFFILIATE_API_SECRET` are set correctly
3. Test Affiliate System endpoint manually with curl:
   ```bash
   curl -X POST https://affiliate-system.com/api/commission \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_SECRET" \
     -d '{
       "referrer_id": "TEST",
       "user_email": "test@example.com",
       "amount": 100,
       "reference": "test_ref"
     }'
   ```

---

## Files Modified/Created

### New Files
- [supabase/sql/add_affiliate_tracking.sql](supabase/sql/add_affiliate_tracking.sql) - Database migration
- [lib/affiliate.ts](lib/affiliate.ts) - Affiliate commission service
- `AFFILIATE_SYSTEM.md` (this file) - Documentation

### Modified Files
- [app/login/page.tsx](app/login/page.tsx) - Capture referral ID from URL
- [app/dashboard/page.tsx](app/dashboard/page.tsx) - Pass referral ID to auth callback
- [app/api/auth/callback/route.ts](app/api/auth/callback/route.ts) - Accept referrerId parameter
- [lib/db.server.ts](lib/db.server.ts) - Save referrer_id to profile
- [app/api/paystack-webhook/route.ts](app/api/paystack-webhook/route.ts) - Notify affiliate system
- [.env.local.example](.env.local.example) - Add affiliate config vars

---

## Future Enhancements

### Potential Improvements

1. **Admin Dashboard**: View all commission notifications in a UI
2. **Webhook Retry Queue**: Use a job queue (BullMQ, Inngest) for better reliability
3. **Commission Amounts**: Configure different commission rates per plan
4. **Multi-tier Referrals**: Support multiple levels of referrals
5. **Analytics**: Track conversion rates by referrer
6. **Testing Mode**: Sandbox mode for testing without real commissions

---

## Support

For questions or issues with the affiliate system:

1. Check the [commission_notifications](supabase/sql/add_affiliate_tracking.sql) table for error logs
2. Review server logs for detailed error messages
3. Test the Affiliate System API endpoint independently
4. Verify environment variables are set correctly

---

## Summary

✅ **Referral tracking**: URLs with `?ref=AFFILIATE123` are captured and stored  
✅ **Conditional commission**: Only activated users (paid) trigger commissions  
✅ **Idempotency**: Duplicate commissions are prevented at database level  
✅ **Security**: Webhook signatures verified, API tokens required  
✅ **Reliability**: Automatic retries with exponential backoff  
✅ **Logging**: All attempts recorded in database for auditing  

The system is production-ready and follows best practices for payment integrations and external API notifications.
