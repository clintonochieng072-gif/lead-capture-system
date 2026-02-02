# Affiliate System - Quick Setup Guide

## 🚀 Quick Start (5 Steps)

### Step 1: Run Database Migration

```sql
-- Run this in Supabase SQL Editor
-- File: supabase/sql/add_affiliate_tracking.sql
```

This creates:
- `referrer_id` column in `profiles` table
- `commission_notifications` table for tracking

### Step 2: Configure Environment Variables

Add to your `.env.local` (or production environment):

```env
# Required
AFFILIATE_API_URL=https://affiliate-system.com/api/commission
AFFILIATE_API_SECRET=your-secret-token

# Optional (for cron job security)
CRON_SECRET=random-secret-for-cron-endpoints
```

### Step 3: Deploy Code

All code changes are already implemented. Just deploy!

### Step 4: Test with Referral Link

```
https://your-app.com/login?ref=AFFILIATE123
```

1. Visit URL with `?ref=` parameter
2. Sign up through Google OAuth
3. Complete payment to activate
4. Check database for commission notification

### Step 5: Monitor Commissions

Query database to see all commission attempts:

```sql
SELECT * FROM commission_notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 📊 How It Works (Visual Flow)

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. User arrives via affiliate link                              │
│    https://your-app.com/login?ref=AFFILIATE123                  │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 2. System captures referral ID                                  │
│    - Stored in sessionStorage                                   │
│    - Persisted through OAuth flow                               │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 3. User signs up                                                │
│    - Google OAuth authentication                                │
│    - referrer_id saved to profiles table                        │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 4. User completes payment (Paystack)                            │
│    - Subscription activated in database                         │
│    - Paystack webhook triggered                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 5. Commission check (both conditions must be TRUE)              │
│    ✓ Has referrer_id? (came through affiliate link)             │
│    ✓ Has subscription_active? (paid and activated)              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼ (both conditions met)
┌─────────────────────────────────────────────────────────────────┐
│ 6. Notify Affiliate System                                      │
│    POST https://affiliate-system.com/api/commission             │
│    {                                                            │
│      "referrer_id": "AFFILIATE123",                             │
│      "user_email": "user@example.com",                          │
│      "amount": 49900,                                           │
│      "reference": "paystack_ref_123"                            │
│    }                                                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ 7. Record in database (idempotency)                             │
│    - Status: success/failed                                     │
│    - Prevents duplicate notifications                           │
│    - Retry logic for failures                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Key Features

| Feature | Implementation |
|---------|----------------|
| **Referral Tracking** | Captures `?ref=` parameter and stores in database |
| **Conditional Commission** | Only awards if user has referrer AND is activated |
| **Security** | Verifies Paystack webhooks + authenticates API calls |
| **Idempotency** | Database constraint prevents duplicates |
| **Retry Logic** | 3 attempts with exponential backoff |
| **Logging** | All attempts logged in `commission_notifications` |

---

## 🔍 Testing Checklist

- [ ] **Test 1**: User without referral → No commission sent ✓
- [ ] **Test 2**: User with referral + payment → Commission sent ✓
- [ ] **Test 3**: User with referral + no payment → No commission ✓
- [ ] **Test 4**: Duplicate webhook → No duplicate commission ✓

### Test Commands

```sql
-- Check if referral was captured
SELECT email, referrer_id, subscription_active 
FROM profiles 
WHERE email = 'test@example.com';

-- Check commission notifications
SELECT * FROM commission_notifications 
WHERE user_email = 'test@example.com';

-- Check for failed commissions
SELECT * FROM commission_notifications 
WHERE status = 'failed';
```

---

## 🛠️ Troubleshooting

### Problem: Commission not sent

**Solution 1**: Check if user has referrer_id
```sql
SELECT referrer_id FROM profiles WHERE email = 'user@example.com';
```

**Solution 2**: Check if user is activated
```sql
SELECT subscription_active FROM profiles WHERE email = 'user@example.com';
```

**Solution 3**: Check commission notification logs
```sql
SELECT * FROM commission_notifications WHERE user_email = 'user@example.com';
```

### Problem: Failed commission notifications

**Solution 1**: Check error message
```sql
SELECT error_message, retry_count 
FROM commission_notifications 
WHERE status = 'failed';
```

**Solution 2**: Manually retry
```bash
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-app.com/api/retry-commissions
```

**Solution 3**: Test affiliate API directly
```bash
curl -X POST https://affiliate-system.com/api/commission \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SECRET" \
  -d '{"referrer_id":"TEST","user_email":"test@test.com","amount":100,"reference":"test"}'
```

---

## 📁 Files Changed

### New Files
- `supabase/sql/add_affiliate_tracking.sql` - Database migration
- `lib/affiliate.ts` - Commission service
- `app/api/retry-commissions/route.ts` - Manual retry endpoint
- `AFFILIATE_SYSTEM.md` - Full documentation
- `AFFILIATE_QUICK_START.md` - This file

### Modified Files
- `app/login/page.tsx` - Capture `?ref=` parameter
- `app/dashboard/page.tsx` - Pass referral to callback
- `app/api/auth/callback/route.ts` - Accept referrerId
- `lib/db.server.ts` - Save referrer_id
- `app/api/paystack-webhook/route.ts` - Notify affiliate system
- `.env.local.example` - Add config variables

---

## 🎯 Next Steps

1. ✅ Run database migration
2. ✅ Set environment variables
3. ✅ Deploy code
4. ✅ Test with referral link
5. ✅ Monitor commission notifications
6. ⏰ (Optional) Set up cron job for retries

---

## 📞 Support

For detailed documentation, see [AFFILIATE_SYSTEM.md](AFFILIATE_SYSTEM.md)

Key sections:
- **Testing**: Comprehensive test scenarios
- **API Integration**: Affiliate System requirements
- **Troubleshooting**: Common issues and solutions
- **Security**: Best practices
- **Monitoring**: Database queries for tracking

---

## ⚡ Performance Notes

- Commission notifications run **asynchronously** (don't block webhook)
- Failed notifications are **retried automatically** (up to 3 times)
- Database has **unique constraint** to prevent duplicates
- All operations are **logged** for auditing

---

## 🔐 Security Checklist

- [x] Paystack webhook signature verified
- [x] Affiliate API requires authentication token
- [x] Sensitive data in environment variables (not code)
- [x] Row Level Security on commission_notifications table
- [x] Idempotency checks prevent duplicate awards
- [x] CRON_SECRET protects retry endpoint

---

**That's it! Your affiliate system is ready to go! 🎉**
