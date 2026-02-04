/**
 * Manual Referrer ID Update Script
 * 
 * Use this to manually set a referrer_id for a user (for testing or fixing missing data)
 * 
 * Usage:
 *   npm run set-referrer -- --email=user@example.com --referrer=AFFILIATE123
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
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

// Parse command line arguments
const args = process.argv.slice(2);
const emailArg = args.find(arg => arg.startsWith('--email='));
const referrerArg = args.find(arg => arg.startsWith('--referrer='));

const email = emailArg ? emailArg.split('=')[1] : null;
const referrerId = referrerArg ? referrerArg.split('=')[1] : null;

if (!email || !referrerId) {
  console.error('❌ Missing required parameters');
  console.error('Usage:');
  console.error('  npm run set-referrer -- --email=user@example.com --referrer=AFFILIATE123');
  process.exit(1);
}

async function setReferrerId() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   SET REFERRER ID                      ║');
  console.log('╚════════════════════════════════════════╝\n');

  console.log(`📧 Email: ${email}`);
  console.log(`🔗 Referrer ID: ${referrerId}\n`);

  // Find user by email
  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    console.error('❌ Error finding user:', findError);
    process.exit(1);
  }

  if (!profile) {
    console.error(`❌ No user found with email: ${email}`);
    process.exit(1);
  }

  console.log(`✅ Found user: ${profile.email}`);
  console.log(`   Current referrer_id: ${profile.referrer_id || '(none)'}`);
  console.log(`   Subscription active: ${profile.subscription_active ? 'Yes' : 'No'}\n`);

  if (profile.referrer_id && profile.referrer_id !== referrerId) {
    console.warn(`⚠️  User already has referrer_id: ${profile.referrer_id}`);
    console.warn(`   This will overwrite it with: ${referrerId}\n`);
  }

  // Update referrer_id
  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      referrer_id: referrerId,
      updated_at: new Date().toISOString()
    })
    .eq('user_id', profile.user_id)
    .select()
    .single();

  if (updateError) {
    console.error('❌ Error updating referrer_id:', updateError);
    process.exit(1);
  }

  console.log('✅ Successfully updated referrer_id!\n');
  console.log('📊 Updated profile:');
  console.log(`   Email: ${updated.email}`);
  console.log(`   Referrer ID: ${updated.referrer_id}`);
  console.log(`   Subscription active: ${updated.subscription_active ? 'Yes' : 'No'}\n`);

  // Check if this should trigger a commission
  if (updated.subscription_active && updated.referrer_id) {
    console.log('💰 NOTE: This user has an active subscription!');
    console.log('   You may want to manually trigger a commission notification.');
    console.log('   Use: npm run retry-commission -- --email=' + email);
  } else if (!updated.subscription_active) {
    console.log('ℹ️  User is not active yet. Commission will be sent when they subscribe.');
  }

  console.log('\n✅ Done!\n');
}

setReferrerId().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
