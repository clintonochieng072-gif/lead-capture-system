/**
 * Force Delete All Users Script
 * 
 * This script deletes all users WITHOUT confirmation prompts
 * Use with caution!
 * 
 * Usage:
 *   npm run delete-all-users
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

async function deleteAllUsers() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   DELETE ALL USERS                     ║');
  console.log('╚════════════════════════════════════════╝\n');

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
  console.log(`   - Commission Notifications: ${commissionCount || 0}\n`);

  if (!profileCount && !linkCount && !leadCount && !commissionCount) {
    console.log('✅ Database is already empty\n');
    return;
  }

  console.log('🗑️  Deleting all data...\n');

  // Delete in correct order (respecting foreign key constraints)
  
  // 1. Delete commission notifications
  const { error: commissionError } = await supabase
    .from('commission_notifications')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (commissionError) {
    console.error('❌ Error deleting commission notifications:', commissionError);
  } else {
    console.log(`✅ Deleted ${commissionCount || 0} commission notification(s)`);
  }

  // 2. Delete leads
  const { error: leadsError } = await supabase
    .from('leads')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (leadsError) {
    console.error('❌ Error deleting leads:', leadsError);
  } else {
    console.log(`✅ Deleted ${leadCount || 0} lead(s)`);
  }

  // 3. Delete tracking links
  const { error: linksError } = await supabase
    .from('tracking_links')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000');

  if (linksError) {
    console.error('❌ Error deleting tracking links:', linksError);
  } else {
    console.log(`✅ Deleted ${linkCount || 0} tracking link(s)`);
  }

  // 4. Delete profiles
  const { error: profilesError } = await supabase
    .from('profiles')
    .delete()
    .neq('user_id', '00000000-0000-0000-0000-000000000000');

  if (profilesError) {
    console.error('❌ Error deleting profiles:', profilesError);
  } else {
    console.log(`✅ Deleted ${profileCount || 0} profile(s)`);
  }

  // 5. Delete auth users
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

  console.log('\n🎉 All users deleted! Database is now fresh.\n');
}

deleteAllUsers().catch((error) => {
  console.error('❌ Script error:', error);
  process.exit(1);
});
