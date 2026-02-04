# User Reset Script

This script helps you reset your system after testing by either deactivating subscriptions or completely deleting all user data.

## Prerequisites

Make sure you have the following environment variables set in your `.env.local`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Usage

### Option 1: Mark All Users as Unpaid (Deactivate Subscriptions)

This option keeps all user data but marks all subscriptions as inactive. Users will need to resubscribe.

```bash
npm run reset-users -- --mode=deactivate
```

**What it does:**
- ✅ Deactivates all active subscriptions
- ✅ Keeps all user accounts
- ✅ Keeps all tracking links
- ✅ Keeps all captured leads
- ✅ Keeps commission notifications

### Option 2: Delete ALL User Data (Nuclear Option)

⚠️ **WARNING: This permanently deletes everything!**

```bash
npm run reset-users -- --mode=delete
```

**What it deletes:**
- 🗑️ All commission notifications
- 🗑️ All captured leads
- 🗑️ All tracking links
- 🗑️ All user profiles
- 🗑️ All authentication records

**This action cannot be undone!**

## Safety Features

- **Confirmation prompts**: The script will ask for confirmation before making changes
- **Double confirmation for delete**: For the delete mode, you'll need to confirm twice
- **Database counts**: Shows you exactly how many records will be affected
- **Detailed logging**: Clear output of what's being done

## Examples

### Deactivate all subscriptions
```bash
npm run reset-users -- --mode=deactivate
```

Output:
```
🔄 Deactivating all user subscriptions...

📊 Found 5 active subscriptions

⚠️  This will deactivate 5 subscription(s). Continue? (yes/no): yes

✅ Successfully deactivated 5 subscription(s)

📋 Summary:
   - All users are now marked as unpaid
   - User accounts and data remain intact
   - Users will need to resubscribe to access the system
```

### Delete all user data
```bash
npm run reset-users -- --mode=delete
```

Output:
```
🔥 NUCLEAR OPTION: Delete all user data

📊 Current database state:
   - Profiles: 10
   - Tracking Links: 15
   - Leads: 47
   - Commission Notifications: 3

⚠️  WARNING: This will DELETE:
   1. All commission notifications
   2. All captured leads
   3. All tracking links
   4. All user profiles
   5. All auth.users (from Supabase Auth)

   THIS CANNOT BE UNDONE!

🚨 Type "yes" to permanently delete ALL user data (yes/no): yes
🚨 Are you ABSOLUTELY SURE? This will wipe the entire database (yes/no): yes

🗑️  Deleting data...

✅ Deleted 3 commission notification(s)
✅ Deleted 47 lead(s)
✅ Deleted 15 tracking link(s)
✅ Deleted 10 profile(s)
✅ Deleted 10 auth user(s)

🎉 Database reset complete!
   The system is now fresh and ready for production
```

## Troubleshooting

### Error: Missing environment variables
Make sure your `.env.local` file contains:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### Error: Permission denied
Make sure you're using the `SUPABASE_SERVICE_ROLE_KEY` (not the anon key) which has admin privileges.

## When to Use

### Use `--mode=deactivate` when:
- ✅ You want to test the subscription flow again
- ✅ You want to keep user data but reset payment status
- ✅ You're moving from testing to production

### Use `--mode=delete` when:
- ✅ You have test accounts you want to remove completely
- ✅ You want a completely fresh database
- ✅ You're sure you don't need any of the current data

## Notes

- The script uses the Supabase service role key for admin access
- All deletions respect foreign key constraints and cascade properly
- The delete operation removes users from both the database and Supabase Auth
