/**
 * Reset Users Script
 * 
 * This script helps you reset the system by either:
 * 1. Marking all users as unpaid (deactivate subscriptions)
 * 2. Completely deleting all user data
 * 
 * Usage:
 *   npm run reset-users -- --mode=deactivate  (mark all as unpaid)
 *   npm run reset-users -- --mode=delete      (delete all user data)
 * 
 * IMPORTANT: This script uses the service role key and has full admin access
 */

import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from .env.local
const envLocalPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath });
  console.log('✅ Loaded .env.local file\n');
} else {
  console.log('⚠️  No .env.local file found, using process.env\n');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Get command line arguments
const args = process.argv.slice(2);
const modeArg = args.find(arg => arg.startsWith('--mode='));
const mode = modeArg ? modeArg.split('=')[1] : null;

if (!mode || !['deactivate', 'delete'].includes(mode)) {
  console.error('❌ Invalid or missing mode');
  console.error('Usage:');
  console.error('  npm run reset-users -- --mode=deactivate  (mark all as unpaid)');
  console.error('  npm run reset-users -- --mode=delete      (delete all user data)');
  process.exit(1);
}

/**
 * Ask for user confirmation
 */
async function askConfirmation(question: string): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise((resolve) => {
    rl.question(question + ' (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

/**
 * Mode 1: Deactivate all subscriptions (mark as unpaid)
 */
async function deactivateAllSubscriptions() {
  console.log('\n🔄 Deactivating all user subscriptions...\n');

  // Get count of active subscriptions
  const { count: activeCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true })
    .eq('subscription_active', true);

  console.log(`📊 Found ${activeCount || 0} active subscriptions`);

  if (!activeCount) {
    console.log('✅ No active subscriptions to deactivate');
    return;
  }

  const confirmed = await askConfirmation(
    `\n⚠️  This will deactivate ${activeCount} subscription(s). Continue?`
  );

  if (!confirmed) {
    console.log('❌ Operation cancelled');
    return;
  }

  // Deactivate all subscriptions
  const { data, error } = await supabase
    .from('profiles')
    .update({
      subscription_active: false,
      subscription_expires_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('subscription_active', true)
    .select();

  if (error) {
    console.error('❌ Error deactivating subscriptions:', error);
    return;
  }

  console.log(`✅ Successfully deactivated ${data?.length || 0} subscription(s)`);
  console.log('\n📋 Summary:');
  console.log(`   - All users are now marked as unpaid`);
  console.log(`   - User accounts and data remain intact`);
  console.log(`   - Users will need to resubscribe to access the system`);
}

/**
 * Mode 2: Delete all user data (nuclear option)
 */
async function deleteAllUserData() {
  console.log('\n🔥 NUCLEAR OPTION: Delete all user data\n');

  // Get counts
  const { count: profileCount } = await supabase
    .from('profiles')
    .select('*', { count: 'exact', head: true });

  const { count: linkCount } = await supabase
    .from('tracking_links')
    .select('*', { count: 'exact', head: true });

  const { count: leadCount } = await supabase
    .from('leads')
    .select('*', { count: 'exact', head: true });

  const { count: commissionCount } = await supabase
    .from('commission_notifications')
    .select('*', { count: 'exact', head: true });

  console.log('📊 Current database state:');
  console.log(`   - Profiles: ${profileCount || 0}`);
  console.log(`   - Tracking Links: ${linkCount || 0}`);
  console.log(`   - Leads: ${leadCount || 0}`);
  console.log(`   - Commission Notifications: ${commissionCount || 0}`);

  if (!profileCount && !linkCount && !leadCount && !commissionCount) {
    console.log('\n✅ Database is already empty');
    return;
  }

  console.log('\n⚠️  WARNING: This will DELETE:');
  console.log('   1. All commission notifications');
  console.log('   2. All captured leads');
  console.log('   3. All tracking links');
  console.log('   4. All user profiles');
  console.log('   5. All auth.users (from Supabase Auth)');
  console.log('\n   THIS CANNOT BE UNDONE!');

  const confirmed = await askConfirmation(
    '\n🚨 Type "yes" to permanently delete ALL user data'
  );

  if (!confirmed) {
    console.log('❌ Operation cancelled');
    return;
  }

  // Additional confirmation for safety
  const doubleConfirmed = await askConfirmation(
    '🚨 Are you ABSOLUTELY SURE? This will wipe the entire database'
  );

  if (!doubleConfirmed) {
    console.log('❌ Operation cancelled');
    return;
  }

  console.log('\n🗑️  Deleting data...\n');

  // Delete in correct order (respecting foreign key constraints)
  
  // 1. Delete commission notifications
  const { error: commissionError } = await supabase
    .from('commission_notifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (commissionError) {
    console.error('❌ Error deleting commission notifications:', commissionError);
  } else {
    console.log(`✅ Deleted ${commissionCount || 0} commission notification(s)`);
  }

  // 2. Delete leads
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (leadsError) {
    console.error('❌ Error deleting leads:', leadsError);
  } else {
    console.log(`✅ Deleted ${leadCount || 0} lead(s)`);
  }

  // 3. Delete tracking links
  const { error: linksError } = await supabase
    .from('tracking_links')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (linksError) {
    console.error('❌ Error deleting tracking links:', linksError);
  } else {
    console.log(`✅ Deleted ${linkCount || 0} tracking link(s)`);
  }

  // 4. Delete profiles
  const { error: profilesError } = await supabase
    .from('profiles')
    .delete()
    .neq('user_id', '00000000-0000-0000-0000-000000000000'); // Delete all

  if (profilesError) {
    console.error('❌ Error deleting profiles:', profilesError);
  } else {
    console.log(`✅ Deleted ${profileCount || 0} profile(s)`);
  }

  // 5. Delete auth users (this will cascade delete profiles via foreign key)
  const { data: authUsers, error: listError } = await supabase.auth.admin.listUsers();
  
  if (listError) {
    console.error('❌ Error listing auth users:', listError);
  } else if (authUsers?.users) {
    let deletedCount = 0;
    for (const user of authUsers.users) {
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      if (!deleteError) {
        deletedCount++;
      } else {
        console.error(`❌ Error deleting user ${user.email}:`, deleteError);
      }
    }
    console.log(`✅ Deleted ${deletedCount} auth user(s)`);
  }

  console.log('\n🎉 Database reset complete!');
  console.log('   The system is now fresh and ready for production');
}

/**
 * Main execution
 */
async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   USER RESET SCRIPT                    ║');
  console.log('╚════════════════════════════════════════╝');

  if (mode === 'deactivate') {
    await deactivateAllSubscriptions();
  } else if (mode === 'delete') {
    await deleteAllUserData();
  }

  console.log('\n✅ Script completed\n');
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
