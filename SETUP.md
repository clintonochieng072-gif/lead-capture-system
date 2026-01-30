# Lead Capture MVP - Complete Setup Guide

This document outlines all the steps needed to get your Lead Capture SaaS running locally and deployed to production.

## ✅ What's Already Done

- [x] Database schema created (profiles, tracking_links, leads)
- [x] RLS policies applied
- [x] Next.js project scaffolded with Tailwind CSS
- [x] Google OAuth integrated
- [x] API routes for lead submission
- [x] Dashboard with lead management
- [x] Public lead-capture form
- [x] Error handling and validation

## 🚀 Quick Start (5-10 minutes)

### 1. Create a Supabase Project

1. Go to https://supabase.com
2. Click "New Project"
3. Choose your organization and enter project name (e.g., "lead-capture-mvp")
4. Set database password (save this securely)
5. Choose region (recommended: closest to your users)
6. Click "Create New Project" and wait for setup

### 2. Deploy Database Schema

1. In your Supabase project, go to **SQL Editor**
2. Copy the SQL from `supabase/sql/create_tables.sql`
3. Paste into a new query
4. Click **Run**
5. Verify in **Table Editor** that you see:
   - `profiles`
   - `tracking_links`
   - `leads`

### 3. Configure Google OAuth

1. Go to **Google Cloud Console**: https://console.cloud.google.com
2. Create a new project (or use existing)
3. Enable "Google+ API"
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Choose **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/callback` (local dev)
   - `https://your-project.supabase.co/auth/v1/callback` (Supabase)
   - `https://yourdomain.com/auth/v1/callback` (production, once deployed)
7. Copy **Client ID** and **Client Secret**

8. In Supabase project → **Authentication** → **Providers** → **Google**:
   - Paste Client ID and Client Secret
   - Click **Save**

### 4. Fill Environment Variables

1. In your project root, copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Fill in the values from your Supabase project:

   **In Supabase → Settings → API:**
   - Copy **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copy **Anon Public Key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copy **Service Role Key** → `SUPABASE_SERVICE_ROLE_KEY`

   Example `.env.local`:
   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://abcdef123456.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   NODE_ENV=development
   ```

3. **IMPORTANT**: Never commit `.env.local` — it contains secrets!

### 5. Run Locally

```bash
# Install dependencies (if not done)
npm install

# Start dev server
npm run dev
```

Visit http://localhost:3000 in your browser.

## 🔍 Testing the System

### Test 1: Sign Up

1. Click "Continue with Google"
2. Sign in with your Google account
3. You should be redirected to dashboard
4. Dashboard should auto-create your profile and default tracking link

### Test 2: Set Target URL

1. In dashboard, click "Set Target URL"
2. Enter a URL (e.g., `https://example.com`)
3. Click OK
4. Verify it saves

### Test 3: Submit Lead

1. Copy your tracking link URL
2. Open it in a new tab
3. Fill in name and phone
4. Click "View Website →"
5. You should be redirected to your target URL
6. Go back to dashboard and verify the lead appears

### Test 4: Verify RLS

Try to access the database directly:
1. In Supabase → **SQL Editor** → New Query
2. Run:
   ```sql
   SELECT * FROM public.leads;
   ```
