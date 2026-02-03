/**
 * Diagnostic script to check user commission status
 * Usage: npx tsx scripts/check-user-commission.ts
 */

import { supabaseAdmin } from '../lib/supabaseAdmin';

const USER_EMAIL = 'clintonochieng070@gmail.com';

async function checkUserCommission() {
  console.log(`\n🔍 Checking commission status for: ${USER_EMAIL}\n`);

  // 1. Check if user exists and get their data
  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('*')
    .eq('email', USER_EMAIL)
    .maybeSingle();

  if (profileError) {
    console.error('❌ Error fetching user profile:', profileError);
    return;
  }

  if (!profile) {
    console.error('❌ User not found in database');
    return;
  }

  console.log('✅ User found in database');
  console.log(`   - User ID: ${profile.user_id}`);
  console.log(`   - Email: ${profile.email}`);
  console.log(`   - Referrer ID: ${profile.referrer_id || 'NOT SET ❌'}`);
  console.log(`   - Subscription Active: ${profile.subscription_active ? 'YES ✅' : 'NO ❌'}`);
  console.log(`   - Plan: ${profile.plan || 'None'}`);
  console.log(`   - Has Paid: ${profile.has_paid ? 'YES' : 'NO'}`);

  // 2. Check commission notifications
  console.log('\n📋 Commission Notification History:');
  const { data: notifications, error: notifError } = await supabaseAdmin
    .from('commission_notifications')
    .select('*')
    .eq('user_id', profile.user_id)
    .order('created_at', { ascending: false });

  if (notifError) {
    console.error('❌ Error fetching notifications:', notifError);
    return;
  }

  if (!notifications || notifications.length === 0) {
    console.log('   ⚠️  NO commission notifications found');
    
    // Check environment variables
    console.log('\n🔧 Environment Configuration:');
    console.log(`   - AFFILIATE_API_URL: ${process.env.AFFILIATE_API_URL || 'NOT SET ❌'}`);
    console.log(`   - AFFILIATE_API_SECRET: ${process.env.AFFILIATE_API_SECRET ? 'SET ✅' : 'NOT SET ❌'}`);

    if (!profile.referrer_id) {
      console.log('\n❌ ROOT CAUSE: User has no referrer_id');
      console.log('   This user did not sign up through an affiliate link.');
      console.log('   No commission should be awarded.');
    } else if (!profile.subscription_active) {
      console.log('\n❌ ROOT CAUSE: Subscription is not active');
      console.log('   User needs to complete payment for commission to be triggered.');
    } else if (!process.env.AFFILIATE_API_URL) {
      console.log('\n❌ ROOT CAUSE: AFFILIATE_API_URL not configured');
      console.log('   Add AFFILIATE_API_URL to environment variables.');
    } else {
      console.log('\n⚠️  User qualifies but notification was never sent');
      console.log('   This could indicate a webhook processing issue.');
    }
  } else {
    console.log(`   Found ${notifications.length} notification(s):\n`);
    notifications.forEach((notif, index) => {
      console.log(`   [${index + 1}] Status: ${notif.status}`);
      console.log(`       - Referrer ID: ${notif.referrer_id}`);
      console.log(`       - Amount: ${notif.amount}`);
      console.log(`       - Payment Reference: ${notif.payment_reference}`);
      console.log(`       - Retry Count: ${notif.retry_count}`);
      console.log(`       - Created: ${notif.created_at}`);
      if (notif.error_message) {
        console.log(`       - Error: ${notif.error_message}`);
      }
      if (notif.response_data) {
        console.log(`       - Response: ${JSON.stringify(notif.response_data).substring(0, 100)}...`);
      }
      console.log('');
    });

    // Check latest status
    const latest = notifications[0];
    if (latest.status === 'failed') {
      console.log('❌ Latest notification FAILED');
      console.log('   Consider running the retry endpoint or checking affiliate system logs.');
    } else if (latest.status === 'success') {
      console.log('✅ Latest notification SUCCEEDED');
      console.log('   Commission should be visible in affiliate dashboard.');
      console.log('   If not, check the affiliate system\'s logs.');
    }
  }

  console.log('\n📊 Summary:');
  const hasReferrer = Boolean(profile.referrer_id);
  const isActive = Boolean(profile.subscription_active);
  const hasNotification = notifications && notifications.length > 0;
  const lastStatus = hasNotification ? notifications[0].status : 'none';

  if (hasReferrer && isActive && lastStatus === 'success') {
    console.log('✅ Everything looks good! Commission should be awarded.');
  } else {
    console.log('⚠️  Issue detected:');
    if (!hasReferrer) console.log('   - No referrer_id (user didn\'t use affiliate link)');
    if (!isActive) console.log('   - Subscription not active');
    if (!hasNotification) console.log('   - No notification sent');
    if (hasNotification && lastStatus === 'failed') console.log('   - Notification failed');
  }

  console.log('');
}

checkUserCommission()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
