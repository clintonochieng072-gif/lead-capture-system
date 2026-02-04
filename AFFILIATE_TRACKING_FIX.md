# Affiliate Tracking Issue - Diagnosis & Solutions

## Problem Summary

**Issue**: Users referred by affiliates are signing up and activating their accounts, but:
1. ❌ The `referrer_id` is NOT being captured in the database
2. ❌ Commission notifications are NOT being sent to the affiliate system

## Root Cause Analysis

After checking your database with `npm run check-referrer`, we found:
- **3 users** in the system
- **0 users** with a `referrer_id` (0%)
- **0 commission notifications** sent

### Why the referrer_id is not being captured:

The issue is with the **sessionStorage** approach during OAuth flow. Here's what's happening:

1. ✅ User clicks affiliate link: `https://leads.clintonstack.com/login?ref=AFFILIATE123`
2. ✅ [login/page.tsx](app/login/page.tsx) stores referrer in `sessionStorage`
3. ✅ User clicks "Continue with Google"
4. ⚠️ **Browser redirects to Google OAuth (sessionStorage MAY be lost)**
5. ⚠️ **Google redirects back to `/dashboard`**
6. ❌ **sessionStorage might be empty by this point**
7. ❌ No `referrer_id` is passed to `/api/auth/callback`

### The Problem with sessionStorage

- SessionStorage can be **cleared** during external redirects (like OAuth)
- Different browsers handle this differently (Chrome vs Safari vs Firefox)
- This makes affiliate tracking **unreliable**

## Solutions

### Solution 1: Use localStorage Instead (Quick Fix)

localStorage persists better across redirects than sessionStorage.

**Change in [app/login/page.tsx](app/login/page.tsx):**

Replace:
```typescript
sessionStorage.setItem('referrer_id', ref.trim());
```

With:
```typescript
localStorage.setItem('referrer_id', ref.trim());
```

**Change in [app/dashboard/page.tsx](app/dashboard/page.tsx):**

Replace:
```typescript
const referrerId = typeof window !== 'undefined' ? sessionStorage.getItem('referrer_id') : null;
```

With:
```typescript
const referrerId = typeof window !== 'undefined' ? localStorage.getItem('referrer_id') : null;
```

And:
```typescript
sessionStorage.removeItem('referrer_id');
```

With:
```typescript
localStorage.removeItem('referrer_id');
```

### Solution 2: Use URL State Parameter (Most Reliable)

Pass the referrer through the OAuth redirectTo URL.

**Change in [app/login/page.tsx](app/login/page.tsx):**

```typescript
const handleGoogleSignIn = async () => {
  try {
    setLoading(true);
    
    // Capture referrer from URL
    const urlParams = new URLSearchParams(window.location.search);
    const ref = urlParams.get('ref');
    
    // Build redirect URL with referrer parameter
    let redirectTo = `${window.location.origin}/dashboard`;
    if (ref && ref.trim() !== '') {
      redirectTo += `?ref=${encodeURIComponent(ref.trim())}`;
    }
    
    await supabaseClient.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo } 
    });
  } catch (err) {
    console.error('OAuth error', err);
    setLoading(false);
    alert('Failed to start Google sign-in.');
  }
};
```

**Change in [app/dashboard/page.tsx](app/dashboard/page.tsx):**

```typescript
const refreshDashboard = React.useCallback(async () => {
  setLoading(true);
  const { data: { session } } = await supabaseClient.auth.getSession();

  if (!session?.user) {
    router.push('/');
    return;
  }

  setUser(session.user);
  setSyncing(true);

  try {
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!profile) {
      // Get referrer from URL parameter (most reliable)
      const urlParams = new URLSearchParams(window.location.search);
      const referrerId = urlParams.get('ref');
      
      const validReferrerId = referrerId && referrerId.trim() !== '' ? referrerId.trim() : null;
      
      await fetch('/api/auth/callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.user.id,
          email: session.user.email,
          fullName: session.user.user_metadata?.full_name,
          referrerId: validReferrerId || undefined
        })
      });
    }
    
    // ... rest of the code
```

### Solution 3: Cookie-Based Tracking (Production Grade)

Use HTTP-only cookies for maximum reliability and security. This requires server-side middleware.

## Manual Fix for Existing Users

For the user who just signed up, you can manually set their referrer_id:

```bash
npm run set-referrer -- --email=USER_EMAIL_HERE --referrer=AFFILIATE_CODE_HERE
```

Example:
```bash
npm run set-referrer -- --email=clintonochieng073@gmail.com --referrer=CLINTON123
```

This will:
1. Find the user by email
2. Set their `referrer_id`
3. Check if they qualify for commission

If they already have an active subscription, you'll need to manually trigger the commission notification.

## Testing the Fix

### Step 1: Implement Solution 2 (URL State - Recommended)

I'll implement this for you now.

### Step 2: Test the Flow

1. Use this test URL: `http://localhost:3000/login?ref=TESTREF123`
2. Sign in with Google
3. After redirect, run: `npm run check-referrer`
4. Verify the new user has `referrer_id: TESTREF123`

### Step 3: Test Commission Notification

1. Activate subscription for the test user
2. Check logs for: `"User XXX qualifies for affiliate commission"`
3. Verify commission was sent to affiliate system

## Prevention

**Always test affiliate links with this pattern:**
```
https://leads.clintonstack.com/login?ref=YOUR_AFFILIATE_CODE
```

**Monitor with the diagnostic script:**
```bash
npm run check-referrer
```

This shows you:
- How many users have referrer_ids
- Which users qualify for commissions
- Commission notification history

## Quick Commands Reference

```bash
# Check all users and their referrer status
npm run check-referrer

# Manually set a referrer for a user
npm run set-referrer -- --email=user@example.com --referrer=AFFILIATE123

# Reset all users (deactivate subscriptions)
npm run reset-users -- --mode=deactivate

# Delete all users (nuclear option)
npm run reset-users -- --mode=delete
```