3. Should return empty (you have no anon access to other users' data due to RLS)

## 📦 File Structure

```
lead capture system/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   └── callback/route.ts       # Create profile on signup
│   │   └── track/
│   │       └── [slug]/route.ts          # Lead submission endpoint
│   ├── dashboard/
│   │   └── page.tsx                     # Protected dashboard
│   ├── t/
│   │   ├── [slug]/
│   │   │   └── page.tsx                # Public lead form
│   │   └── not-found.tsx                # 404 page
│   ├── layout.tsx                       # Root layout with nav
│   └── page.tsx                         # Home page
├── components/
│   └── AuthButton.tsx                   # Login/logout button
├── lib/
│   ├── supabaseClient.ts                # Anon client (browser)
│   ├── supabaseAdmin.ts                 # Service role (server)
│   └── db.ts                            # Database utilities
├── styles/
│   └── globals.css                      # Tailwind CSS
├── supabase/
│   └── sql/
│       └── create_tables.sql            # Database schema
├── .env.local                           # ⚠️ DON'T COMMIT
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

## 🔐 Security

### What's Protected by RLS

- Users can only see their own profiles
- Users can only see their own tracking links
- Users can only see their own leads
- Policies prevent unauthorized access

### What's Public (by design)

- `/t/:slug` — public lead-capture form (no auth required)
- `/api/track/:slug` — public lead submission (no auth required)

### Server-Side Safety

- `/api/track/:slug` uses `SUPABASE_SERVICE_ROLE_KEY` to verify slug and insert leads
- Prevents clients from spoofing `owner_user_id`
- Prevents exposing `target_url` to public

## 📝 Key Features Implemented

### Dashboard Features
- ✅ Auto-create profile on first Google OAuth login
- ✅ Auto-generate default tracking link
- ✅ View all owned tracking links
- ✅ Copy/share tracking link URL
- ✅ Set/update target URL per link
- ✅ View all captured leads grouped by link
- ✅ See lead details: name, phone, submission time
- ✅ Protected (redirects to home if not logged in)

### Public Form
- ✅ No login required
- ✅ Name and phone validation
- ✅ Submission saves lead to database
- ✅ Redirect to user's target URL on success
- ✅ Friendly error pages for 404, no target URL, etc.

### API Routes
- ✅ `/api/auth/callback` — auto-create profile and link on signup
- ✅ `/api/track/[slug]` — handle lead submission and redirect

## 🚨 Common Issues & Fixes

### Issue: "Can't connect to Supabase"
**Solution**: Check `.env.local` has correct URL and keys

### Issue: "Link not found" on public form
**Solution**: Verify slug is correct; check tracking_links table in Supabase

### Issue: "Can't set target URL"
**Solution**: Make sure you're logged in; RLS only allows updating your own links

### Issue: Google OAuth not working
**Solution**: 
- Verify OAuth credentials in Supabase
- Check Google Cloud OAuth redirect URIs include localhost:3000

## 🌐 Deploy to Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit: Lead capture MVP"
git remote add origin https://github.com/yourusername/lead-capture.git
git branch -M main
git push -u origin main
```

### 2. Deploy on Vercel

1. Go to https://vercel.com
2. Click "New Project"
3. Import your GitHub repo
4. Click "Deploy"

### 3. Add Environment Variables

1. In Vercel project settings → **Environment Variables**
2. Add all from `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   NEXT_PUBLIC_APP_URL=https://yourdomain.vercel.app
   NODE_ENV=production
   ```

### 4. Update Supabase OAuth Redirect

1. In Supabase → **Authentication** → **Providers** → **Google**
2. Add your Vercel URL:
   - `https://yourdomain.vercel.app/auth/v1/callback`

## 📊 Database Schema Summary

### profiles
```sql
user_id (uuid) → links to auth.users.id
full_name (text)
email (text)
created_at, updated_at
```

### tracking_links
```sql
id (uuid)
owner_user_id (uuid) → links to auth.users.id
slug (text, unique) → public identifier
target_url (text) → where to redirect after lead submission
is_active (boolean)
is_default (boolean)
created_at, updated_at
```

### leads
```sql
id (uuid)
tracking_link_id (uuid) → links to tracking_links.id
owner_user_id (uuid) → links to auth.users.id
name (text) → visitor's name
phone (text) → visitor's phone
metadata (jsonb) → user_agent, referrer, ip
created_at
```

## 🔄 System Flow

```
User Signs Up (Google OAuth)
    ↓
Supabase creates auth.users row
    ↓
AuthButton detects session
    ↓
Dashboard calls /api/auth/callback
    ↓
Profile and default link auto-created
    ↓
User can set target URL for their link
    ↓
User shares link: https://yourdomain.com/t/:slug
    ↓
Visitor opens link (no auth required)
    ↓
Visitor sees public form (name + phone)
    ↓
Visitor submits form → POST /api/track/:slug
    ↓
Server verifies link, inserts lead, redirects to target_url
    ↓
Owner sees lead in dashboard
```

## 📝 Next Steps (Optional)

Future enhancements (not in MVP):
- [ ] Email notifications on new leads
- [ ] CSV export of leads
- [ ] Multiple tracking links per user
- [ ] Paystack payment integration
- [ ] Analytics dashboard
- [ ] Rate limiting on public endpoint
- [ ] SMS notifications
- [ ] Link expiration/scheduling
- [ ] A/B testing for forms

## 💬 Support

- **Supabase Docs**: https://supabase.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Tailwind CSS**: https://tailwindcss.com/docs

---

**Ready to launch? You're all set!** 🚀
