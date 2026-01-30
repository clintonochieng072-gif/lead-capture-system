# Paystack Integration Setup Guide

This guide explains how to configure Paystack webhook and callback URLs for the lead capture system using your custom domain `leads.clintonstack.com`.

## Quick Setup

### 1. Prerequisites
- Custom domain: `leads.clintonstack.com`
- Domain must be pointing to your Vercel deployment
- Paystack account (Sandbox for testing, Live for production)
- Environment variables configured (see `.env.paystack.example`)

### 2. Paystack Webhook Configuration (Dashboard)

**Steps:**
1. Log into your Paystack Dashboard
2. Go to **Settings** → **API Keys & Webhooks**
3. Scroll to **Webhook URLs**

**Configure the following:**

#### Sandbox/Test Environment:
- **Webhook URL:** `https://leads.clintonstack.com/api/paystack-webhook`
- **Events to listen for:**
  - `charge.success` — Payment successful; we activate the subscription
  - `charge.failed` — Payment failed; we deactivate the subscription

#### Live Environment:
- Use the same URL: `https://leads.clintonstack.com/api/paystack-webhook`
- The `PAYSTACK_SECRET_KEY` environment variable determines sandbox vs. live mode

### 3. Paystack Callback Configuration

**Steps:**
1. In Paystack Dashboard, go to **Settings** → **API Keys & Webhooks**
2. Look for **Callback URL** or **Return URL** section

**Configure the following:**

#### Both Sandbox and Live:
- **Callback URL:** `https://leads.clintonstack.com/api/verify-subscription`

After successful payment, Paystack redirects the user to this URL with a `?reference=<transaction_ref>` query parameter.

## Environment Variables

Ensure these are set in your deployment environment (Vercel):

```env
# Paystack (Sandbox - use sk_test_ prefix)
PAYSTACK_SECRET_KEY=sk_test_your_sandbox_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_test_your_sandbox_public_key_here

# Or Paystack (Live - use sk_live_ prefix)
PAYSTACK_SECRET_KEY=sk_live_your_live_secret_key_here
NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY=pk_live_your_live_public_key_here

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here

# App
NEXT_PUBLIC_APP_URL=https://leads.clintonstack.com
NODE_ENV=production
```

## Payment Flow

### User Path (Sandbox Testing)

1. **User initiates payment:**
   - Clicks "Pay Now" on `/subscription` page
   - Frontend calls `POST /api/init-subscription` with `{ planName, userId }`

2. **Backend initializes transaction:**
   - `POST /api/init-subscription` validates user and enforces Early Access limit
   - Calls Paystack API to create a transaction
   - Returns `authorization_url` (Paystack hosted payment page)

3. **User is redirected to Paystack:**
   - Frontend redirects user to the Paystack checkout page
   - User enters payment details (test card for sandbox)

4. **Two parallel flows after payment:**

   **A. Callback Flow (User Redirect):**
   - After payment, Paystack redirects to: `https://leads.clintonstack.com/api/verify-subscription?reference=<ref>`
   - `GET /api/verify-subscription` verifies the transaction
   - Updates Supabase: `subscription_active = true`, `subscription_expires_at = 30 days from now`
   - Redirects user to `/dashboard?subscription=success`

   **B. Webhook Flow (Server-to-Server):**
   - Paystack POSTs to `https://leads.clintonstack.com/api/paystack-webhook` with `charge.success` event
   - `POST /api/paystack-webhook` validates the HMAC signature
   - Updates Supabase with the same subscription data
   - This is a redundancy layer; ensures subscription is updated even if callback fails

### Test Cards (Sandbox Only)

Use these test card numbers in the Paystack sandbox:

| Card Number      | CVV | Expiry   | Status  |
|------------------|-----|----------|---------|
| 4111111111111111 | Any | Any date | Success |
| 5399999999999999 | Any | Any date | Failed  |

## Switching from Sandbox to Live

1. **Get Live Keys:**
   - In Paystack Dashboard → Settings → API Keys & Webhooks
   - Copy your **Secret Key** (starts with `sk_live_`)
   - Copy your **Public Key** (starts with `pk_live_`)

2. **Update Environment Variables:**
   - In Vercel → Project Settings → Environment Variables
   - Replace `PAYSTACK_SECRET_KEY` with your live secret key
   - Replace `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` with your live public key

3. **The webhook and callback URLs remain the same:**
   ```
   https://leads.clintonstack.com/api/paystack-webhook
   https://leads.clintonstack.com/api/verify-subscription
   ```
   (The `PAYSTACK_SECRET_KEY` environment variable determines sandbox vs. live)

4. **Test in Live:**
   - Use real test payment methods or process a small transaction
   - Verify that users can subscribe and are marked as active in the database

## Troubleshooting

### Webhook Not Being Called
- **Check:** Paystack Dashboard → Activity → Webhooks to see if requests are being sent
- **Verify:** The webhook URL is exactly `https://leads.clintonstack.com/api/paystack-webhook`
- **Verify:** Custom domain DNS is correctly pointing to Vercel

### Callback URL Not Being Triggered
- **Check:** Is the user being redirected after payment?
- **Verify:** The callback URL is exactly `https://leads.clintonstack.com/api/verify-subscription`
- **Test:** Manually visit `https://leads.clintonstack.com/api/verify-subscription?reference=<any_test_ref>` to test the endpoint

### Signature Verification Failing
- **Cause:** Secret key mismatch or raw request body corruption
- **Check:** Ensure `PAYSTACK_SECRET_KEY` is set correctly in the environment
- **Verify:** Your webhook logs show the signature error details

### User Not Marked as Subscribed
- **Check:** Are webhook or callback requests being received?
- **Check:** Supabase dashboard → `profiles` table → look for updated `subscription_active` and `subscription_expires_at`
- **Verify:** User `id` is being passed correctly in metadata

## Monitoring & Logging

All payment interactions are logged:

- **`/api/init-subscription`:** Logs validation errors, early access limit checks, Paystack API errors
- **`/api/verify-subscription`:** Logs transaction verification status, Supabase updates
- **`/api/paystack-webhook`:** Logs signature validation, event handling, subscription updates

Check Vercel project logs for debugging:
- Vercel Dashboard → Project → Deployments → Logs

## Security Notes

1. **Never commit secrets:** `.env.local` is in `.gitignore`
2. **PAYSTACK_SECRET_KEY is server-only:** The code will throw an error if `sk_test_` prefix is missing, preventing accidental live key exposure
3. **Webhook signature validation:** All webhook requests are validated using HMAC SHA512
4. **Callback verification:** Transactions are verified against Paystack API before marking as successful

## Support

For Paystack-specific issues, see:
- [Paystack Documentation](https://paystack.com/docs)
- [Paystack Webhooks Guide](https://paystack.com/docs/webhooks)
- Paystack Support: support@paystack.com
