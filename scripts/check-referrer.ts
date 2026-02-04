/**
 * Check Referrer ID Script
 * 
 * Checks all users in the database and shows their referrer_id status
 * This helps debug affiliate tracking issues
 * 
 * Usage:
 *   npm run check-referrer
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('✅ Loaded .env.local file\n');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function checkReferrers() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   REFERRER ID CHECK                    ║');
  console.log('╚════════════════════════════════════════╝\n');

  // Get all profiles
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('user_id, email, referrer_id, subscription_active, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching profiles:', error);
    process.exit(1);
  }

  if (!profiles || profiles.length === 0) {
    console.log('📭 No users found in database');
    process.exit(0);
  }

  console.log(`📊 Found ${profiles.length} user(s)\n`);
  console.log('─'.repeat(120));
  console.log(
    '│ ' +
    'Email'.padEnd(35) + ' │ ' +
    'Referrer ID'.padEnd(20) + ' │ ' +
    'Active'.padEnd(8) + ' │ ' +
    'Created At'.padEnd(25) + ' │'
  );
  console.log('─'.repeat(120));

  let withReferrer = 0;
  let withoutReferrer = 0;
  let activeWithReferrer = 0;

  for (const profile of profiles) {
    const email = (profile.email || 'N/A').substring(0, 33);
    const referrerId = profile.referrer_id || '(none)';
    const isActive = profile.subscription_active ? '✅ Yes' : '❌ No';
    const createdAt = new Date(profile.created_at).toLocaleString();

    if (profile.referrer_id) {
      withReferrer++;
      if (profile.subscription_active) {
        activeWithReferrer++;
      }
    } else {
      withoutReferrer++;
    }

    console.log(
      '│ ' +
      email.padEnd(35) + ' │ ' +
      referrerId.padEnd(20) + ' │ ' +
      isActive.padEnd(8) + ' │ ' +
      createdAt.padEnd(25) + ' │'
    );
  }

  console.log('─'.repeat(120));
  console.log('\n📈 Summary:');
  console.log(`   Total users: ${profiles.length}`);
  console.log(`   With referrer_id: ${withReferrer} (${Math.round(withReferrer / profiles.length * 100)}%)`);
  console.log(`   Without referrer_id: ${withoutReferrer} (${Math.round(withoutReferrer / profiles.length * 100)}%)`);
  console.log(`   Active users with referrer: ${activeWithReferrer} (should trigger commissions)`);

  // Check commission notifications
  const { data: notifications, error: notifError } = await supabase
    .from('commission_notifications')
    .select('*')
    .order('created_at', { ascending: false });

  if (!notifError && notifications) {
    console.log(`\n💰 Commission Notifications: ${notifications.length}`);
    if (notifications.length > 0) {
      console.log('   Recent notifications:');
      for (const notif of notifications.slice(0, 5)) {
        const status = notif.status === 'success' ? '✅' : notif.status === 'pending' ? '⏳' : '❌';
        console.log(`   ${status} ${notif.user_email} → ${notif.referrer_id} (${notif.status})`);
      }
    }
  }

  console.log('\n✅ Check completed\n');
}

checkReferrers().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
